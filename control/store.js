import Resources from "../model/resources.js";
import { verifyToken } from "./auth.js";
import { Router } from "express";

const router = Router();

router.post("/store", verifyToken, async (req, res) => {
  try {
    const { resourcesId } = req.user;
    const { item, quantity } = req.body; // Fixed typo: 'quentity' -> 'quantity'

    // Input validation
    if (!item || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid item or quantity",
      });
    }

    // Find user's resources (added await for async operation)
    const resources = await Resources.findByPk(resourcesId);

    if (!resources) {
      return res.status(404).json({
        success: false,
        error: "Resources not found",
      });
    }

    // Define item prices (could be moved to a config file or database)
    const itemPrices = {
      ram: parseInt(process.env.ramperprice) || 10,
      cpu: parseInt(process.env.cpuperprice) || 15,
      disk: parseInt(process.env.diskperprice) || 5,
      allocations: parseInt(process.env.allocperprice) || 5,
      databases: parseInt(process.env.dbperprice) || 5,
      slots: parseInt(process.env.slotsperprice) || 5,
    };

    // Check if item exists
    if (!itemPrices[item]) {
      return res.status(400).json({
        success: false,
        error: "Item not available",
      });
    }

    const itemPrice = itemPrices[item];
    const total = itemPrice * quantity;

    // Check if user can afford the purchase
    if (total > resources.coins) {
      return res.status(400).json({
        success: false,
        error: "Insufficient coins",
      });
    }

    // Update user's resources
    const updatedCoins = resources.coins - total;
    const currentItemAmount = resources[item] || 0;
    const newItemAmount = currentItemAmount + quantity;

    // Update the database
    await resources.update({
      coins: updatedCoins,
      [item]: newItemAmount,
    });

    // Return success response
    res.json({
      success: true,
      message: `Successfully purchased ${quantity} ${item}(s)`,
      data: {
        coinsRemaining: updatedCoins,
        [item]: newItemAmount,
        totalCost: total,
      },
    });
  } catch (error) {
    console.error("Store purchase error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;
