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

// listener
app.listen("3000", () => console.log("started at port 3000"));
