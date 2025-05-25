import { Router } from "express";
import bcrypt from "bcrypt";
import axios from "axios";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import User from "../model/User.js";
import Resources from "../model/resources.js";

const router = Router();

// Configuration
const config = {
  secretKey: process.env.SECRET_KEY,
  panelUrl: process.env.panel_url,
  panelKey: process.env.panel_key,
  nodeEnv: process.env.NODE_ENV,
  saltRounds: 12,
  tokenExpiry: "24h",
  cookieMaxAge: 24 * 60 * 60 * 1000,
};

// Validation schemas
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordMinLength = 8;

// Custom error classes for better error handling
class AuthError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AuthError";
  }
}

class PterodactylError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = "PterodactylError";
  }
}

// Utility functions
const validateInput = {
  email: (email) => emailRegex.test(email),
  password: (password) => password && password.length >= passwordMinLength,
  required: (...fields) => fields.every((field) => field && field.trim()),
};

const createToken = (user, pteroUser = null) => {
  const payload = {
    userId: user.id,
    email: user.email,
    pteroId: user.ptero_id,
  };

  if (pteroUser?.data?.attributes?.root_admin !== undefined) {
    payload.root_admin = pteroUser.data.attributes.root_admin;
  }

  return jwt.sign(payload, config.secretKey, { expiresIn: config.tokenExpiry });
};

const setAuthCookie = (res, token) => {
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "strict",
    maxAge: config.cookieMaxAge,
  });
};

const formatUserResponse = (user, pteroUser = null) => ({
  id: user.id,
  firstname: user.firstName,
  lastname: user.lastName,
  username: user.username,
  email: user.email,
  ptero_id: user.ptero_id,
  ...(pteroUser && { root_admin: pteroUser.data?.attributes?.root_admin }),
});

// Pterodactyl API service
class PterodactylService {
  constructor() {
    this.baseURL = config.panelUrl;
    this.headers = {
      Authorization: `Bearer ${config.panelKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  async getUser(pteroId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/application/users/${pteroId}`,
        {
          headers: this.headers,
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new PterodactylError("User not found in panel", 404);
      }
      throw new PterodactylError("Failed to fetch user from panel");
    }
  }

  async findUserByEmail(email) {
    try {
      const response = await axios.get(
        `${
          this.baseURL
        }/api/application/users?filter[email]=${encodeURIComponent(email)}`,
        { headers: this.headers }
      );
      return response.data.data.length > 0 ? response.data.data[0] : null;
    } catch (error) {
      throw new PterodactylError("Failed to search user in panel");
    }
  }

  async createUser(userData) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/application/users`,
        userData,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      throw new PterodactylError("Failed to create user in panel");
    }
  }

  async getOrCreateUser(user) {
    try {
      return await this.getUser(user.ptero_id);
    } catch (error) {
      if (error.statusCode === 404) {
        const newPteroUser = await this.createUser({
          email: user.email,
          username: user.username,
          first_name: user.firstName,
          last_name: user.lastName,
        });

        await user.update({ ptero_id: newPteroUser.attributes.id });
        return newPteroUser;
      }
      throw error;
    }
  }
}

const pteroService = new PterodactylService();

// Middleware
export const verifyToken = (req, res, next) => {
  const token = req.cookies.auth_token;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Access token required",
    });
  }

  try {
    const decoded = jwt.verify(token, config.secretKey);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

// Error handling middleware
const handleError = (res, error) => {
  console.error(`${error.name || "Error"}:`, error.message);

  const statusCode = error.statusCode || 500;
  const message = error.statusCode ? error.message : "Internal server error";

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};

// Route handlers
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!validateInput.required(email, password)) {
      throw new AuthError("Please provide all credentials");
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AuthError("Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthError("Invalid credentials", 401);
    }

    const pteroUser = await pteroService.getOrCreateUser(user);
    const token = createToken(user, pteroUser);

    setAuthCookie(res, token);

    res.json({
      success: true,
      message: "Login successful",
      user: formatUserResponse(user, pteroUser),
    });
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/register", async (req, res) => {
  try {
    const { firstname, lastname, username, email, password } = req.body;

    // Input validation
    if (
      !validateInput.required(firstname, lastname, username, email, password)
    ) {
      throw new AuthError("Please provide all required fields");
    }

    if (!validateInput.email(email)) {
      throw new AuthError("Please provide a valid email address");
    }

    if (!validateInput.password(password)) {
      throw new AuthError(
        `Password must be at least ${passwordMinLength} characters long`
      );
    }

    // Check for existing user
    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email }, { username }] },
    });

    if (existingUser) {
      const errorMessage =
        existingUser.email === email
          ? "Email already registered"
          : "Username already taken";
      throw new AuthError(errorMessage, 409);
    }

    // Handle Pterodactyl user creation/retrieval
    let pteroUser = await pteroService.findUserByEmail(email);

    if (!pteroUser) {
      pteroUser = await pteroService.createUser({
        email,
        username,
        first_name: firstname,
        last_name: lastname,
      });
    }

    const pteroUserId = pteroUser.attributes?.id || pteroUser.id;

    // Create database user
    const hashedPassword = await bcrypt.hash(password, config.saltRounds);
    const newUser = await User.create({
      firstName: firstname,
      lastName: lastname,
      username,
      email,
      password: hashedPassword,
      ptero_id: pteroUserId,
    });

    const token = createToken(newUser, { data: pteroUser });
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: formatUserResponse(newUser),
    });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: [
        "id",
        "firstName",
        "lastName",
        "username",
        "email",
        "ptero_id",
        "resourcesId",
      ],
    });

    if (!user) {
      throw new AuthError("User not found", 404);
    }

    // Parallel execution for better performance
    const [pteroUser, resources] = await Promise.all([
      pteroService.getUser(user.ptero_id),
      Resources.findByPk(user.resourcesId),
    ]);

    // Create resources if they don't exist
    let userResources = resources;
    if (!userResources) {
      userResources = await Resources.create();
      user.resourcesId = userResources.id;
      await user.save();
    }

    res.json({
      success: true,
      user: {
        ...formatUserResponse(user, pteroUser),
        resourcesId: user.resourcesId,
      },
      resources: userResources,
    });
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("auth_token");
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

export default router;
