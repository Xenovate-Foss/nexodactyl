// dependencies
import express from "express";
import { config } from "dotenv";
import axios from "axios";

// env var load
config();

// controller import
import configRoute from "./control/config.js";

// app config
const app = express();

app.use(express.json());

// router setup
app.use("/api", configRoute);

// panel connection test
if (!process.env.panel_url || !process.env.panel_key) {
  console.error("Please provide the panel details");
} else {
  console.log("checking panel connection, url ", process.env.panel_url);
  (async () => {
    try {
      const response = await axios.get(process.env.panel_url + "/api/application/users", {
        headers: { // Fixed: lowercase 'headers'
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.panel_key}`,
        }
      });
      console.log("Panel connection successful");
    } catch (error) {
      console.error("Panel connection failed:", error.message);
    }
  })();
}

// listener
app.listen(3000, () => console.log("started at port 3000")); 