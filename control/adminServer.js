import { Router } from "express";
import { verifyToken } from "./auth.js";
import axios from "axios";
import Servers from "../model/Servers.js";
import User from "../model/User.js";
import Resources from "../model/resources.js";
import Node from "../model/Node.js";
import { Op } from "sequelize";

const router = Router();

// Constants
const POWER_ACTIONS = ["start", "stop", "restart", "kill"];
const DEFAULT_LIMITS = {
  swap: 0,
  io: 500,
  backups: 0,
};

// Create axios instance with default config
const panelAPI = axios.create({
  baseURL: process.env.panel_url,
  headers: {
    Authorization: `Bearer ${process.env.panel_key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30000, // 30 second timeout
});

// Add request/response interceptors for better error handling
panelAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Pterodactyl API Error:", {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
    });
    return Promise.reject(error);
  }
);

// Middleware to verify admin access
const verifyAdmin = (req, res, next) => {
  if (!req.user.root_admin) {
    return res.status(403).json({
      success: false,
      error: "Access denied: Administrator privileges required",
    });
  }
  next();
};

/**
 * Find egg by ID across all nests
 */
async function findEggById(eggId) {
  try {
    const nests = await panelAPI.get("/api/application/nests");

    for (const nest of nests.data.data) {
      const nestId = nest.attributes.id;

      try {
        const eggs = await panelAPI.get(
          `/api/application/nests/${nestId}/eggs?include=variables`
        );

        const match = eggs.data.data.find((e) => e.attributes.id == eggId);
        if (match) {
          console.log(`Found egg ${eggId} in nest ${nestId}`);
          return match.attributes;
        }
      } catch (error) {
        console.warn(`Failed to fetch eggs for nest ${nestId}:`, error.message);
        continue;
      }
    }

    throw new Error(`Egg with ID ${eggId} not found in any nest`);
  } catch (error) {
    console.error("Error finding egg:", error.message);
    throw new Error("Failed to locate egg configuration");
  }
}

/**
 * Get unassigned allocation
 */
async function getUnassignedAllocation(nodeId) {
  try {
    const response = await panelAPI.get(
      `/api/application/nodes/${nodeId}/allocations`
    );

    const allocations = response.data.data;
    const unassigned = allocations.find(
      (alloc) => alloc.attributes.assigned === false
    );

    if (!unassigned) {
      throw new Error(`No unassigned allocations available for node ${nodeId}`);
    }

    return unassigned.attributes.id;
  } catch (error) {
    console.error(
      `Failed to get unassigned allocation for node ${nodeId}:`,
      error.message
    );
    throw new Error("Could not retrieve allocation");
  }
}

/**
 * Fetch server details from Pterodactyl panel
 */
async function fetchServerFromPanel(serverId) {
  try {
    const response = await panelAPI.get(
      `/api/application/servers/${serverId}?include=allocations,variables`
    );
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.warn(`Server ${serverId} not found in panel`);
    } else {
      console.error(
        `Error fetching server ${serverId} from panel:`,
        error.message
      );
    }
    return null;
  }
}

/**
 * Fetch server resource usage
 */
async function fetchServerResources(serverId) {
  try {
    const response = await panelAPI.get(
      `/api/client/servers/${serverId}/resources`
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching server ${serverId} resources:`,
      error.message
    );
    return null;
  }
}

/**
 * Process server data for admin response
 */
function processAdminServerData(dbServer, serverData, resourceData, userData) {
  return {
    // Database info
    id: dbServer.id,
    owner: dbServer.owner,
    serverId: dbServer.serverId,
    renewDate: dbServer.renewDate, // Fixed: was 'renewal', should be 'renewDate'
    createdAt: dbServer.createdAt,
    updatedAt: dbServer.updatedAt,

    // User info
    user: userData
      ? {
          id: userData.id,
          email: userData.email,
          username: userData.username,
          resourcesId: userData.resourcesId,
        }
      : null,

    // Panel info
    panelData: serverData
      ? {
          uuid: serverData.attributes.uuid,
          name: serverData.attributes.name,
          description: serverData.attributes.description,
          status: serverData.attributes.status,
          limits: serverData.attributes.limits,
          feature_limits: serverData.attributes.feature_limits,
          node: serverData.attributes.node,
          relationships: {
            allocations:
              serverData.attributes.relationships?.allocations?.data || [],
            variables:
              serverData.attributes.relationships?.variables?.data || [],
          },
          created_at: serverData.attributes.created_at,
          updated_at: serverData.attributes.updated_at,
        }
      : null,

    // Resource usage
    resources: resourceData
      ? {
          current_state: resourceData.attributes.current_state,
          is_suspended: resourceData.attributes.is_suspended,
          resources: resourceData.attributes.resources,
        }
      : null,
  };
}

// GET /admin/servers - Get all servers with pagination and filtering
router.get("/admin/servers", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      userId,
      nodeId,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};
    const includeClause = [
      {
        model: User,
        as: "userInfo",
        attributes: ["id", "email", "username", "resourcesId"],
        required: false, // LEFT JOIN to include servers even if user doesn't exist
      },
    ];

    // Apply filters
    if (userId) {
      whereClause.owner = userId;
    }

    if (search) {
      // Search in server names via panel API would be complex
      // For now, search by server ID or user email
      if (/^\d+$/.test(search)) {
        whereClause.serverId = search;
      } else {
        includeClause[0].where = {
          email: { [Op.iLike]: `%${search}%` },
        };
      }
    }

    // Get servers from database with pagination
    const { count, rows: dbServers } = await Servers.findAndCountAll({
      where: whereClause,
      include: includeClause,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    // Fetch detailed information from Pterodactyl panel
    const serversWithDetails = await Promise.allSettled(
      dbServers.map(async (dbServer) => {
        const [serverData, resourceData] = await Promise.allSettled([
          fetchServerFromPanel(dbServer.serverId),
          fetchServerResources(dbServer.serverId),
        ]);

        return processAdminServerData(
          dbServer,
          serverData.status === "fulfilled" ? serverData.value : null,
          resourceData.status === "fulfilled" ? resourceData.value : null,
          dbServer.userInfo
        );
      })
    );

    // Process results
    const servers = [];
    const errors = [];

    serversWithDetails.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const server = result.value;

        // Apply panel-based filters
        if (status && server.panelData?.status !== status) {
          return;
        }
        if (nodeId && server.panelData?.node !== parseInt(nodeId)) {
          return;
        }

        servers.push(server);
      } else {
        errors.push({
          serverId: dbServers[index].serverId,
          error: result.reason?.message || "Unknown error",
        });
      }
    });

    res.json({
      success: true,
      servers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit)),
      },
      ...(errors.length > 0 && {
        warnings: `Failed to fetch panel data for ${errors.length} server(s)`,
        failedServers: errors,
      }),
    });
  } catch (error) {
    console.error("Error in admin servers route:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch servers",
    });
  }
});

// GET /admin/servers/:id - Get specific server details
router.get("/admin/servers/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id: serverId } = req.params;

    if (!/^\d+$/.test(serverId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid server ID format",
      });
    }

    const dbServer = await Servers.findOne({
      where: { id: serverId },
      include: [
        {
          model: User,
          as: "userInfo",
          attributes: ["id", "email", "username", "resourcesId"],
          required: false, // LEFT JOIN
          include: [
            {
              model: Resources,
              as: "resources",
              attributes: [
                "ram",
                "disk",
                "cpu",
                "databases",
                "allocations",
                "slots",
              ],
              required: false, // LEFT JOIN
            },
          ],
        },
      ],
    });

    if (!dbServer) {
      return res.status(404).json({
        success: false,
        error: "Server not found",
      });
    }

    // Fetch detailed information from Pterodactyl panel
    const [serverData, resourceData] = await Promise.allSettled([
      fetchServerFromPanel(dbServer.serverId),
      fetchServerResources(dbServer.serverId),
    ]);

    const serverDetails = processAdminServerData(
      dbServer,
      serverData.status === "fulfilled" ? serverData.value : null,
      resourceData.status === "fulfilled" ? resourceData.value : null,
      dbServer.userInfo
    );

    // Add user resources info
    if (dbServer.userInfo?.resources) {
      serverDetails.user.resources = dbServer.userInfo.resources;
    }

    res.json({
      success: true,
      server: serverDetails,
    });
  } catch (error) {
    console.error("Error in admin server details route:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch server details",
    });
  }
});

// POST /admin/servers - Create server for any user
router.post("/admin/servers", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const {
      userId,
      ram,
      disk,
      cpu,
      allocations = 1,
      databases = 0,
      nodeId,
      eggId,
      name,
      description = "",
      skipResourceCheck = false,
    } = req.body;

    console.log("Admin server creation request:", {
      admin: req.user.email,
      userId,
      name,
      ram,
      disk,
      cpu,
      nodeId,
      eggId,
      skipResourceCheck,
    });

    // Input validation
    if (!userId || !name || !ram || !disk || !cpu || !nodeId || !eggId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        required: ["userId", "name", "ram", "disk", "cpu", "nodeId", "eggId"],
      });
    }

    // Validate user exists
    const targetUser = await User.findByPk(userId, {
      include: [
        {
          model: Resources,
          as: "resources",
          required: false, // LEFT JOIN
        },
      ],
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: "Target user not found",
      });
    }

    if (!targetUser.pteroId) {
      return res.status(400).json({
        success: false,
        error: "Target user does not have Pterodactyl access",
      });
    }

    // Validate numeric inputs
    const numericFields = { ram, disk, cpu };
    for (const [field, value] of Object.entries(numericFields)) {
      if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
        return res.status(400).json({
          success: false,
          error: `${field} must be a positive integer`,
        });
      }
    }

    // Check resource availability (unless skipped)
    if (!skipResourceCheck && targetUser.resources) {
      const required = {
        ram: parseInt(ram),
        disk: parseInt(disk),
        cpu: parseInt(cpu),
        allocations: parseInt(allocations),
        databases: parseInt(databases),
        slots: 1,
      };

      const available = targetUser.resources;
      const errors = [];

      if (required.ram > available.ram) {
        errors.push(
          `Insufficient RAM (need ${required.ram}MB, have ${available.ram}MB)`
        );
      }
      if (required.disk > available.disk) {
        errors.push(
          `Insufficient disk space (need ${required.disk}MB, have ${available.disk}MB)`
        );
      }
      if (required.cpu > available.cpu) {
        errors.push(
          `Insufficient CPU (need ${required.cpu}%, have ${available.cpu}%)`
        );
      }
      if (required.allocations > available.allocations) {
        errors.push(
          `Insufficient allocations (need ${required.allocations}, have ${available.allocations})`
        );
      }
      if (required.databases > available.databases) {
        errors.push(
          `Insufficient databases (need ${required.databases}, have ${available.databases})`
        );
      }
      if (required.slots > available.slots) {
        errors.push(
          `Insufficient server slots (need ${required.slots}, have ${available.slots})`
        );
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Insufficient resources",
          details: errors,
          note: "Use skipResourceCheck=true to override resource limits",
        });
      }
    }

    // Validate node exists
    const nodeExists = await Node.findOne({ where: { nodeId } });
    if (!nodeExists) {
      return res.status(400).json({
        success: false,
        error: "Selected node is not available",
      });
    }

    // Get egg info and allocation
    const [eggInfo, allocId] = await Promise.all([
      findEggById(eggId),
      getUnassignedAllocation(nodeId),
    ]);

    // Build environment variables
    const environment = {};
    if (eggInfo.relationships?.variables?.data) {
      eggInfo.relationships.variables.data.forEach((variable) => {
        const attr = variable.attributes;
        environment[attr.env_variable] = attr.default_value || "";
      });
    }

    // Prepare server creation data
    const serverData = {
      name: name.trim(),
      description: description.trim(),
      user: parseInt(targetUser.pteroId),
      egg: parseInt(eggId),
      docker_image: eggInfo.docker_image,
      startup: eggInfo.startup,
      environment,
      limits: {
        memory: parseInt(ram),
        swap: DEFAULT_LIMITS.swap,
        disk: parseInt(disk),
        io: DEFAULT_LIMITS.io,
        cpu: parseInt(cpu),
      },
      feature_limits: {
        databases: parseInt(databases),
        allocations: parseInt(allocations),
        backups: DEFAULT_LIMITS.backups,
      },
      allocation: {
        default: parseInt(allocId),
      },
    };

    // Create server via Pterodactyl API
    const pterodactylResponse = await panelAPI.post(
      "/api/application/servers",
      serverData
    );

    const createdServer = pterodactylResponse.data;

    // Deduct resources if not skipped and user has resources
    if (!skipResourceCheck && targetUser.resources) {
      const resources = targetUser.resources;
      resources.ram -= parseInt(ram);
      resources.disk -= parseInt(disk);
      resources.cpu -= parseInt(cpu);
      resources.allocations -= parseInt(allocations);
      resources.databases -= parseInt(databases);
      resources.slots -= 1;
      await resources.save();
    }

    // Store server info in database
    const serverRecord = await Servers.create({
      owner: targetUser.pteroId,
      allocationId: allocId,
      serverId: createdServer.attributes.id,
      renewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    });

    res.status(201).json({
      success: true,
      message: "Server created successfully",
      server: {
        id: serverRecord.id,
        pterodactylId: createdServer.attributes.id,
        name: createdServer.attributes.name,
        identifier: createdServer.attributes.identifier,
        uuid: createdServer.attributes.uuid,
        status: createdServer.attributes.status,
        owner: {
          id: targetUser.id,
          email: targetUser.email,
          username: targetUser.username,
        },
      },
    });
  } catch (error) {
    console.error("Error creating server:", error);

    if (error.response?.status === 422) {
      return res.status(400).json({
        success: false,
        error: "Invalid server configuration",
        details: error.response.data.errors || error.response.data,
      });
    }

    res.status(500).json({
      success: false,
      error: "Internal server error while creating server",
    });
  }
});

// PUT /admin/servers/:id - Update any server
router.put("/admin/servers/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id: serverId } = req.params;
    const {
      name,
      description,
      ram,
      disk,
      cpu,
      databases,
      allocations,
      skipResourceCheck = false,
    } = req.body;

    console.log("Admin server update request:", {
      admin: req.user.email,
      serverId,
      name,
      description,
      ram,
      disk,
      cpu,
      databases,
      allocations,
      skipResourceCheck,
    });

    if (!/^\d+$/.test(serverId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid server ID format",
      });
    }

    // Find server in database
    const dbServer = await Servers.findOne({
      where: { id: serverId },
      include: [
        {
          model: User,
          as: "userInfo",
          required: false, // LEFT JOIN
          include: [
            {
              model: Resources,
              as: "resources",
              required: false, // LEFT JOIN
            },
          ],
        },
      ],
    });

    if (!dbServer) {
      return res.status(404).json({
        success: false,
        error: "Server not found",
      });
    }

    // Get current server limits
    const currentServerData = await fetchServerFromPanel(dbServer.serverId);
    if (!currentServerData) {
      return res.status(500).json({
        success: false,
        error: "Failed to fetch current server configuration",
      });
    }

    const currentLimits = {
      memory: currentServerData.attributes.limits.memory,
      disk: currentServerData.attributes.limits.disk,
      cpu: currentServerData.attributes.limits.cpu,
      databases: currentServerData.attributes.feature_limits.databases,
      allocations: currentServerData.attributes.feature_limits.allocations,
    };

    // Validate numeric inputs if provided
    const numericFields = { ram, disk, cpu, databases, allocations };
    for (const [field, value] of Object.entries(numericFields)) {
      if (
        value !== undefined &&
        (!Number.isInteger(Number(value)) || Number(value) < 0)
      ) {
        return res.status(400).json({
          success: false,
          error: `${field} must be a non-negative integer`,
        });
      }
    }

    // Calculate new limits
    const newLimits = {
      memory: ram !== undefined ? parseInt(ram) : currentLimits.memory,
      disk: disk !== undefined ? parseInt(disk) : currentLimits.disk,
      cpu: cpu !== undefined ? parseInt(cpu) : currentLimits.cpu,
      databases:
        databases !== undefined ? parseInt(databases) : currentLimits.databases,
      allocations:
        allocations !== undefined
          ? parseInt(allocations)
          : currentLimits.allocations,
    };

    // Calculate resource differences
    const differences = {
      ram: newLimits.memory - currentLimits.memory,
      disk: newLimits.disk - currentLimits.disk,
      cpu: newLimits.cpu - currentLimits.cpu,
      databases: newLimits.databases - currentLimits.databases,
      allocations: newLimits.allocations - currentLimits.allocations,
    };

    const hasResourceChanges =
      ram !== undefined ||
      disk !== undefined ||
      cpu !== undefined ||
      databases !== undefined ||
      allocations !== undefined;

    // Check resource availability if not skipped
    if (
      hasResourceChanges &&
      !skipResourceCheck &&
      dbServer.userInfo?.resources
    ) {
      const resources = dbServer.userInfo.resources;
      const required = {
        ram: Math.max(0, differences.ram),
        disk: Math.max(0, differences.disk),
        cpu: Math.max(0, differences.cpu),
        databases: Math.max(0, differences.databases),
        allocations: Math.max(0, differences.allocations),
      };

      const errors = [];
      if (required.ram > resources.ram) {
        errors.push(
          `Insufficient RAM (need ${required.ram}MB, have ${resources.ram}MB)`
        );
      }
      if (required.disk > resources.disk) {
        errors.push(
          `Insufficient disk space (need ${required.disk}MB, have ${resources.disk}MB)`
        );
      }
      if (required.cpu > resources.cpu) {
        errors.push(
          `Insufficient CPU (need ${required.cpu}%, have ${resources.cpu}%)`
        );
      }
      if (required.databases > resources.databases) {
        errors.push(
          `Insufficient databases (need ${required.databases}, have ${resources.databases})`
        );
      }
      if (required.allocations > resources.allocations) {
        errors.push(
          `Insufficient allocations (need ${required.allocations}, have ${resources.allocations})`
        );
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Insufficient resources for upgrade",
          details: errors,
          note: "Use skipResourceCheck=true to override resource limits",
        });
      }

      // Update user resources
      resources.ram -= differences.ram;
      resources.disk -= differences.disk;
      resources.cpu -= differences.cpu;
      resources.databases -= differences.databases;
      resources.allocations -= differences.allocations;
      await resources.save();
    }

    // Prepare update requests
    const updatePromises = [];

    // Update build configuration
    if (hasResourceChanges) {
      const buildUpdate = {
        allocation: dbServer.allocationId,
        limits: {
          memory: newLimits.memory,
          swap: DEFAULT_LIMITS.swap,
          disk: newLimits.disk,
          io: DEFAULT_LIMITS.io,
          cpu: newLimits.cpu,
        },
        feature_limits: {
          databases: newLimits.databases,
          allocations: newLimits.allocations,
          backups: DEFAULT_LIMITS.backups,
        },
      };

      updatePromises.push(
        panelAPI.patch(
          `/api/application/servers/${dbServer.serverId}/build`,
          buildUpdate
        )
      );
    }

    // Update details
    if (name !== undefined || description !== undefined) {
      if (name !== undefined && (name.length < 1 || name.length > 191)) {
        return res.status(400).json({
          success: false,
          error: "Server name must be between 1 and 191 characters",
        });
      }

      const detailsUpdate = {};
      if (name !== undefined) detailsUpdate.name = name.trim();
      if (description !== undefined)
        detailsUpdate.description = description.trim();

      updatePromises.push(
        panelAPI.patch(
          `/api/application/servers/${dbServer.serverId}/details`,
          detailsUpdate
        )
      );
    }

    // Execute updates
    if (updatePromises.length > 0) {
      const results = await Promise.allSettled(updatePromises);
      const failures = results.filter((result) => result.status === "rejected");

      if (failures.length > 0) {
        console.error("Update failures:", failures);

        // Rollback resource changes if needed
        if (
          hasResourceChanges &&
          !skipResourceCheck &&
          dbServer.userInfo?.resources
        ) {
          const resources = dbServer.userInfo.resources;
          resources.ram += differences.ram;
          resources.disk += differences.disk;
          resources.cpu += differences.cpu;
          resources.databases += differences.databases;
          resources.allocations += differences.allocations;
          await resources.save();
        }

        throw failures[0].reason;
      }
    }

    res.json({
      success: true,
      message: "Server updated successfully",
    });
  } catch (error) {
    console.error("Error updating server:", error);

    if (error.response?.status === 422) {
      return res.status(400).json({
        success: false,
        error: "Invalid server configuration",
        details: error.response.data.errors || error.response.data,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to update server",
    });
  }
});

// DELETE /admin/servers/:id - Delete any server
router.delete(
  "/admin/servers/:id",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const { id: serverId } = req.params;
      const { restoreResources = true } = req.body;

      if (!/^\d+$/.test(serverId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid server ID format",
        });
      }

      // Find server in database
      const dbServer = await Servers.findOne({
        where: { id: serverId },
        include: [
          {
            model: User,
            as: "userInfo",
            required: false, // LEFT JOIN
            include: [
              {
                model: Resources,
                as: "resources",
                required: false, // LEFT JOIN
              },
            ],
          },
        ],
      });

      if (!dbServer) {
        return res.status(404).json({
          success: false,
          error: "Server not found",
        });
      }

      // Get current server limits to restore resources
      const currentServerData = await fetchServerFromPanel(dbServer.serverId);
      let currentLimits = null;

      if (currentServerData) {
        currentLimits = {
          memory: currentServerData.attributes.limits.memory,
          disk: currentServerData.attributes.limits.disk,
          cpu: currentServerData.attributes.limits.cpu,
          databases: currentServerData.attributes.feature_limits.databases,
          allocations: currentServerData.attributes.feature_limits.allocations,
        };
      }

      try {
        // Delete server from Pterodactyl panel
        await panelAPI.delete(`/api/application/servers/${dbServer.serverId}`);
        console.log(`Server ${dbServer.serverId} deleted from panel`);
      } catch (error) {
        if (error.response?.status === 404) {
          console.warn(
            `Server ${dbServer.serverId} was already deleted from panel`
          );
        } else {
          throw error;
        }
      }

      // Restore resources if requested and possible
      if (restoreResources && currentLimits && dbServer.userInfo?.resources) {
        const resources = dbServer.userInfo.resources;
        resources.ram += currentLimits.memory;
        resources.disk += currentLimits.disk;
        resources.cpu += currentLimits.cpu;
        resources.databases += currentLimits.databases;
        resources.allocations += currentLimits.allocations;
        resources.slots += 1;
        await resources.save();
        console.log(`Resources restored for user ${dbServer.userInfo.email}`);
      }

      // Remove server from database
      await dbServer.destroy();

      res.json({
        success: true,
        message: "Server deleted successfully",
        restoredResources:
          restoreResources && currentLimits && dbServer.userInfo?.resources,
      });
    } catch (error) {
      console.error("Error deleting server:", error);

      if (error.response?.status === 404) {
        // If server doesn't exist in panel, still remove from database
        await Servers.destroy({ where: { id: serverId } });
        return res.json({
          success: true,
          message:
            "Server deleted successfully (was already removed from panel)",
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to delete server",
      });
    }
  }
);

export default router;
