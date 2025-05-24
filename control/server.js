import { Router } from "express";
import { verifyToken } from "./auth.js";
import axios from "axios";
import Servers from "../model/Servers.js";
import { addSyntheticLeadingComment } from "typescript";
import User from "../model/User.js";
import Resources from "../model/resources.js";

const conf = JSON.parse(JSON.stringify(process.env));

const router = Router();

// Helper function to fetch server details from Pterodactyl panel
async function fetchServerFromPanel(serverId) {
  try {
    const response = await axios.get(
      `${conf.PTERODACTYL_URL}/api/application/servers/${serverId}`,
      {
        headers: {
          Authorization: `Bearer ${conf.PTERODACTYL_API_KEY}`,
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
      `${conf.PTERODACTYL_URL}/api/client/servers/${serverId}/resources`,
      {
        headers: {
          Authorization: `Bearer ${conf.PTERODACTYL_CLIENT_API_KEY}`,
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

router.get("/servers", verifyToken, async (req, res) => {
  try {
    const { id } = req.user;
    if (!id) return res.json({ success: false, error: "unauthorized" });

    // Get servers from database
    const dbServers = await Servers.findAll({
      where: {
        owner: id,
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
      id,
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

router.post("/servers", async (req, res) => {
  const { ram, disk, cpu, allocations, databases, node, egg } = red.body;
  const resources = await Resources.findByPk(req.user.resourcesId);
  if (ram > resources.ram)
    return res.json({ success: false, error: "ram overallocated" });
  resources.ram -= ram;
  await resources.save();
});

export default router;
