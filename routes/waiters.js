import express from "express";
import { body, query } from "express-validator";
import {
  getWaiters,
  getWaiter,
  updateWaiterProfile,
  rateWaiter,
  hireWaiter,
  getWaiterJobs,
  getWaiterJob,
  updateJobStatus,
  getWaiterStats,
  uploadWaiterDocuments,
} from "../controllers/waiterController.js";
import {
  protect,
  authorize,
  checkApproval,
  optionalAuth,
} from "../middleware/auth.js";
import { validationHandler } from "../middleware/errorHandler.js";

const router = express.Router();

// Validation rules
const waiterProfileValidation = [
  body("expertise")
    .optional()
    .isArray({ min: 1 })
    .withMessage("At least one expertise area is required"),

  body("expertise.*").isMongoId().withMessage("Invalid expertise ID"),

  body("yearsOfExperience")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Years of experience must be a positive integer"),

  body("hourlyRate")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Hourly rate must be a positive number"),

  body("dailyRate")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Daily rate must be a positive number"),

  body("location.coordinates")
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage("Coordinates must be an array of [longitude, latitude]"),

  body("skills").optional().isArray().withMessage("Skills must be an array"),

  body("skills.*")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Each skill must be between 2 and 50 characters"),

  body("serviceAreas")
    .optional()
    .isArray()
    .withMessage("Service areas must be an array"),

  body("serviceAreas.*")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Each service area must be between 2 and 50 characters"),

  // Application details validation
  body("applicationDetails.highestEducation")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Education cannot be more than 100 characters"),

  body("applicationDetails.hasWorkedAsBefore")
    .optional()
    .isBoolean()
    .withMessage("Has worked as before must be true or false"),

  body("applicationDetails.previousExperience")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Previous experience cannot be more than 500 characters"),

  body("applicationDetails.hasHospitalityTraining")
    .optional()
    .isBoolean()
    .withMessage("Has hospitality training must be true or false"),

  body("applicationDetails.nextOfKin.name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Next of kin name must be between 2 and 100 characters"),

  body("applicationDetails.nextOfKin.relationship")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Relationship must be between 2 and 50 characters"),

  body("applicationDetails.nextOfKin.phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number for next of kin"),

  body("applicationDetails.guarantor.fullName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Guarantor name must be between 2 and 100 characters"),

  body("applicationDetails.guarantor.email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email for guarantor"),

  body("applicationDetails.guarantor.phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number for guarantor"),
];

const ratingValidation = [
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("attitudeRating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Attitude rating must be between 1 and 5"),

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

  body("breakdown.professionalism")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Professionalism rating must be between 1 and 5"),
];

const hireValidation = [
  body("position")
    .trim()
    .notEmpty()
    .withMessage("Position is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Position must be between 2 and 50 characters"),

  body("workDate")
    .isISO8601()
    .withMessage("Please provide a valid work date")
    .custom((value) => {
      const workDate = new Date(value);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (workDate < now) {
        throw new Error("Work date cannot be in the past");
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

  body("hourlyRate")
    .isFloat({ min: 0 })
    .withMessage("Hourly rate must be a positive number"),

  body("responsibilities")
    .optional()
    .isArray()
    .withMessage("Responsibilities must be an array"),

  body("responsibilities.*")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Each responsibility must be between 2 and 100 characters"),

  body("instructions")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Instructions cannot be more than 1000 characters"),
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

  query("expertise").optional().isMongoId().withMessage("Invalid expertise ID"),

  query("location")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Location must be between 2 and 50 characters"),

  query("minRate")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum rate must be a positive number"),

  query("maxRate")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum rate must be a positive number"),

  query("sortBy")
    .optional()
    .isIn(["rating", "rate", "experience", "date"])
    .withMessage("Sort by must be rating, rate, experience, or date"),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Order must be asc or desc"),
];

// Public routes
router.get("/", listValidation, validationHandler, optionalAuth, getWaiters);
router.get("/:id", getWaiter);

// Protected routes - require authentication
router.use(protect);

// Vendor routes - rate and hire waiters
router.post(
  "/:id/rate",
  authorize("vendor"),
  ratingValidation,
  validationHandler,
  rateWaiter
);
router.post(
  "/:id/hire",
  authorize("vendor"),
  checkApproval,
  hireValidation,
  validationHandler,
  hireWaiter
);

// Waiter routes - manage profile and jobs
router.put(
  "/profile",
  authorize("waiter"),
  waiterProfileValidation,
  validationHandler,
  updateWaiterProfile
);
router.post("/documents/upload", authorize("waiter"), uploadWaiterDocuments);
router.get("/jobs/stats", authorize("waiter"), checkApproval, getWaiterStats);
router.get("/jobs", authorize("waiter"), checkApproval, getWaiterJobs);
router.get("/jobs/:jobId", authorize("waiter"), checkApproval, getWaiterJob);
router.put(
  "/jobs/:jobId",
  authorize("waiter"),
  checkApproval,
  [
    body("status")
      .isIn([
        "pending",
        "accepted",
        "declined",
        "in-progress",
        "completed",
        "cancelled",
      ])
      .withMessage("Invalid status"),
  ],
  validationHandler,
  updateJobStatus
);

export default router;
