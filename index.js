"use strict";

// dependencies
import express from "express";
import { config } from "dotenv";
import axios from "axios";
import cors from "cors";
import "./model/db.js";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import fs from "node:fs";
import morgan from "morgan";

// logo ascii
let banner;
fs.readFile("./sm-two.txt", "utf-8", (err, data) => {
  if (err) throw Error(err);
  banner = data
    .replace(/x/g, "\x1b[34m▓\x1b[0m")
    .replace(/\$/g, "\x1b[30m█\x1b[0m")
    .replace("%panel_url%", process.env.panel_url)
    .replace("https://", "")
    .replace("http://", "")
    .replace("/", "")
    .replace("%app_url%", process.env.app_url);
});
// env var load
config();
fs.watchFile(".env", () => {
  console.log(".env file changed, reloading configuration...");
  config();
});

// controller import
import configRoute from "./control/config.js";
import AuthRoute from "./control/auth.js";
import { syncDatabase } from "./model/db.js";
import serverRoute from "./control/server.js";
import nodeCrudRoute from "./control/node.js";
import eggCrudRoute from "./control/egg.js";
import userCrudRoute from "./control/user.js";
import resourcesCrud from "./control/resources.js";
import adminServer from "./control/adminServer.js";
import purger from "./control/purger.js";

// app conf
const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(morgan());

// logger
/*app.use((req, res, next) => {
  console.log(req.url);
  next();
});*/

// router setup
app.use("/api", configRoute);
app.use("/api/auth", AuthRoute);
app.use("/api", serverRoute);
app.use("/api/nodes", nodeCrudRoute);
app.use("/api/eggs", eggCrudRoute);
app.use("/api/resources", resourcesCrud);
app.use("/api", userCrudRoute);
app.use("/api/", adminServer);
app.use("/api/admin", purger);

// panel connection test
if (!process.env.panel_url || !process.env.panel_key) {
  console.error("Please provide the panel details");
  process.exit(1);
} else {
  console.log("checking panel connection, url ", process.env.panel_url);
  (async () => {
    try {
      const response = await axios.get(
        process.env.panel_url + "/api/application/users",
        {
          headers: {
            // Fixed: lowercase 'headers'
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.panel_key}`,
          },
        }
      );
      console.log("Panel connection successful");
    } catch (error) {
      console.error("Panel connection failed:", error.message);
      process.exit(1);
    }
  })();
}

syncDatabase();

// listener
app.listen(3000, () => {
  console.clear();
  console.log(banner);
  console.log("started at port 3000");
});
if (process.env.CSB) {
  console.warn("Codesandbox Environment detected");
  console.warn(
    "If you're testing this dashboard it's fair but don't use codesandbox for as a hosting"
  );
}
