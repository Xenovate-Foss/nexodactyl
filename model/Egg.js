import { DataTypes } from "sequelize";
import db from "./db.js";

const Egg = db.define(
  "egg",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    // eggId corresponds to Pterodactyl's egg ID
    eggId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // Each Pterodactyl egg should be unique
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true, // Ensures name isn't just whitespace
        len: [1, 255], // Reasonable length constraint
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true, // Explicitly allow null if description is optional
    },
    img: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        isValidImagePath(value) {
          // Custom validator for both URLs and file paths
          const urlPattern = /^https?:\/\/.+/;
          const filePathPattern =
            /^[a-zA-Z0-9._\-\/\\]+\.(jpg|jpeg|png|gif|svg|webp)$/i;

          if (!urlPattern.test(value) && !filePathPattern.test(value)) {
            throw new Error(
              "Image must be a valid URL or file path ending with an image extension"
            );
          }
        },
      },
    },
  },
  {
    // Model options
    timestamps: true, // Adds createdAt and updatedAt
    paranoid: false, // Set to true if you want soft deletes
    tableName: "eggs", // Explicit table name
    indexes: [
      {
        unique: true,
        fields: ["eggId"], // For fast Pterodactyl egg lookups
      },
      {
        fields: ["name"], // For faster name searches
      },
    ],
  }
);

Egg.sync({ alter: true });

export default Egg;
