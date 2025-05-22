// dependencies
import express from "express";
import { config } from "dotenv";

// env ver load
config();

// controller import
import configRoute from "./control/config.js";

// app config
const app = express();

app.use(express.json());

// router setup
app.use("/api", configRoute);

// panel connection test
if(!process.env.panel_url && !process.env.panel_key) {
    console.error("Please provide the panel details")
} else {
    console.log("checking panel connection, url ", process.env.panel_url)
    axios.get(process.env.panel_url + "/api/application/users", {
        Headers: {
            con
        }
    })
}

// listener
app.listen("3000", () => console.log("started at port 3000"));
