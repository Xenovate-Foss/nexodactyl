import { DataTypes } from "sequelize";
import db from "./db.js";
import Resources from "./Resources.js";

const User = db.define(
  "users",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50],
      },
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50],
      },
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 30],
        isAlphanumeric: true,
      },
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [6, 255], // Assuming hashed passwords
      },
    },
    ptero_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      validate: {
        isInt: true,
      },
    },
    resourcesId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Resources,
        key: "id",
      },
    },
  },
  {
    tableName: "users",
    timestamps: true,
  }
);

// Define associations
User.belongsTo(Resources, {
  foreignKey: "resourcesId",
  as: "resources",
});

Resources.hasMany(User, {
  foreignKey: "resourcesId",
  as: "users",
});

// Fixed beforeCreate hook - automatically create resources for each new user
User.beforeCreate(async (user, options) => {
  try {
    const newResources = await Resources.create(
      {},
      { transaction: options.transaction }
    );
    user.resourcesId = newResources.id;
  } catch (error) {
    throw new Error(`Failed to create resources for user: ${error.message}`);
  }
});

export default User;
