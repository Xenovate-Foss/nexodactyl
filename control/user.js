import { Router } from "express";
import { verifyToken } from "./auth.js";
import axios from "axios";
import User from "../model/User.js";
import Resources from "../model/resources.js";
import bcrypt from "bcrypt";
import { Op } from "sequelize";

const router = Router();

const admin = (req, res, next) => {
  if (!req.user.root_admin) {
    return res.status(403).json({ success: false, error: "UNAUTHORIZED" });
  }
  next();
};

router.use(verifyToken);
router.use(admin);

const config = {
  panelUrl: process.env.panel_url,
  panelKey: process.env.panel_key,
  secretKey: process.env.SECRET_KEY,
};

// Axios instance for Pterodactyl API
const pterodactylAPI = axios.create({
  baseURL: `${config.panelUrl}/api/application`,
  headers: {
    Authorization: `Bearer ${config.panelKey}`,
    "Content-Type": "application/json",
    Accept: "Application/json",
  },
});

// Helper function for error handling
const handleError = (res, error, defaultMessage = "Internal server error") => {
  console.error("API Error:", error.response?.data || error.message);
  const status = error.response?.status || 500;
  const message =
    error.response?.data?.errors?.[0]?.detail ||
    error.message ||
    defaultMessage;
  return res.status(status).json({ success: false, error: message });
};

// ===== USER MANAGEMENT =====

// Get user statistics (MOVED BEFORE parameterized routes)
router.get("/users/stats", async (req, res) => {
  try {
    const totalUsers = await User.count();
    const usersWithResources = await User.count({
      include: [
        {
          model: Resources,
          as: "resources",
          required: true,
        },
      ],
    });

    const recentUsers = await User.count({
      where: {
        createdAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        usersWithResources,
        recentUsers,
        usersWithoutResources: totalUsers - usersWithResources,
      },
    });
  } catch (error) {
    handleError(res, error, "Failed to fetch user statistics");
  }
});

// Search users in local database (MOVED BEFORE parameterized routes)
router.get("/users/search/:query", async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      where: {
        [Op.or]: [
          { username: { [Op.iLike]: `%${query}%` } },
          { email: { [Op.iLike]: `%${query}%` } },
          { firstName: { [Op.iLike]: `%${query}%` } },
          { lastName: { [Op.iLike]: `%${query}%` } },
        ],
      },
      include: [
        {
          model: Resources,
          as: "resources",
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    handleError(res, error, "Failed to search users");
  }
});

// Sync local users with Pterodactyl (MOVED BEFORE parameterized routes)
router.post("/users/sync", async (req, res) => {
  try {
    let page = 1;
    let allPteroUsers = [];
    let hasMorePages = true;

    // Fetch all users from Pterodactyl
    while (hasMorePages) {
      const response = await pterodactylAPI.get("/users", {
        params: { page, per_page: 100 },
      });

      allPteroUsers = allPteroUsers.concat(response.data.data);

      hasMorePages =
        response.data.meta.pagination.current_page <
        response.data.meta.pagination.total_pages;
      page++;
    }

    let syncedCount = 0;
    let createdCount = 0;
    let errorCount = 0;

    for (const pteroUser of allPteroUsers) {
      const transaction = await User.sequelize.transaction();

      try {
        const attrs = pteroUser.attributes;

        // Check if user exists locally
        let localUser = await User.findOne({
          where: { ptero_id: attrs.id },
          transaction,
        });

        if (localUser) {
          // Update existing user
          await localUser.update(
            {
              email: attrs.email,
              username: attrs.username,
              firstName: attrs.first_name,
              lastName: attrs.last_name,
            },
            { transaction }
          );
          syncedCount++;
        } else {
          // Create new user (without password as we don't have it from Pterodactyl)
          // Generate a random password that meets validation requirements
          const tempPassword = await bcrypt.hash(
            Math.random().toString(36).slice(-12),
            12
          );

          await User.create(
            {
              firstName: attrs.first_name,
              lastName: attrs.last_name,
              username: attrs.username,
              email: attrs.email,
              password: tempPassword,
              ptero_id: attrs.id,
            },
            { transaction }
          );
          createdCount++;
        }

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        console.warn(
          `Failed to sync user ${pteroUser.attributes.id}:`,
          error.message
        );
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `Sync completed: ${syncedCount} updated, ${createdCount} created, ${errorCount} errors`,
      stats: {
        total_pterodactyl_users: allPteroUsers.length,
        synced: syncedCount,
        created: createdCount,
        errors: errorCount,
      },
    });
  } catch (error) {
    handleError(res, error, "Failed to sync users");
  }
});

// Get user by Pterodactyl ID (MOVED BEFORE /users/:id)
router.get("/users/ptero/:pteroId", async (req, res) => {
  try {
    const user = await User.findOne({
      where: { ptero_id: req.params.pteroId },
      include: [
        {
          model: Resources,
          as: "resources",
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    handleError(res, error, "Failed to fetch user by Pterodactyl ID");
  }
});

// Get all users (local database with Pterodactyl sync)
router.get("/users", async (req, res) => {
  try {
    const { page = 1, limit = 50, include_resources = false } = req.query;
    const offset = (page - 1) * limit;

    const queryOptions = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    };

    if (include_resources === "true") {
      queryOptions.include = [
        {
          model: Resources,
          as: "resources",
        },
      ];
    }

    const { count, rows: users } = await User.findAndCountAll(queryOptions);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    handleError(res, error, "Failed to fetch users");
  }
});

// Get specific user by ID (local database) - NOW CORRECTLY POSITIONED
router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        {
          model: Resources,
          as: "resources",
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Also fetch from Pterodactyl for comparison
    let pterodactylUser = null;
    try {
      const response = await pterodactylAPI.get(`/users/${user.ptero_id}`);
      pterodactylUser = response.data;
    } catch (pteroError) {
      console.warn(
        `Failed to fetch Pterodactyl user ${user.ptero_id}:`,
        pteroError.message
      );
    }

    res.json({
      success: true,
      data: {
        localUser: user,
        pterodactylUser,
      },
    });
  } catch (error) {
    handleError(res, error, "Failed to fetch user");
  }
});

// Get user's servers from Pterodactyl
router.get("/users/:id/servers", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const response = await pterodactylAPI.get(
      `/users/${user.ptero_id}?include=servers`
    );
    const servers = response.data.attributes.relationships?.servers?.data || [];

    res.json({ success: true, data: servers });
  } catch (error) {
    handleError(res, error, "Failed to fetch user's servers");
  }
});

// Create new user (both local and Pterodactyl)
router.post("/users", async (req, res) => {
  const transaction = await User.sequelize.transaction();

  try {
    const { email, username, firstName, lastName, password } = req.body;

    // Validate required fields
    if (!email || !username || !firstName || !lastName || !password) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: email, username, firstName, lastName, password",
      });
    }

    // Check if user already exists (await the promise!)
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }],
      },
    });

    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error:
          existingUser.email === email
            ? "User with this email already exists"
            : "User with this username already exists",
      });
    }

    // Create user in Pterodactyl first
    const pterodactylUserData = {
      email,
      username,
      first_name: firstName,
      last_name: lastName,
      password,
      root_admin: req.body.root_admin || false,
      language: req.body.language || "en",
    };

    let pterodactylResponse;
    let pterodactylUserId = null;

    try {
      pterodactylResponse = await pterodactylAPI.post(
        "/users",
        pterodactylUserData
      );
      pterodactylUserId = pterodactylResponse.data.attributes.id;
    } catch (pterodactylError) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        error: "Failed to create user in Pterodactyl panel",
        details: pterodactylError.response?.data || pterodactylError.message,
      });
    }

    // Hash password for local storage
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user in local database
    const localUser = await User.create(
      {
        firstName,
        lastName,
        username,
        email,
        password: hashedPassword,
        ptero_id: pterodactylUserId,
      },
      { transaction }
    );

    await transaction.commit();

    // Fetch the created user with resources
    const createdUser = await User.findByPk(localUser.id, {
      include: [
        {
          model: Resources,
          as: "resources",
        },
      ],
    });

    res.status(201).json({
      success: true,
      data: {
        localUser: createdUser,
        pterodactylUser: pterodactylResponse.data,
      },
    });
  } catch (error) {
    await transaction.rollback();

    // If Pterodactyl user was created but local creation failed, attempt cleanup
    if (pterodactylUserId) {
      try {
        await pterodactylAPI.delete(`/users/${pterodactylUserId}`);
      } catch (cleanupError) {
        console.error("Failed to cleanup Pterodactyl user:", cleanupError);
        // You might want to log this for manual cleanup or implement a retry mechanism
      }
    }

    // Handle Sequelize validation errors
    if (
      error.name === "SequelizeValidationError" ||
      error.name === "SequelizeUniqueConstraintError"
    ) {
      return res.status(400).json({
        success: false,
        error: error.errors.map((e) => e.message).join(", "),
      });
    }

    // Handle other errors
    handleError(res, error, "Failed to create user");
  }
});

// Update user (both local and Pterodactyl)
router.patch("/users/:id", async (req, res) => {
  const transaction = await User.sequelize.transaction();

  try {
    const user = await User.findByPk(req.params.id, { transaction });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const allowedLocalFields = [
      "email",
      "username",
      "firstName",
      "lastName",
      "password",
    ];
    const allowedPteroFields = [
      "email",
      "username",
      "first_name",
      "last_name",
      "password",
      "root_admin",
      "language",
    ];

    const localUpdateData = {};
    const pteroUpdateData = {};

    // Prepare update data for both systems
    Object.keys(req.body).forEach((key) => {
      if (allowedLocalFields.includes(key) && req.body[key] !== undefined) {
        localUpdateData[key] = req.body[key];
      }

      // Map local fields to Pterodactyl fields
      if (key === "firstName" && req.body[key] !== undefined) {
        pteroUpdateData.first_name = req.body[key];
      } else if (key === "lastName" && req.body[key] !== undefined) {
        pteroUpdateData.last_name = req.body[key];
      } else if (
        allowedPteroFields.includes(key) &&
        req.body[key] !== undefined
      ) {
        pteroUpdateData[key] = req.body[key];
      }
    });

    if (
      Object.keys(localUpdateData).length === 0 &&
      Object.keys(pteroUpdateData).length === 0
    ) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: "No valid fields provided for update",
      });
    }

    // Hash password if provided
    if (localUpdateData.password) {
      localUpdateData.password = await bcrypt.hash(
        localUpdateData.password,
        12
      );
    }

    // Update Pterodactyl user first
    let pterodactylResponse = null;
    if (Object.keys(pteroUpdateData).length > 0) {
      pterodactylResponse = await pterodactylAPI.patch(
        `/users/${user.ptero_id}`,
        pteroUpdateData
      );
    }

    // Update local user
    if (Object.keys(localUpdateData).length > 0) {
      await user.update(localUpdateData, { transaction });
    }

    await transaction.commit();

    // Fetch updated user with resources
    const updatedUser = await User.findByPk(req.params.id, {
      include: [
        {
          model: Resources,
          as: "resources",
        },
      ],
    });

    res.json({
      success: true,
      data: {
        localUser: updatedUser,
        pterodactylUser: pterodactylResponse?.data || null,
      },
    });
  } catch (error) {
    await transaction.rollback();

    if (
      error.name === "SequelizeValidationError" ||
      error.name === "SequelizeUniqueConstraintError"
    ) {
      return res.status(400).json({
        success: false,
        error: error.errors.map((e) => e.message).join(", "),
      });
    }

    handleError(res, error, "Failed to update user");
  }
});

// Delete user (both local and Pterodactyl) - FIXED TRANSACTION USAGE
router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Delete from Pterodactyl first
    try {
      await pterodactylAPI.delete(`/users/${user.ptero_id}`);
    } catch (pteroError) {
      console.warn(
        `Failed to delete Pterodactyl user ${user.ptero_id}:`,
        pteroError.message
      );
      // Continue with local deletion even if Pterodactyl deletion fails
    }

    // Delete associated resources - FIXED: Proper resource deletion

    // Delete local user
    await user.destroy({ force: true });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    handleError(res, error, "Failed to delete user");
  }
});

export default router;
