import express from "express";
import { body } from "express-validator";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getExpertise,
  createExpertise,
  updateExpertise,
  deleteExpertise,
  getEventTypes,
  createEventType,
  updateEventType,
  deleteEventType,
} from "../controllers/referenceController.js";
import { protect, authorize } from "../middleware/auth.js";
import { validationHandler } from "../middleware/errorHandler.js";

const router = express.Router();

// Validation rules
const categoryValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Category name must be between 2 and 50 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Description cannot be more than 200 characters"),

  body("icon")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Icon cannot be more than 100 characters"),
];

const expertiseValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Expertise name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Expertise name must be between 2 and 50 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Description cannot be more than 200 characters"),

  body("icon")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Icon cannot be more than 100 characters"),
];

const eventTypeValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Event type name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Event type name must be between 2 and 50 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Description cannot be more than 200 characters"),

  body("icon")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Icon cannot be more than 100 characters"),

  body("suggestedVendorCategories")
    .optional()
    .isArray()
    .withMessage("Suggested vendor categories must be an array"),

  body("suggestedVendorCategories.*")
    .isMongoId()
    .withMessage("Invalid category ID"),
];

// Public routes - get reference data
router.get("/categories", getCategories);
router.get("/expertise", getExpertise);
router.get("/events", getEventTypes);

// Protected routes - admin only
router.use(protect);
router.use(authorize("admin"));

// Categories management
router.post(
  "/categories",
  categoryValidation,
  validationHandler,
  createCategory
);
router.put(
  "/categories/:id",
  categoryValidation,
  validationHandler,
  updateCategory
);
router.delete("/categories/:id", deleteCategory);

// Expertise management
router.post(
  "/expertise",
  expertiseValidation,
  validationHandler,
  createExpertise
);
router.put(
  "/expertise/:id",
  expertiseValidation,
  validationHandler,
  updateExpertise
);
router.delete("/expertise/:id", deleteExpertise);

// Event types management
router.post("/events", eventTypeValidation, validationHandler, createEventType);
router.put(
  "/events/:id",
  eventTypeValidation,
  validationHandler,
  updateEventType
);
router.delete("/events/:id", deleteEventType);

export default router;
