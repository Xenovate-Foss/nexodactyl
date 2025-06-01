import { Router } from "express";
import Resources from "../model/resources.js";
import { verifyToken } from "./auth.js";

const router = Router();

// Middleware to check admin access
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.root_admin) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required."
    });
  }
  next();
};

// GET /resources - Get all resources (Admin only)
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Resources.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        resources: rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch resources",
      error: error.message
    });
  }
});

// GET /resources/:id - Get single resource by ID (Admin only)
router.get("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const resource = await Resources.findByPk(id);
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    res.json({
      success: true,
      data: resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch resource",
      error: error.message
    });
  }
});

// POST /resources - Create new resource (Admin only)
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      ram,
      disk,
      cpu,
      allocations,
      databases,
      slots,
      coins
    } = req.body;

    // Validate required fields if provided
    const resourceData = {};
    
    if (ram !== undefined) resourceData.ram = parseInt(ram);
    if (disk !== undefined) resourceData.disk = parseInt(disk);
    if (cpu !== undefined) resourceData.cpu = parseInt(cpu);
    if (allocations !== undefined) resourceData.allocations = parseInt(allocations);
    if (databases !== undefined) resourceData.databases = parseInt(databases);
    if (slots !== undefined) resourceData.slots = parseInt(slots);
    if (coins !== undefined) resourceData.coins = parseInt(coins);

    const newResource = await Resources.create(resourceData);

    res.status(201).json({
      success: true,
      message: "Resource created successfully",
      data: newResource
    });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create resource",
      error: error.message
    });
  }
});

// PUT /resources/:id - Update resource (Admin only)
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      ram,
      disk,
      cpu,
      allocations,
      databases,
      slots,
      coins
    } = req.body;

    const resource = await Resources.findByPk(id);
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    // Update fields if provided
    const updateData = {};
    
    if (ram !== undefined) updateData.ram = parseInt(ram);
    if (disk !== undefined) updateData.disk = parseInt(disk);
    if (cpu !== undefined) updateData.cpu = parseInt(cpu);
    if (allocations !== undefined) updateData.allocations = parseInt(allocations);
    if (databases !== undefined) updateData.databases = parseInt(databases);
    if (slots !== undefined) updateData.slots = parseInt(slots);
    if (coins !== undefined) updateData.coins = parseInt(coins);

    await resource.update(updateData);

    res.json({
      success: true,
      message: "Resource updated successfully",
      data: resource
    });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update resource",
      error: error.message
    });
  }
});

// PATCH /resources/:id - Partial update resource (Admin only)
router.patch("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const resource = await Resources.findByPk(id);
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    // Convert numeric fields
    const numericFields = ['ram', 'disk', 'cpu', 'allocations', 'databases', 'slots', 'coins'];
    const updateData = {};
    
    Object.keys(updates).forEach(key => {
      if (numericFields.includes(key) && updates[key] !== undefined) {
        updateData[key] = parseInt(updates[key]);
      }
    });

    await resource.update(updateData);

    res.json({
      success: true,
      message: "Resource updated successfully",
      data: resource
    });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update resource",
      error: error.message
    });
  }
});

// DELETE /resources/:id - Delete resource (Admin only)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const resource = await Resources.findByPk(id);
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    await resource.destroy();

    res.json({
      success: true,
      message: "Resource deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete resource",
      error: error.message
    });
  }
});

// GET /resources/stats - Get resource statistics (Admin only)
router.get("/stats/summary", verifyToken, requireAdmin, async (req, res) => {
  try {
    const totalResources = await Resources.count();
    
    const stats = await Resources.findOne({
      attributes: [
        [Resources.sequelize.fn('AVG', Resources.sequelize.col('ram')), 'avgRam'],
        [Resources.sequelize.fn('SUM', Resources.sequelize.col('ram')), 'totalRam'],
        [Resources.sequelize.fn('AVG', Resources.sequelize.col('disk')), 'avgDisk'],
        [Resources.sequelize.fn('SUM', Resources.sequelize.col('disk')), 'totalDisk'],
        [Resources.sequelize.fn('AVG', Resources.sequelize.col('cpu')), 'avgCpu'],
        [Resources.sequelize.fn('SUM', Resources.sequelize.col('cpu')), 'totalCpu'],
        [Resources.sequelize.fn('SUM', Resources.sequelize.col('coins')), 'totalCoins']
      ]
    });

    res.json({
      success: true,
      data: {
        totalResources,
        statistics: {
          ram: {
            average: Math.round(parseFloat(stats.dataValues.avgRam) || 0),
            total: parseInt(stats.dataValues.totalRam) || 0
          },
          disk: {
            average: Math.round(parseFloat(stats.dataValues.avgDisk) || 0),
            total: parseInt(stats.dataValues.totalDisk) || 0
          },
          cpu: {
            average: Math.round(parseFloat(stats.dataValues.avgCpu) || 0),
            total: parseInt(stats.dataValues.totalCpu) || 0
          },
          coins: {
            total: parseInt(stats.dataValues.totalCoins) || 0
          }
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch resource statistics",
      error: error.message
    });
  }
});

export default router;