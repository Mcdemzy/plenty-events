import express from "express";
import { query, param } from "express-validator";
import {
  getAllUsers,
  getAllVendors,
  getAllWaiters,
  getUserById,
  approveUser,
  deactivateUser,
  deleteUser,
  getDashboardStats,
  getPlatformAnalytics,
} from "../controllers/adminController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validationHandler } from "../middleware/errorHandler.js";

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize("admin"));

// Validation rules
const listValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("search")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters"),

  query("status")
    .optional()
    .isIn(["active", "inactive", "pending", "approved"])
    .withMessage("Invalid status filter"),

  query("role")
    .optional()
    .isIn(["user", "vendor", "waiter", "admin"])
    .withMessage("Invalid role filter"),

  query("sortBy")
    .optional()
    .isIn(["name", "email", "createdAt", "lastLogin", "rating"])
    .withMessage("Invalid sort field"),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Order must be asc or desc"),
];

const userIdValidation = [
  param("id").isMongoId().withMessage("Invalid user ID"),
];

// Dashboard and analytics routes
router.get("/dashboard", getDashboardStats);
router.get("/analytics", getPlatformAnalytics);

// User management routes
router.get("/users", listValidation, validationHandler, getAllUsers);
router.get("/vendors", listValidation, validationHandler, getAllVendors);
router.get("/waiters", listValidation, validationHandler, getAllWaiters);

// Individual user management
router.get("/users/:id", userIdValidation, validationHandler, getUserById);
router.put(
  "/users/:id/approve",
  userIdValidation,
  validationHandler,
  approveUser
);
router.put(
  "/users/:id/deactivate",
  userIdValidation,
  validationHandler,
  deactivateUser
);
router.delete("/users/:id", userIdValidation, validationHandler, deleteUser);

export default router;
