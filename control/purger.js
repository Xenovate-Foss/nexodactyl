import { Socket } from "socket.io";
import { Router } from "express";
import User from "../model/User.js";
import Server from "../model/Servers.js";
import Resources from "../model/resources.js";
import axios from "axios";
import { verifyToken } from "./auth.js";
import { getServerLimits, fetchServerFromPanel } from "./server.js";

const router = Router();

router.use(verifyToken());
router.use((req, res, next) => {
  if (!req.user.root_admin)
    return res.json({ success: false, error: "unauthorized access" });
  next();
});

const pteroConn = axios.create({
  baseURL: process.env.panel_url,
  headers: {
    Accept: "application/json",
    "Content-Length": "application/json",
    Authorization: `Bearer ${process.env.panel_key}`,
  },
  timeout: 30000,
});

router.delete("/purger/", async (req, res) => {
  const { keywords } = req.body;
  const servers = await Server.findAll();
  const panelServer = await get();
  const server = [];
  servers.forEach(async (server) => {
    server[server.id] = await fetchServerFromPanel(server.serverId);
  });
  server.forEach(async (server) => {
    if (server.attributes.name.includes(keywords)) return;
    const userResources = await getServerLimits(server.attributes.id);
    const resource = await r;
  });
});
