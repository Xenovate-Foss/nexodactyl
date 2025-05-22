import User from "../model/User.js";
import { Router } from "express";
import bcrypt from "bcrypt";
import axios from "axios";
import jwt from "jsonwebtoken";
import {Op} from "sequelize"

const router = Router();
const conf = process.env;

// Login route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.json({ success: false, error: "Please provide all credentials" });
    }

    // Find user in database
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.json({ success: false, error: "User not found" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.json({ success: false, error: "Invalid credentials" });
    }

    // Get or create user in Pterodactyl panel
    let pteroUser;
    try {
      // Try to get existing user
      pteroUser = await axios.get(`${conf.panel_url}/api/application/users/${user.ptero_id}`, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${conf.panel_key}`
        }
      });
    } catch (pteroError) {
      // If user doesn't exist in panel (404), create them
      if (pteroError.response?.status === 404) {
        try {
          console.log("Pterodactyl user not found, creating new user...");
          pteroUser = await axios.post(`${conf.panel_url}/api/application/users`, {
            email: user.email,
            username: user.username,
            first_name: user.firstname,
            last_name: user.lastname
          }, {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${conf.panel_key}`
            }
          });

          // Update user's ptero_id in database with the new ID
          await User.update(
            { ptero_id: pteroUser.data.attributes.id },
            { where: { id: user.id } }
          );
          
          console.log("Pterodactyl user created successfully");
        } catch (createError) {
          console.error("Failed to create Pterodactyl user:", createError.response?.data || createError.message);
          return res.json({ success: false, error: "Failed to create user in panel" });
        }
      } else {
        console.error("Pterodactyl API error:", pteroError.response?.data || pteroError.message);
        return res.json({ success: false, error: "Failed to connect to panel" });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        pteroId: user.ptero_id 
      },
      conf.SECRET_KEY,
      { expiresIn: "24h" }
    );

    // Return success response
    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        username: user.username,
        email: user.email,
        ptero_id: user.ptero_id
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Registration route
router.post("/register", async (req, res) => {
  try {
    const { firstname, lastname, username, email, password } = req.body;

    // Validate input
    if (!firstname || !lastname || !username || !email || !password) {
      return res.json({ success: false, error: "Please provide all required fields" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return res.json({ 
        success: false, 
        error: existingUser.email === email ? "Email already registered" : "Username already taken" 
      });
    }

    // Create user in Pterodactyl panel first
    let pteroResponse;
    try {
      pteroResponse = await axios.post(`${conf.panel_url}/api/application/users`, {
        email,
        username,
        first_name: firstname,
        last_name: lastname
      }, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${conf.panel_key}`
        }
      });
    } catch (pteroError) {
      console.error("Pterodactyl user creation error:", pteroError.response?.data || pteroError.message);
      return res.json({ success: false, error: "Failed to create user in panel" });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in database
    const newUser = await User.create({
      firstName: firstname,
      lastName: lastname,
      username,
      email,
      password: hashedPassword,
      ptero_id: pteroResponse.data.attributes.id
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email, 
        pteroId: newUser.ptero_id 
      },
      conf.secret_key,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: newUser.id,
        firstname: newUser.firstname,
        lastname: newUser.lastname,
        username: newUser.username,
        email: newUser.email,
        ptero_id: newUser.ptero_id
      }
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Verify token middleware (for protecting routes)
export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, conf.SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};

// Get current user info (protected route example)
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['id', 'firstname', 'lastname', 'username', 'email', 'ptero_id']
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;