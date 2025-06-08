// model/PurgeJob.js
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

const PurgeJob = sequelize.define(
  "PurgeJob",
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "User",
        key: "id",
      },
    },
    keywords: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("started", "processing", "completed", "failed"),
      defaultValue: "started",
    },
    total_servers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    processed_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    deleted_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    failed_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    estimated_matches: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "purge_jobs",
    timestamps: false,
  }
);

export default PurgeJob;
