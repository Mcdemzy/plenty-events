import express from "express";
import { body, query } from "express-validator";
import {
  getVendors,
  getVendor,
  updateVendorProfile,
  rateVendor,
  hireVendor,
  getVendorOrders,
  getVendorOrder,
  updateOrderStatus,
  getVendorStats,
  uploadPortfolioImages,
} from "../controllers/vendorController.js";
import {
  protect,
  authorize,
  checkApproval,
  optionalAuth,
} from "../middleware/auth.js";
import { validationHandler } from "../middleware/errorHandler.js";

const router = express.Router();

// Validation rules
const vendorProfileValidation = [
  body("businessName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Business name must be between 2 and 100 characters"),

  body("businessDescription")
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Business description must be between 10 and 1000 characters"),

  body("categories")
    .optional()
    .isArray({ min: 1 })
    .withMessage("At least one category is required"),

  body("categories.*").isMongoId().withMessage("Invalid category ID"),

  body("priceRange.min")
    .optional()
    .isNumeric()
    .withMessage("Minimum price must be a number")
    .isFloat({ min: 0 })
    .withMessage("Minimum price cannot be negative"),

  body("priceRange.max")
    .optional()
    .isNumeric()
    .withMessage("Maximum price must be a number")
    .isFloat({ min: 0 })
    .withMessage("Maximum price cannot be negative"),

  body("location.coordinates")
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage("Coordinates must be an array of [longitude, latitude]"),

  body("location.coordinates.*")
    .isFloat()
    .withMessage("Coordinates must be valid numbers"),

  body("yearsOfExperience")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Years of experience must be a positive integer"),

  body("website")
    .optional()
    .isURL()
    .withMessage("Please provide a valid website URL"),

  body("socialMedia.instagram")
    .optional()
    .isURL()
    .withMessage("Please provide a valid Instagram URL"),

  body("socialMedia.facebook")
    .optional()
    .isURL()
    .withMessage("Please provide a valid Facebook URL"),

  body("socialMedia.twitter")
    .optional()
    .isURL()
    .withMessage("Please provide a valid Twitter URL"),

  body("serviceAreas")
    .optional()
    .isArray()
    .withMessage("Service areas must be an array"),

  body("serviceAreas.*")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Each service area must be between 2 and 50 characters"),
];

const ratingValidation = [
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("review")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Review cannot be more than 500 characters"),

  body("breakdown.quality")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Quality rating must be between 1 and 5"),

  body("breakdown.punctuality")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Punctuality rating must be between 1 and 5"),

  body("breakdown.communication")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Communication rating must be between 1 and 5"),

  body("breakdown.value")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Value rating must be between 1 and 5"),

  body("breakdown.professionalism")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Professionalism rating must be between 1 and 5"),
];

const hireValidation = [
  body("eventType").isMongoId().withMessage("Invalid event type ID"),

  body("eventTitle")
    .trim()
    .notEmpty()
    .withMessage("Event title is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Event title must be between 3 and 100 characters"),

  body("eventDescription")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Event description cannot be more than 1000 characters"),

  body("eventDate")
    .isISO8601()
    .withMessage("Please provide a valid event date")
    .custom((value) => {
      const eventDate = new Date(value);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (eventDate < now) {
        throw new Error("Event date cannot be in the past");
      }
      return true;
    }),

  body("startTime")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Start time must be in HH:MM format"),

  body("endTime")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("End time must be in HH:MM format")
    .custom((endTime, { req }) => {
      const start = req.body.startTime;
      if (start && endTime <= start) {
        throw new Error("End time must be after start time");
      }
      return true;
    }),

  body("guestCount")
    .isInt({ min: 1 })
    .withMessage("Guest count must be at least 1"),

  body("quotedPrice")
    .isNumeric()
    .withMessage("Quoted price must be a number")
    .isFloat({ min: 0 })
    .withMessage("Quoted price cannot be negative"),

  body("venue.name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Venue name cannot be more than 100 characters"),

  body("venue.address.street")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Street address cannot be more than 100 characters"),

  body("venue.address.city")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("City cannot be more than 50 characters"),

  body("specialRequests")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Special requests cannot be more than 1000 characters"),
];

const listValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating filter must be between 1 and 5"),

  query("category").optional().isMongoId().withMessage("Invalid category ID"),

  query("location")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Location must be between 2 and 50 characters"),

  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum price must be a positive number"),

  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum price must be a positive number"),

  query("sortBy")
    .optional()
    .isIn(["rating", "price", "date", "popular"])
    .withMessage("Sort by must be rating, price, date, or popular"),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Order must be asc or desc"),
];

// Public routes
router.get("/", listValidation, validationHandler, optionalAuth, getVendors);
router.get("/:id", getVendor);

// Protected routes - require authentication
router.use(protect);

// User routes - rate and hire vendors
router.post(
  "/:id/rate",
  authorize("user"),
  ratingValidation,
  validationHandler,
  rateVendor
);
router.post(
  "/:id/hire",
  authorize("user"),
  hireValidation,
  validationHandler,
  hireVendor
);

// Vendor routes - manage profile and orders
router.put(
  "/profile",
  authorize("vendor"),
  checkApproval,
  vendorProfileValidation,
  validationHandler,
  updateVendorProfile
);
router.post(
  "/portfolio/upload",
  authorize("vendor"),
  checkApproval,
  uploadPortfolioImages
);
router.get("/orders/stats", authorize("vendor"), checkApproval, getVendorStats);
router.get("/orders", authorize("vendor"), checkApproval, getVendorOrders);
router.get(
  "/orders/:orderId",
  authorize("vendor"),
  checkApproval,
  getVendorOrder
);
router.put(
  "/orders/:orderId",
  authorize("vendor"),
  checkApproval,
  [
    body("status")
      .isIn(["pending", "confirmed", "in-progress", "completed", "cancelled"])
      .withMessage("Invalid status"),
  ],
  validationHandler,
  updateOrderStatus
);

export default router;
