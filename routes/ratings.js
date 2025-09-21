import express from "express";
import { param, query } from "express-validator";
import {
  getVendorRatings,
  getWaiterRatings,
  getRatingById,
  deleteRating,
  reportRating,
  respondToRating,
} from "../controllers/ratingController.js";
import { protect, authorize, optionalAuth } from "../middleware/auth.js";
import { validationHandler } from "../middleware/errorHandler.js";

const router = express.Router();

// Validation rules
const ratingIdValidation = [
  param("id").isMongoId().withMessage("Invalid rating ID"),
];

const vendorIdValidation = [
  param("vendorId").isMongoId().withMessage("Invalid vendor ID"),
];

const waiterIdValidation = [
  param("waiterId").isMongoId().withMessage("Invalid waiter ID"),
];

const listValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),

  query("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating filter must be between 1 and 5"),

  query("sortBy")
    .optional()
    .isIn(["date", "rating", "helpful"])
    .withMessage("Sort by must be date, rating, or helpful"),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Order must be asc or desc"),
];

// Public routes - get ratings
router.get(
  "/vendor/:vendorId",
  vendorIdValidation,
  listValidation,
  validationHandler,
  getVendorRatings
);
router.get(
  "/waiter/:waiterId",
  waiterIdValidation,
  listValidation,
  validationHandler,
  getWaiterRatings
);

// Protected routes
router.use(protect);

// Get single rating details
router.get("/:id", ratingIdValidation, validationHandler, getRatingById);

// Rating management
router.delete("/:id", ratingIdValidation, validationHandler, deleteRating);
router.post("/:id/report", ratingIdValidation, validationHandler, reportRating);

// Vendor/Waiter can respond to their ratings
router.post(
  "/:id/respond",
  authorize("vendor", "waiter"),
  ratingIdValidation,
  validationHandler,
  respondToRating
);

export default router;
