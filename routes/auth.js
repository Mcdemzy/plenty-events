import express from "express";
import { body } from "express-validator";
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  updatePassword,
} from "../controllers/authController.js";
import { protect, sensitiveOpLimit } from "../middleware/auth.js";
import { validationHandler } from "../middleware/errorHandler.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: "Too many authentication attempts, please try again later",
  },
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    error: "Too many password reset attempts, please try again later",
  },
});

// Validation rules
const registerValidation = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name can only contain letters and spaces"),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),

  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("phone")
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),

  body("role")
    .isIn(["user", "vendor", "waiter"])
    .withMessage("Role must be user, vendor, or waiter"),

  // Optional fields validation
  body("middleName")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Middle name cannot be more than 50 characters"),

  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid date of birth"),

  body("gender")
    .optional()
    .isIn(["Male", "Female", "Other"])
    .withMessage("Gender must be Male, Female, or Other"),

  body("maritalStatus")
    .optional()
    .isIn(["Single", "Married", "Divorced", "Widowed"])
    .withMessage("Invalid marital status"),

  body("stateOfOrigin")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("State of origin cannot be more than 50 characters"),

  body("lga")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("LGA cannot be more than 50 characters"),

  body("address.street")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Street address cannot be more than 100 characters"),

  body("address.city")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("City cannot be more than 50 characters"),

  body("address.state")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("State cannot be more than 50 characters"),

  body("address.country")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Country cannot be more than 50 characters"),

  body("address.zipCode")
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage("Zip code cannot be more than 10 characters"),
];

const loginValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),
];

const updateProfileValidation = [
  body("firstName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name can only contain letters and spaces"),

  body("lastName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Last name can only contain letters and spaces"),

  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),

  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid date of birth"),

  body("gender")
    .optional()
    .isIn(["Male", "Female", "Other"])
    .withMessage("Gender must be Male, Female, or Other"),

  body("maritalStatus")
    .optional()
    .isIn(["Single", "Married", "Divorced", "Widowed"])
    .withMessage("Invalid marital status"),
];

const forgotPasswordValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
];

const resetPasswordValidation = [
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
];

const updatePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
];

// Public routes
router.post(
  "/register",
  authLimiter,
  registerValidation,
  validationHandler,
  register
);
router.post("/login", authLimiter, loginValidation, validationHandler, login);
router.post(
  "/forgot-password",
  passwordResetLimiter,
  forgotPasswordValidation,
  validationHandler,
  forgotPassword
);
router.post(
  "/reset-password/:resettoken",
  resetPasswordValidation,
  validationHandler,
  resetPassword
);

// Protected routes
router.use(protect); // All routes after this middleware are protected

router.post("/logout", logout);
router.get("/profile", getMe);
router.put(
  "/profile",
  updateProfileValidation,
  validationHandler,
  updateProfile
);
router.put(
  "/update-password",
  updatePasswordValidation,
  validationHandler,
  updatePassword
);

export default router;
