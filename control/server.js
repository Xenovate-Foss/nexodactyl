import { Router } from "express";
import { verifyToken } from "./auth.js";
import axios from "axios";
import Servers from "../model/Servers.js";
import User from "../model/User.js";
import Resources from "../model/resources.js";
import Node from "../model/Node.js"; // Added missing import

const router = Router();

// Helper function to fetch server details from Pterodactyl panel
async function fetchServerFromPanel(serverId) {
  try {
    const response = await axios.get(
      `${process.env.panel_url}/api/application/servers/${serverId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.panel_key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching server ${serverId} from panel:`,
      error.response?.data || error.message
    );
    return null;
  }
}

// Helper function to fetch server resource usage
async function fetchServerResources(serverId) {
  try {
    const response = await axios.get(
      `${process.env.panel_url}/api/client/servers/${serverId}/resources`,
      {
        headers: {
          Authorization: `Bearer ${process.env.panel_key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching server ${serverId} resources:`,
      error.response?.data || error.message
    );
    return null;
  }
}

// Helper function to get server limits from panel
async function getServerLimits(serverId) {
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

// GET /servers - Fetch all user's servers
router.get("/servers", verifyToken, async (req, res) => {
  try {
    const { resourcesId, pteroId } = req.user;
    if (!pteroId) return res.json({ success: false, error: "unauthorized" });

    // Get servers from database
    const dbServers = await Servers.findAll({
      where: {
        owner: pteroId,
      },
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
        const serverData = await fetchServerFromPanel(dbServer.serverId);
        const resourceData = await fetchServerResources(dbServer.serverId);

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
                limits: {
                  memory: serverData.attributes.limits.memory,
                  swap: serverData.attributes.limits.swap,
                  disk: serverData.attributes.limits.disk,
                  io: serverData.attributes.limits.io,
                  cpu: serverData.attributes.limits.cpu,
                  threads: serverData.attributes.limits.threads,
                  oom_disabled: serverData.attributes.limits.oom_disabled,
                },
                feature_limits: {
                  databases: serverData.attributes.feature_limits.databases,
                  allocations: serverData.attributes.feature_limits.allocations,
                  backups: serverData.attributes.feature_limits.backups,
                },
                relationships: {
                  allocations:
                    serverData.attributes.relationships?.allocations?.data ||
                    [],
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
                resources: {
                  memory_bytes: resourceData.attributes.resources.memory_bytes,
                  cpu_absolute: resourceData.attributes.resources.cpu_absolute,
                  disk_bytes: resourceData.attributes.resources.disk_bytes,
                  network_rx_bytes:
                    resourceData.attributes.resources.network_rx_bytes,
                  network_tx_bytes:
                    resourceData.attributes.resources.network_tx_bytes,
                  uptime: resourceData.attributes.resources.uptime,
                },
              }
            : null,
        };
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
      ...(errors.length > 0 && {
        warnings: `Failed to fetch panel data for ${errors.length} server(s)`,
        failedServers: errors,
      }),
    });
  } catch (error) {
    console.error(
      "Error in /servers route:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      error: "Failed to fetch servers",
    });
  }
});

// GET /servers/:id - Fetch specific server
router.get("/servers/:id", verifyToken, async (req, res) => {
  try {
    const { resourcesId, pteroId } = req.user;
    const { id: serverId } = req.params;

    if (!pteroId) return res.json({ success: false, error: "unauthorized" });

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
    const serverData = await fetchServerFromPanel(dbServer.serverId);
    const resourceData = await fetchServerResources(dbServer.serverId);

    const serverDetails = {
      // Database info
      id: dbServer.id,
      owner: dbServer.owner,
      serverId: dbServer.serverId,
      renewal: dbServer.renewal,

      // Panel info
      panelData: serverData
        ? {
            uuid: serverData.attributes.uuid,
            name: serverData.attributes.name,
            description: serverData.attributes.description,
            status: serverData.attributes.status,
            limits: serverData.attributes.limits,
            feature_limits: serverData.attributes.feature_limits,
            relationships: serverData.attributes.relationships,
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
      node,
      egg,
      name,
      description = "",
    } = req.body;

    // Input validation
    if (!name || !ram || !disk || !cpu || !node || !egg) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, ram, disk, cpu, node, egg",
      });
    }

    // Validate numeric inputs
    if (
      ram <= 0 ||
      disk <= 0 ||
      cpu <= 0 ||
      allocations <= 0 ||
      databases < 0
    ) {
      return res.status(400).json({
        success: false,
        error: "Resource values must be positive numbers",
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
    const validationErrors = [];
    if (ram > resources.ram)
      validationErrors.push("Insufficient RAM available");
    if (disk > resources.disk)
      validationErrors.push("Insufficient disk space available");
    if (cpu > resources.cpu)
      validationErrors.push("Insufficient CPU allocation available");
    if (allocations > resources.allocations)
      validationErrors.push("Insufficient port allocations available");
    if (databases > resources.databases)
      validationErrors.push("Insufficient database slots available");

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: validationErrors.join(", "),
      });
    }

    // Validate node exists and is available
    const nodeExists = await Node.findByPk(node);
    if (!nodeExists || !nodeExists.active) {
      return res.status(400).json({
        success: false,
        error: "Selected node is not available",
      });
    }

    // Get egg info from Pterodactyl API
    const eggResponse = await axios.get(
      `${process.env.panel_url}/api/application/eggs/${egg}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.panel_key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const eggInfo = eggResponse.data.attributes;

    // Prepare server creation data
    const serverData = {
      name: name.trim(),
      description: description.trim(),
      user: pteroId,
      egg: parseInt(egg),
      docker_image: eggInfo.docker_image,
      startup: eggInfo.startup,
      environment:
        eggInfo.relationships?.variables?.data.reduce((env, variable) => {
          env[variable.attributes.env_variable] =
            variable.attributes.default_value || "";
          return env;
        }, {}) || {},
      limits: {
        memory: parseInt(ram),
        swap: 0,
        disk: parseInt(disk),
        io: 500,
        cpu: parseInt(cpu),
      },
      feature_limits: {
        databases: parseInt(databases),
        allocations: parseInt(allocations),
        backups: 0,
      },
      allocation: {
        default: parseInt(node),
      },
    };

    // Create server via Pterodactyl API
    const pterodactylResponse = await axios.post(
      `${process.env.panel_url}/api/application/servers`,
      serverData,
      {
        headers: {
          Authorization: `Bearer ${process.env.panel_key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const createdServer = pterodactylResponse.data;

    // Deduct resources after successful server creation
    resources.ram -= ram;
    resources.disk -= disk;
    resources.cpu -= cpu;
    resources.allocations -= allocations;
    resources.databases -= databases;
    await resources.save();

    // Store server info in database
    const serverRecord = await Servers.create({
      owner: pteroId,
      serverId: createdServer.attributes.id,
    });

    res.status(201).json({
      success: true,
      message: "Server created successfully",
      server: {
        id: serverRecord.id,
        pterodactylId: createdServer.attributes.id,
        name: name,
        identifier: createdServer.attributes.identifier,
        uuid: createdServer.attributes.uuid,
      },
    });
  } catch (error) {
    console.error("Error creating server:", error);

    // Handle Pterodactyl API errors specifically
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

// PUT /servers/:id - Update server
router.put("/servers/:id", verifyToken, async (req, res) => {
  try {
    const { resourcesId, pteroId } = req.user;
    const { id: serverId } = req.params;
    const { name, description, ram, disk, cpu, databases, allocations } =
      req.body;

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

    // If resource changes are requested, validate availability
    if (
      ram ||
      disk ||
      cpu ||
      databases !== undefined ||
      allocations !== undefined
    ) {
      const resources = await Resources.findByPk(resourcesId);
      if (!resources) {
        return res.status(404).json({
          success: false,
          error: "User resources not found",
        });
      }

      // Calculate resource differences
      const ramDiff = (ram || currentLimits.memory) - currentLimits.memory;
      const diskDiff = (disk || currentLimits.disk) - currentLimits.disk;
      const cpuDiff = (cpu || currentLimits.cpu) - currentLimits.cpu;
      const dbDiff =
        (databases !== undefined ? databases : currentLimits.databases) -
        currentLimits.databases;
      const allocDiff =
        (allocations !== undefined ? allocations : currentLimits.allocations) -
        currentLimits.allocations;

      // Validate resource availability for increases
      const validationErrors = [];
      if (ramDiff > 0 && ramDiff > resources.ram)
        validationErrors.push("Insufficient RAM available");
      if (diskDiff > 0 && diskDiff > resources.disk)
        validationErrors.push("Insufficient disk space available");
      if (cpuDiff > 0 && cpuDiff > resources.cpu)
        validationErrors.push("Insufficient CPU allocation available");
      if (allocDiff > 0 && allocDiff > resources.allocations)
        validationErrors.push("Insufficient port allocations available");
      if (dbDiff > 0 && dbDiff > resources.databases)
        validationErrors.push("Insufficient database slots available");

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: validationErrors.join(", "),
        });
      }
    }

    // Prepare update data for Pterodactyl
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();

    if (ram || disk || cpu) {
      updateData.limits = {
        memory: ram || currentLimits.memory,
        swap: 0,
        disk: disk || currentLimits.disk,
        io: 500,
        cpu: cpu || currentLimits.cpu,
      };
    }

    if (databases !== undefined || allocations !== undefined) {
      updateData.feature_limits = {
        databases:
          databases !== undefined ? databases : currentLimits.databases,
        allocations:
          allocations !== undefined ? allocations : currentLimits.allocations,
        backups: 0,
      };
    }

    // Update server via Pterodactyl API
    await axios.patch(
      `${process.env.panel_url}/api/application/servers/${dbServer.serverId}/build`,
      updateData,
      {
        headers: {
          Authorization: `Bearer ${process.env.panel_key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    // Update user resources if resource changes were made
    if (
      ram ||
      disk ||
      cpu ||
      databases !== undefined ||
      allocations !== undefined
    ) {
      const resources = await Resources.findByPk(resourcesId);

      // Calculate and apply resource differences
      const ramDiff = (ram || currentLimits.memory) - currentLimits.memory;
      const diskDiff = (disk || currentLimits.disk) - currentLimits.disk;
      const cpuDiff = (cpu || currentLimits.cpu) - currentLimits.cpu;
      const dbDiff =
        (databases !== undefined ? databases : currentLimits.databases) -
        currentLimits.databases;
      const allocDiff =
        (allocations !== undefined ? allocations : currentLimits.allocations) -
        currentLimits.allocations;

      resources.ram -= ramDiff;
      resources.disk -= diskDiff;
      resources.cpu -= cpuDiff;
      resources.databases -= dbDiff;
      resources.allocations -= allocDiff;

      await resources.save();
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

// DELETE /servers/:id - Delete server
router.delete("/servers/:id", verifyToken, async (req, res) => {
  try {
    const { resourcesId, pteroId } = req.user;
    const { id: serverId } = req.params;

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

    // Delete server from Pterodactyl panel
    await axios.delete(
      `${process.env.panel_url}/api/application/servers/${dbServer.serverId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.panel_key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    // Restore resources to user if we successfully got the limits
    if (currentLimits && resourcesId) {
      const resources = await Resources.findByPk(resourcesId);
      if (resources) {
        resources.ram += currentLimits.memory;
        resources.disk += currentLimits.disk;
        resources.cpu += currentLimits.cpu;
        resources.databases += currentLimits.databases;
        resources.allocations += currentLimits.allocations;
        await resources.save();
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

    if (error.response?.status === 404) {
      // Server doesn't exist on panel, just remove from database
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
router.post("/servers/:id/power", verifyToken, async (req, res) => {
  try {
    const { resourcesId, pteroId } = req.user;
    const { id: serverId } = req.params;
    const { action } = req.body; // start, stop, restart, kill

    if (!action || !["start", "stop", "restart", "kill"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "Invalid action. Must be: start, stop, restart, or kill",
      });
    }

    // Find server in database
    const dbServer = await Servers.findOne({
      where: { id: serverId, owner: pteroId },
    });

    if (!dbServer) {
      return res.status(404).json({
        success: false,
        error: "Server not found or you don't have permission to control it",
      });
    }

    // Send power action to Pterodactyl
    await axios.post(
      `${process.env.panel_url}/api/client/servers/${dbServer.serverId}/power`,
      { signal: action },
      {
        headers: {
          Authorization: `Bearer ${process.env.panel_key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    res.json({
      success: true,
      message: `Server ${action} command sent successfully`,
    });
  } catch (error) {
    console.error("Error controlling server power:", error);
    res.status(500).json({
      success: false,
      error: "Failed to control server power state",
    });
  }
});

export default router;
