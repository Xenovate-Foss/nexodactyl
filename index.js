// dependencies
import express from "express";
import { config } from "dotenv";
import axios from "axios";
import cors from "cors";
import "./model/db.js";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import fs from "node:fs";

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

// app config
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

// logger
app.use((req, res, next) => {
  console.log(req.url);
  next();
});

// router setup
app.use("/api", configRoute);
app.use("/api/auth", AuthRoute);
app.use("/api", serverRoute);

// panel connection test
if (!process.env.panel_url || !process.env.panel_key) {
  console.error("Please provide the panel details");
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
    }
  })();
}

syncDatabase();

// listener
app.listen(3000, () => console.log("started at port 3000"));
if (process.env.CSB) {
  console.warn("Codesandbox Environment detected");
  console.warn(
    "If you're testing this dashboard it's fair but don't use codesandbox for as a hosting"
  );
}
