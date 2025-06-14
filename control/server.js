import { Router } from "express";
import { verifyToken } from "./auth.js";
import axios from "axios";
import Servers from "../model/Servers.js";
import User from "../model/User.js";
import Resources from "../model/resources.js";
import Node from "../model/Node.js";

const router = Router();

// Constants for better maintainability
//const POWER_ACTIONS = ["start", "stop", "restart", "kill"];
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

/**
 * Find egg by ID across all nests
 * @param {number|string} eggId - The egg ID to find
 * @returns {Promise<Object>} - The egg attributes
 * @throws {Error} - If egg is not found
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
        continue; // Continue to next nest
      }
    }

    throw new Error(`Egg with ID ${eggId} not found in any nest`);
  } catch (error) {
    console.error("Error finding egg:", error.message);
    throw new Error("Failed to locate egg configuration");
  }
}

/**
 * Get the first unassigned allocation ID from a node
 * @param {number|string} nodeId - The ID of the node to query
 * @returns {Promise<number>} - The ID of the unassigned allocation
 * @throws {Error} - If no unassigned allocations are found or API fails
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

    console.log(
      `Found unassigned allocation ${unassigned.attributes.id} for node ${nodeId}`
    );
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
 * @param {number|string} serverId - The server ID
 * @returns {Promise<Object|null>} - Server data or null if failed
 */
export async function fetchServerFromPanel(serverId) {
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
 * @param {number|string} serverId - The server ID
 * @returns {Promise<Object|null>} - Resource data or null if failed
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
 * Get server limits from panel
 * @param {number|string} serverId - The server ID
 * @returns {Promise<Object|null>} - Server limits or null if failed
 */
export async function getServerLimits(serverId) {
  const serverData = await fetchServerFromPanel(serverId);
  if (!serverData) return null;

  return {
    memory: serverData.attributes.limits.memory,
    disk: serverData.attributes.limits.disk,
    cpu: serverData.attributes.limits.cpu,
    databases: serverData.attributes.feature_limits.databases,
    allocations: serverData.attributes.feature_limits.allocations,
  };
}

/**
 * Validate resource requirements against available resources
 * @param {Object} required - Required resources
 * @param {Object} available - Available resources
 * @returns {Array<string>} - Array of validation errors
 */
function validateResourceAvailability(required, available) {
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

  return errors;
}

/**
 * Process server data for response
 * @param {Object} dbServer - Database server record
 * @param {Object} serverData - Panel server data
 * @param {Object} resourceData - Resource usage data
 * @returns {Object} - Processed server object
 */
function processServerData(dbServer, serverData, resourceData) {
  return {
    // Database info
    id: dbServer.id,
    owner: dbServer.owner,
    serverId: dbServer.serverId,
    renewal: dbServer.renewal,

    // Panel info (if available)
    panelData: serverData
      ? {
          uuid: serverData.attributes.uuid,
          name: serverData.attributes.name,
          description: serverData.attributes.description,
          status: serverData.attributes.status,
          limits: serverData.attributes.limits,
          feature_limits: serverData.attributes.feature_limits, // This was missing in some responses
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

    // Resource usage (if available)
    resources: resourceData
      ? {
          current_state: resourceData.attributes.current_state,
          is_suspended: resourceData.attributes.is_suspended,
          resources: resourceData.attributes.resources,
        }
      : null,
  };
}

// GET /servers - Fetch all user's servers
router.get("/servers", verifyToken, async (req, res) => {
  try {
    const { resourcesId, pteroId } = req.user;

    if (!pteroId) {
      return res.status(401).json({
        success: false,
        error: "User not authorized for server access",
      });
    }

    // Get servers from database
    const dbServers = await Servers.findAll({
      where: { owner: pteroId },
      order: [["createdAt", "DESC"]], // Most recent first
    });

    if (!dbServers || dbServers.length === 0) {
      return res.json({
        success: true,
        servers: [],
        message: "No servers found",
      });
    }

    // Fetch detailed information from Pterodactyl panel for each server
    const serversWithDetails = await Promise.allSettled(
      dbServers.map(async (dbServer) => {
        const [serverData, resourceData] = await Promise.allSettled([
          fetchServerFromPanel(dbServer.serverId),
          fetchServerResources(dbServer.serverId),
        ]);

        return processServerData(
          dbServer,
          serverData.status === "fulfilled" ? serverData.value : null,
          resourceData.status === "fulfilled" ? resourceData.value : null
        );
      })
    );

    // Process results and separate successful from failed fetches
    const servers = [];
    const errors = [];

    serversWithDetails.forEach((result, index) => {
      if (result.status === "fulfilled") {
        servers.push(result.value);
      } else {
        errors.push({
          serverId: dbServers[index].serverId,
          error: result.reason?.message || "Unknown error",
        });
      }
    });

    return res.json({
      success: true,
      servers,
      pteroId,
      totalServers: servers.length,
      ...(errors.length > 0 && {
        warnings: `Failed to fetch panel data for ${errors.length} server(s)`,
        failedServers: errors,
      }),
    });
  } catch (error) {
    console.error("Error in /servers route:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch servers",
      message: "An internal error occurred while retrieving your servers",
    });
  }
});

// GET /servers/:id - Fetch specific server
router.get("/servers/:id", verifyToken, async (req, res) => {
  try {
    const { resourcesId, pteroId } = req.user;
    const { id: serverId } = req.params;

    if (!pteroId) {
      return res.status(401).json({
        success: false,
        error: "User not authorized for server access",
      });
    }

    // Validate serverId is numeric
    if (!/^\d+$/.test(serverId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid server ID format",
      });
    }

    // Get server from database
    const dbServer = await Servers.findOne({
      where: {
        id: serverId,
        owner: pteroId,
      },
    });

    if (!dbServer) {
      return res.status(404).json({
        success: false,
        error: "Server not found or you don't have permission to access it",
      });
    }

    // Fetch detailed information from Pterodactyl panel
    const [serverData, resourceData] = await Promise.allSettled([
      fetchServerFromPanel(dbServer.serverId),
      fetchServerResources(dbServer.serverId),
    ]);

    const serverDetails = processServerData(
      dbServer,
      serverData.status === "fulfilled" ? serverData.value : null,
      resourceData.status === "fulfilled" ? resourceData.value : null
    );

    return res.json({
      success: true,
      server: serverDetails,
    });
  } catch (error) {
    console.error("Error in /servers/:id route:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch server details",
    });
  }
});

// POST /servers - Create new server
router.post("/servers", verifyToken, async (req, res) => {
  try {
    const { resourcesId, pteroId } = req.user;
    const {
      ram,
      disk,
      cpu,
      allocations = 1,
      databases = 0,
      nodeId,
      eggId,
      name,
      description = "",
    } = req.body;

    console.log("Server creation request:", {
      user: pteroId,
      name,
      ram,
      disk,
      cpu,
      nodeId,
      eggId,
    });

    // Input validation
    if (!name || !ram || !disk || !cpu || !nodeId || !eggId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        required: ["name", "ram", "disk", "cpu", "nodeId", "eggId"],
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

    // Validate name length and characters
    if (name.length < 1 || name.length > 191) {
      return res.status(400).json({
        success: false,
        error: "Server name must be between 1 and 191 characters",
      });
    }

    // Find user's resources
    const resources = await Resources.findByPk(resourcesId);
    if (!resources) {
      return res.status(404).json({
        success: false,
        error: "User resources not found",
      });
    }

    // Validate resource availability
    const required = {
      ram: parseInt(ram),
      disk: parseInt(disk),
      cpu: parseInt(cpu),
      allocations: parseInt(allocations),
      databases: parseInt(databases),
      slots: 1,
    };

    const validationErrors = validateResourceAvailability(required, resources);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Insufficient resources",
        details: validationErrors,
      });
    }

    // Validate node exists and is available
    const nodeExists = await Node.findOne({ where: { nodeId } });
    if (!nodeExists) {
      return res.status(400).json({
        success: false,
        error: "Selected node is not available",
      });
    }

    // Get egg info and allocation concurrently
    const [eggInfo, allocId] = await Promise.all([
      findEggById(eggId),
      getUnassignedAllocation(nodeId),
    ]);

    // Build environment variables from egg configuration
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
      user: parseInt(pteroId),
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

    console.log(
      "Creating server with data:",
      JSON.stringify(serverData, null, 2)
    );

    // Create server via Pterodactyl API
    const pterodactylResponse = await panelAPI.post(
      "/api/application/servers",
      serverData
    );

    const createdServer = pterodactylResponse.data;
    console.log("Server created successfully:", createdServer.attributes.id);

    // Deduct resources after successful server creation
    resources.ram -= required.ram;
    resources.disk -= required.disk;
    resources.cpu -= required.cpu;
    resources.allocations -= required.allocations;
    resources.databases -= required.databases;
    resources.slots -= 1;
    await resources.save();

    // Store server info in database
    const serverRecord = await Servers.create({
      owner: pteroId,
      allocationId: allocId,
      serverId: createdServer.attributes.id,
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
      },
    });
  } catch (error) {
    console.error("Error creating server:", error);

    // Handle specific Pterodactyl API errors
    if (error.response?.status === 422) {
      return res.status(400).json({
        success: false,
        error: "Invalid server configuration",
        details: error.response.data.errors || error.response.data,
      });
    }

    if (error.response?.status === 400) {
      return res.status(400).json({
        success: false,
        error: "Bad request to Pterodactyl panel",
        message: error.response.data?.message || "Invalid request parameters",
      });
    }

    res.status(500).json({
      success: false,
      error: "Internal server error while creating server",
      message:
        "Please try again later or contact support if the issue persists",
    });
  }
});

// PUT /servers/:id - Update server (FIXED)
router.put("/servers/:id", verifyToken, async (req, res) => {
  try {
    const { resourcesId, pteroId } = req.user;
    const { id: serverId } = req.params;
    const { name, description, ram, disk, cpu, databases, allocations } =
      req.body;

    console.log("Server update request:", {
      serverId,
      name,
      description,
      ram,
      disk,
      cpu,
      databases,
      allocations,
    });

    // Validate serverId
    if (!/^\d+$/.test(serverId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid server ID format",
      });
    }

    // Find server in database
    const dbServer = await Servers.findOne({
      where: { id: serverId, owner: pteroId },
    });

    if (!dbServer) {
      return res.status(404).json({
        success: false,
        error: "Server not found or you don't have permission to modify it",
      });
    }

    // Get current server limits
    const currentLimits = await getServerLimits(dbServer.serverId);
    if (!currentLimits) {
      return res.status(500).json({
        success: false,
        error: "Failed to fetch current server configuration",
      });
    }

    console.log("Current server limits:", currentLimits);

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

    console.log("New limits:", newLimits);

    // Calculate resource differences
    const differences = {
      ram: newLimits.memory - currentLimits.memory,
      disk: newLimits.disk - currentLimits.disk,
      cpu: newLimits.cpu - currentLimits.cpu,
      databases: newLimits.databases - currentLimits.databases,
      allocations: newLimits.allocations - currentLimits.allocations,
    };

    console.log("Resource differences:", differences);

    // If resource changes are requested, validate availability
    const hasResourceChanges =
      ram !== undefined ||
      disk !== undefined ||
      cpu !== undefined ||
      databases !== undefined ||
      allocations !== undefined;

    if (hasResourceChanges) {
      const resources = await Resources.findByPk(resourcesId);
      if (!resources) {
        return res.status(404).json({
          success: false,
          error: "User resources not found",
        });
      }

      // Only validate increases (positive differences)
      const required = {
        ram: Math.max(0, differences.ram),
        disk: Math.max(0, differences.disk),
        cpu: Math.max(0, differences.cpu),
        databases: Math.max(0, differences.databases),
        allocations: Math.max(0, differences.allocations),
        slots: 0,
      };

      console.log("Required additional resources:", required);

      const validationErrors = validateResourceAvailability(
        required,
        resources
      );
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Insufficient resources for upgrade",
          details: validationErrors,
        });
      }

      // Update user resources (subtract the differences)
      resources.ram -= differences.ram;
      resources.disk -= differences.disk;
      resources.cpu -= differences.cpu;
      resources.databases -= differences.databases;
      resources.allocations -= differences.allocations;
      await resources.save();

      console.log("Updated user resources");
    }

    // Prepare update requests
    const updatePromises = [];

    // Update build configuration (limits)
    if (
      ram !== undefined ||
      disk !== undefined ||
      cpu !== undefined ||
      databases !== undefined ||
      allocations !== undefined
    ) {
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

      console.log(
        "Sending build update:",
        JSON.stringify(buildUpdate, null, 2)
      );

      updatePromises.push(
        panelAPI.patch(
          `/api/application/servers/${dbServer.serverId}/build`,
          buildUpdate
        )
      );
    }

    // Update details (name/description)
    if (name !== undefined || description !== undefined) {
      // Validate name if provided
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

      console.log("Sending details update:", detailsUpdate);

      updatePromises.push(
        panelAPI.patch(
          `/api/application/servers/${dbServer.serverId}/details`,
          detailsUpdate
        )
      );
    }

    // Execute all updates
    if (updatePromises.length > 0) {
      const results = await Promise.allSettled(updatePromises);

      // Check for any failures
      const failures = results.filter((result) => result.status === "rejected");
      if (failures.length > 0) {
        console.error("Update failures:", failures);
        // If we updated resources but API failed, we need to rollback
        if (hasResourceChanges) {
          const resources = await Resources.findByPk(resourcesId);
          if (resources) {
            resources.ram += differences.ram;
            resources.disk += differences.disk;
            resources.cpu += differences.cpu;
            resources.databases += differences.databases;
            resources.allocations += differences.allocations;
            await resources.save();
            console.log("Rolled back resource changes due to API failure");
          }
        }

        throw failures[0].reason;
      }
    }

    console.log("Server updated successfully");

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

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: "Server not found in panel",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to update server",
      message: error.message || "An internal error occurred",
    });
  }
});

// DELETE /servers/:id - Delete server
router.delete("/servers/:id", verifyToken, async (req, res) => {
  try {
    const { resourcesId, pteroId } = req.user;
    const { id: serverId } = req.params;

    // Validate serverId
    if (!/^\d+$/.test(serverId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid server ID format",
      });
    }

    // Find server in database
    const dbServer = await Servers.findOne({
      where: { id: serverId, owner: pteroId },
    });

    if (!dbServer) {
      return res.status(404).json({
        success: false,
        error: "Server not found or you don't have permission to delete it",
      });
    }

    // Get current server limits to restore resources
    const currentLimits = await getServerLimits(dbServer.serverId);

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
        throw error; // Re-throw if it's not a 404
      }
    }

    // Restore resources to user if we successfully got the limits
    if (currentLimits && resourcesId) {
      const resources = await Resources.findByPk(resourcesId);
      if (resources) {
        resources.ram += currentLimits.memory;
        resources.disk += currentLimits.disk;
        resources.cpu += currentLimits.cpu;
        resources.databases += currentLimits.databases;
        resources.allocations += currentLimits.allocations;
        resources.slots += 1;
        await resources.save();
        console.log(`Resources restored for user ${pteroId}`);
      }
    }

    // Remove server from database
    await dbServer.destroy();

    res.json({
      success: true,
      message: "Server deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting server:", error);

    // If there was an error but the server doesn't exist on panel, clean up database
    if (error.response?.status === 404) {
      await Servers.destroy({
        where: { id: serverId, owner: pteroId },
      });

      return res.json({
        success: true,
        message: "Server deleted successfully (was already removed from panel)",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to delete server",
    });
  }
});

// POST /servers/:id/power - Control server power state

export default router;
