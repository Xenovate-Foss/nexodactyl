import express from "express";
import Egg from "../model/Egg.js"; // Adjust path as needed
import { verifyToken } from "./auth.js";
import {Op} from "sequelize"

const router = express.Router();

// Helper function to format responses
const formatResponse = (success, data = null, error = null) => {
  const response = { success };
  if (data !== null) response.data = data;
  if (error !== null) response.error = error;
  return response;
};

// GET /api/eggs - Get all eggs
router.get("/", async (req, res) => {
  try {
    const eggs = await Egg.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.json(formatResponse(true, eggs));
  } catch (error) {
    console.error("Error fetching eggs:", error);
    res.status(500).json(formatResponse(false, null, "Failed to fetch eggs"));
  }
});

// GET /api/eggs/:id - Get single egg by ID
router.get("/:id", async (req, res) => {
  try {
    const egg = await Egg.findByPk(req.params.id);

    if (!egg) {
      return res.status(404).json(formatResponse(false, null, "Egg not found"));
    }

    res.json(formatResponse(true, egg));
  } catch (error) {
    console.error("Error fetching egg:", error);
    res.status(500).json(formatResponse(false, null, "Failed to fetch egg"));
  }
});

// GET /api/eggs/pterodactyl/:eggId - Get egg by Pterodactyl egg ID
router.get("/pterodactyl/:eggId", async (req, res) => {
  try {
    const egg = await Egg.findOne({
      where: { eggId: req.params.eggId },
    });

    if (!egg) {
      return res
        .status(404)
        .json(formatResponse(false, null, "Pterodactyl egg not found"));
    }

    res.json(formatResponse(true, egg));
  } catch (error) {
    console.error("Error fetching pterodactyl egg:", error);
    res
      .status(500)
      .json(formatResponse(false, null, "Failed to fetch pterodactyl egg"));
  }
});

// POST /api/eggs - Create new egg
router.post("/", verifyToken, async (req, res) => {
  if (!req.user.root_admin)
    return res.json({ success: false, error: "unauthorized" });
  try {
    const { eggId, name, description, img } = req.body;

    // Basic validation
    if (!eggId || !name || !img) {
      return res
        .status(400)
        .json(formatResponse(false, null, "eggId, name, and img are required"));
    }

    // Check if eggId already exists
    const existingEgg = await Egg.findOne({ where: { eggId } });
    if (existingEgg) {
      return res
        .status(409)
        .json(
          formatResponse(false, null, "Egg with this eggId already exists")
        );
    }

    const newEgg = await Egg.create({
      eggId,
      name,
      description,
      img,
    });

    res.status(201).json(formatResponse(true, newEgg));
  } catch (error) {
    console.error("Error creating egg:", error);

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
          formatResponse(false, null, "Egg with this eggId already exists")
        );
    }

    res.status(500).json(formatResponse(false, null, "Failed to create egg"));
  }
});

// PUT /api/eggs/:id - Update egg by ID
router.put("/:id", verifyToken, async (req, res) => {
  if (!req.user.root_admin)
    return res.json({ success: false, error: "unauthorized" });

  try {
    const { eggId, name, description, img } = req.body;

    const egg = await Egg.findByPk(req.params.id);
    if (!egg) {
      return res.status(404).json(formatResponse(false, null, "Egg not found"));
    }

    // If updating eggId, check for uniqueness
    if (eggId && eggId !== egg.eggId) {
      const existingEgg = await Egg.findOne({
        where: {
          eggId,
          id: { [Op.ne]: req.params.id }, // Exclude current egg
        },
      });
      if (existingEgg) {
        return res
          .status(409)
          .json(
            formatResponse(
              false,
              null,
              "Another egg with this eggId already exists"
            )
          );
      }
    }

    const updatedEgg = await egg.update({
      eggId: eggId || egg.eggId,
      name: name || egg.name,
      description: description !== undefined ? description : egg.description,
      img: img || egg.img,
    });

    res.json(formatResponse(true, updatedEgg));
  } catch (error) {
    console.error("Error updating egg:", error);

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
          formatResponse(false, null, "Egg with this eggId already exists")
        );
    }

    res.status(500).json(formatResponse(false, null, "Failed to update egg"));
  }
});

// PATCH /api/eggs/:id - Partial update egg by ID
router.patch("/:id", verifyToken, async (req, res) => {
  if (!req.user.root_admin)
    return res.json({ success: false, error: "unauthorized" });

  try {
    const egg = await Egg.findByPk(req.params.id);
    if (!egg) {
      return res.status(404).json(formatResponse(false, null, "Egg not found"));
    }

    // Only update provided fields
    const updateData = {};
    const allowedFields = ["eggId", "name", "description", "img"];

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

    // If updating eggId, check for uniqueness
    if (updateData.eggId && updateData.eggId !== egg.eggId) {
      const existingEgg = await Egg.findOne({
        where: {
          eggId: updateData.eggId,
          id: { [Op.ne]: req.params.id },
        },
      });
      if (existingEgg) {
        return res
          .status(409)
          .json(
            formatResponse(
              false,
              null,
              "Another egg with this eggId already exists"
            )
          );
      }
    }

    const updatedEgg = await egg.update(updateData);

    res.json(formatResponse(true, updatedEgg));
  } catch (error) {
    console.error("Error partially updating egg:", error);

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
          formatResponse(false, null, "Egg with this eggId already exists")
        );
    }

    res.status(500).json(formatResponse(false, null, "Failed to update egg"));
  }
});

// DELETE /api/eggs/:id - Delete egg by ID
router.delete("/:id", verifyToken, async (req, res) => {
  if (!req.user.root_admin)
    return res.json({ success: false, error: "unauthorized" });

  try {
    const egg = await Egg.findByPk(req.params.id);
    if (!egg) {
      return res.status(404).json(formatResponse(false, null, "Egg not found"));
    }

    await egg.destroy();

    res.json(
      formatResponse(true, {
        message: "Egg deleted successfully",
        deletedEgg: egg,
      })
    );
  } catch (error) {
    console.error("Error deleting egg:", error);
    res.status(500).json(formatResponse(false, null, "Failed to delete egg"));
  }
});

// DELETE /api/eggs/pterodactyl/:eggId - Delete egg by Pterodactyl egg ID
router.delete("/pterodactyl/:eggId", verifyToken, async (req, res) => {
  if (!req.user.root_admin)
    return res.json({ success: false, error: "unauthorized" });

  try {
    const egg = await Egg.findOne({
      where: { eggId: req.params.eggId },
    });

    if (!egg) {
      return res
        .status(404)
        .json(formatResponse(false, null, "Pterodactyl egg not found"));
    }

    await egg.destroy();

    res.json(
      formatResponse(true, {
        message: "Pterodactyl egg deleted successfully",
        deletedEgg: egg,
      })
    );
  } catch (error) {
    console.error("Error deleting pterodactyl egg:", error);
    res
      .status(500)
      .json(formatResponse(false, null, "Failed to delete pterodactyl egg"));
  }
});

export default router;
