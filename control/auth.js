import { Router } from "express";
import bcrypt from "bcrypt";
import axios from "axios";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import User from "../model/User.js";
import Resources from "../model/resources.js";

const router = Router();
const conf = process.env;
//console.log(conf);

// Middleware to verify token
export const verifyToken = (req, res, next) => {
  const token = req.cookies.auth_token;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, conf.SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, error: "Invalid or expired token" });
  }
};

// POST /login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.json({
        success: false,
        error: "Please provide all credentials",
      });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.json({ success: false, error: "User not found" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.json({ success: false, error: "Invalid credentials" });

    let pteroUser;
    try {
      pteroUser = await axios.get(
        `${conf.panel_url}/api/application/users/${user.ptero_id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.panel_key}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );
    } catch (err) {
      if (err.response?.status === 404) {
        const newPtero = await axios.post(
          `${conf.panel_url}/api/application/users`,
          {
            email: user.email,
            username: user.username,
            first_name: user.firstName,
            last_name: user.lastName,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.panel_key}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );

        await user.update({ ptero_id: newPtero.data.attributes.id });
        pteroUser = newPtero;
      } else {
        return res.json({
          success: false,
          error: "Failed to connect to panel",
        });
      }
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        pteroId: user.ptero_id,
        root_admin: pteroUser.data.attributes.root_admin,
      },
      conf.SECRET_KEY,
      { expiresIn: "24h" }
    );

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        firstname: user.firstName,
        lastname: user.lastName,
        username: user.username,
        email: user.email,
        ptero_id: user.ptero_id,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /register
router.post("/register", async (req, res) => {
  try {
    const { firstname, lastname, username, email, password } = req.body;
    if (!firstname || !lastname || !username || !email || !password) {
      return res.json({
        success: false,
        error: "Please provide all required fields",
      });
    }

    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email }, { username }] },
    });
    if (existingUser) {
      return res.json({
        success: false,
        error:
          existingUser.email === email
            ? "Email already registered"
            : "Username already taken",
      });
    }

    let pteroUserId;
    try {
      const existingUsers = await axios.get(
        `${conf.panel_url}/api/application/users?filter[email]=${email}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.panel_key}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (existingUsers.data.data.length > 0) {
        pteroUserId = existingUsers.data.data[0].attributes.id;
      } else {
        const newPtero = await axios.post(
          `${conf.panel_url}/api/application/users`,
          {
            email,
            username,
            first_name: firstname,
            last_name: lastname,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.panel_key}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );

        pteroUserId = newPtero.data.attributes.id;
      }
    } catch (err) {
      console.error(
        "Pterodactyl API error:",
        err.response?.data || err.message
      );
      return res.json({
        success: false,
        error: "Failed to process user in panel",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      firstName: firstname,
      lastName: lastname,
      username,
      email,
      password: hashedPassword,
      ptero_id: pteroUserId,
    });

    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        pteroId: newUser.ptero_id,
      },
      conf.SECRET_KEY,
      { expiresIn: "24h" }
    );

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: newUser.id,
        firstname: newUser.firstName,
        lastname: newUser.lastName,
        username: newUser.username,
        email: newUser.email,
        ptero_id: newUser.ptero_id,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /me (Protected route)
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

    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });
    console.log(process.env.panel_ley);
    const pteroUser = await axios.get(
      `${conf.panel_url}/api/application/users/${user.ptero_id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.panel_key}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    let resources = await Resources.findByPk(user.resourcesId);

    if (!resources) {
      resources = await Resources.create();
      user.resourcesId = resources.id;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        firstname: user.firstName,
        lastname: user.lastName,
        username: user.username,
        email: user.email,
        ptero_id: user.ptero_id,
        root_admin: pteroUser.data.attributes.root_admin,
      },
      resources,
    });
  } catch (err) {
    console.error("Get user error:", err.data);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
