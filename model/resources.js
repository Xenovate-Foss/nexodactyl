import { DataTypes } from "sequelize";
import db from "./db.js";

const Resources = db.define(
  "resources",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ram: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: parseInt(process.env.ram) || 1024,
      validate: {
        min: 0,
      },
    },
    disk: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: parseInt(process.env.disk) || 10240,
      validate: {
        min: 0,
      },
    },
    cpu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: parseInt(process.env.cpu) || 100,
      validate: {
        min: 0,
      },
    },
    allocations: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: parseInt(process.env.allocations) || 1,
      validate: {
        min: 0,
      },
    },
    databases: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: parseInt(process.env.databases) || 1,
      validate: {
        min: 0,
      },
    },
    slots: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: parseInt(process.env.slots) || 1,
      validate: {
        min: 0,
      },
    },
    coins: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
  },
  {
    tableName: "resources",
    timestamps: true, // adds createdAt and updatedAt
  }
);

export default Resources;
