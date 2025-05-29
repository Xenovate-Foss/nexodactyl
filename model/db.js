import { Sequelize } from "sequelize";

const db = new Sequelize(process.env.db_url, {
  logging: false,
});

try {
  await db.authenticate();
  console.log("Connection has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database:", error);
}

export const syncDatabase = async () => {
  try {
    await db.sync({ alter: true }); // Set to true only in development to drop tables
    console.log("Database synced successfully");
  } catch (error) {
    console.error("Error syncing database:", error);
  }
};

export default db;
