import { DataTypes } from "sequelize";
import db from "./db.js";
import User from "./User.js";

const Servers = db.define("servers", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  serverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  renewDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  owner: {
    type: DataTypes.INTEGER,
    reference: {
      model: User,
      key: "id",
    },
  },
});

Servers.sync({ alter: true });

export default Servers;
