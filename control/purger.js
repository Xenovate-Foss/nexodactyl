import { Socket } from "socket.io";
import { Router } from "express";
import User from "../model/User.js";
import Server from "../model/Servers.js";
import Resources from "../model/resources.js";
import axios from "axios";
import { verifyToken } from "./auth.js";
import { getServerLimits, fetchServerFromPanel } from "./server.js";

const router = Router();

router.use(verifyToken);
router.use((req, res, next) => {
  if (!req.user.root_admin)
    return res.json({ success: false, error: "unauthorized access" });
  next();
});

const pteroConn = axios.create({
  baseURL: process.env.panel_url,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json", // Fixed: was "Content-Length"
    Authorization: `Bearer ${process.env.panel_key}`,
  },
  timeout: 30000,
});

router.delete("/purger/", async (req, res) => {
  try {
    const { keywords } = req.body;
    
    // Validate input
    if (!keywords || typeof keywords !== 'string') {
      return res.json({ success: false, error: "Keywords parameter is required and must be a string" });
    }

    // Get all servers from database
    const servers = await Server.findAll();
    
    // Fetch server details from panel for each server
    const serverDetails = [];
    for (const server of servers) {
      try {
        const panelServer = await fetchServerFromPanel(server.serverId);
        if (panelServer) {
          serverDetails.push(panelServer);
        }
      } catch (error) {
        console.error(`Failed to fetch server ${server.serverId}:`, error.message);
      }
    }

    const serversToDelete = [];
    
    // Process each server
    for (const server of serverDetails) {
      try {
        // Skip servers that contain the keywords (don't delete them)
        if (server.attributes.name.includes(keywords)) {
          continue;
        }

        // Get server limits/resources
        const userResources = await getServerLimits(server.attributes.id);
        
        // Find associated resource record
        const resource = await Resources.findOne({
          where: { serverId: server.attributes.id }
        });

        // Add to deletion list
        serversToDelete.push({
          server: server,
          resources: userResources,
          resourceRecord: resource
        });

      } catch (error) {
        console.error(`Error processing server ${server.attributes.id}:`, error.message);
      }
    }

    // Actually delete the servers (uncomment and modify as needed)
    const deletedServers = [];
    for (const item of serversToDelete) {
      try {
        // Delete from panel
        await pteroConn.delete(`/api/application/servers/${item.server.attributes.id}`);
        
        // Delete from database
        await Server.destroy({
          where: { serverId: item.server.attributes.id }
        });
        
        // Delete resource record if exists
        if (item.resourceRecord) {
          await Resources.destroy({
            where: { serverId: item.server.attributes.id }
          });
        }
        
        deletedServers.push(item.server.attributes.name);
      } catch (error) {
        console.error(`Failed to delete server ${item.server.attributes.id}:`, error.message);
      }
    }

    res.json({ 
      success: true, 
      message: `Purge completed. Deleted ${deletedServers.length} servers.`,
      deletedServers: deletedServers
    });

  } catch (error) {
    console.error('Purger error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Internal server error during purge operation" 
    });
  }
});

export default router;