import express from "express";
import { Op } from "sequelize";
import Node from "../model/Node.js"; // Adjust path as needed
import { verifyToken } from "./auth.js";

const router = express.Router();

// Helper function to format responses
const formatResponse = (success, data = null, error = null) => {
  const response = { success };
  if (data !== null) response.data = data;
  if (error !== null) response.error = error;
  return response;
};

// GET /api/nodes - Get all nodes
router.get("/", async (req, res) => {
  try {
    const nodes = await Node.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.json(formatResponse(true, nodes));
  } catch (error) {
    console.error("Error fetching nodes:", error);
    res.status(500).json(formatResponse(false, null, "Failed to fetch nodes"));
  }
});

// GET /api/nodes/:id - Get single node by ID
router.get("/:id", async (req, res) => {
  try {
    const node = await Node.findByPk(req.params.id);

    if (!node) {
      return res
        .status(404)
        .json(formatResponse(false, null, "Node not found"));
    }

    res.json(formatResponse(true, node));
  } catch (error) {
    console.error("Error fetching node:", error);
    res.status(500).json(formatResponse(false, null, "Failed to fetch node"));
  }
});

// GET /api/nodes/pterodactyl/:nodeId - Get node by Pterodactyl node ID
router.get("/pterodactyl/:nodeId", async (req, res) => {
  try {
    const node = await Node.findOne({
      where: { nodeId: req.params.nodeId },
    });

    if (!node) {
      return res
        .status(404)
        .json(formatResponse(false, null, "Pterodactyl node not found"));
    }

    res.json(formatResponse(true, node));
  } catch (error) {
    console.error("Error fetching pterodactyl node:", error);
    res
      .status(500)
      .json(formatResponse(false, null, "Failed to fetch pterodactyl node"));
  }
});

// POST /api/nodes - Create new node
router.post("/", verifyToken, async (req, res) => {
  if (!req.user.root_admin)
    return res.json({ success: false, error: "unauthorized" });

  try {
    const { nodeId, location } = req.body;

    // Basic validation
    if (!nodeId || !location) {
      return res
        .status(400)
        .json(formatResponse(false, null, "nodeId and location are required"));
    }

    // Check if nodeId already exists
    const existingNode = await Node.findOne({ where: { nodeId } });
    if (existingNode) {
      return res
        .status(409)
        .json(
          formatResponse(false, null, "Node with this nodeId already exists")
        );
    }

    const newNode = await Node.create({
      nodeId,
      location,
    });

    res.status(201).json(formatResponse(true, newNode));
  } catch (error) {
    console.error("Error creating node:", error);

    // Handle Sequelize validation errors
    if (error.name === "SequelizeValidationError") {
      const validationErrors = error.errors
        .map((err) => err.message)
        .join(", ");
      return res
        .status(400)
        .json(
          formatResponse(false, null, `Validation error: ${validationErrors}`)
        );
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json(
          formatResponse(false, null, "Node with this nodeId already exists")
        );
    }

    res.status(500).json(formatResponse(false, null, "Failed to create node"));
  }
});

// PUT /api/nodes/:id - Update node by ID
router.put("/:id", verifyToken, async (req, res) => {
  if (!req.user.root_admin)
    return res.json({ success: false, error: "unauthorized" });

  try {
    const { nodeId, location } = req.body;

    const node = await Node.findByPk(req.params.id);
    if (!node) {
      return res
        .status(404)
        .json(formatResponse(false, null, "Node not found"));
    }

    // If updating nodeId, check for uniqueness
    if (nodeId && nodeId !== node.nodeId) {
      const existingNode = await Node.findOne({
        where: {
          nodeId,
          id: { [Op.ne]: req.params.id }, // Exclude current node
        },
      });
      if (existingNode) {
        return res
          .status(409)
          .json(
            formatResponse(
              false,
              null,
              "Another node with this nodeId already exists"
            )
          );
      }
    }

    const updatedNode = await node.update({
      nodeId: nodeId || node.nodeId,
      location: location || node.location,
    });

    res.json(formatResponse(true, updatedNode));
  } catch (error) {
    console.error("Error updating node:", error);

    // Handle Sequelize validation errors
    if (error.name === "SequelizeValidationError") {
      const validationErrors = error.errors
        .map((err) => err.message)
        .join(", ");
      return res
        .status(400)
        .json(
          formatResponse(false, null, `Validation error: ${validationErrors}`)
        );
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json(
          formatResponse(false, null, "Node with this nodeId already exists")
        );
    }

    res.status(500).json(formatResponse(false, null, "Failed to update node"));
  }
});

// PATCH /api/nodes/:id - Partial update node by ID
router.patch("/:id", verifyToken, async (req, res) => {
  if (!req.user.root_admin)
    return res.json({ success: false, error: "unauthorized" });

  try {
    const node = await Node.findByPk(req.params.id);
    if (!node) {
      return res
        .status(404)
        .json(formatResponse(false, null, "Node not found"));
    }

    // Only update provided fields
    const updateData = {};
    const allowedFields = ["nodeId", "location"];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json(
          formatResponse(false, null, "No valid fields provided for update")
        );
    }

    // If updating nodeId, check for uniqueness
    if (updateData.nodeId && updateData.nodeId !== node.nodeId) {
      const existingNode = await Node.findOne({
        where: {
          nodeId: updateData.nodeId,
          id: { [Op.ne]: req.params.id },
        },
      });
      if (existingNode) {
        return res
          .status(409)
          .json(
            formatResponse(
              false,
              null,
              "Another node with this nodeId already exists"
            )
          );
      }
    }

    const updatedNode = await node.update(updateData);

    res.json(formatResponse(true, updatedNode));
  } catch (error) {
    console.error("Error partially updating node:", error);

    if (error.name === "SequelizeValidationError") {
      const validationErrors = error.errors
        .map((err) => err.message)
        .join(", ");
      return res
        .status(400)
        .json(
          formatResponse(false, null, `Validation error: ${validationErrors}`)
        );
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json(
          formatResponse(false, null, "Node with this nodeId already exists")
        );
    }

    res.status(500).json(formatResponse(false, null, "Failed to update node"));
  }
});

// DELETE /api/nodes/:id - Delete node by ID
router.delete("/:id", verifyToken, async (req, res) => {
  if (!req.user.root_admin)
    return res.json({ success: false, error: "unauthorized" });

  try {
    const node = await Node.findByPk(req.params.id);
    if (!node) {
      return res
        .status(404)
        .json(formatResponse(false, null, "Node not found"));
    }

    await node.destroy();

    res.json(
      formatResponse(true, {
        message: "Node deleted successfully",
        deletedNode: node,
      })
    );
  } catch (error) {
    console.error("Error deleting node:", error);
    res.status(500).json(formatResponse(false, null, "Failed to delete node"));
  }
});

// DELETE /api/nodes/pterodactyl/:nodeId - Delete node by Pterodactyl node ID
router.delete("/pterodactyl/:nodeId", verifyToken, async (req, res) => {
  if (!req.user.root_admin)
    return res.json({ success: false, error: "unauthorized" });

  try {
    const node = await Node.findOne({
      where: { nodeId: req.params.nodeId },
    });

    if (!node) {
      return res
        .status(404)
        .json(formatResponse(false, null, "Pterodactyl node not found"));
    }

    await node.destroy();

    res.json(
      formatResponse(true, {
        message: "Pterodactyl node deleted successfully",
        deletedNode: node,
      })
    );
  } catch (error) {
    console.error("Error deleting pterodactyl node:", error);
    res
      .status(500)
      .json(formatResponse(false, null, "Failed to delete pterodactyl node"));
  }
});

export default router;
