import jwt from "jsonwebtoken";
import { asyncHandler, ErrorResponse } from "./errorHandler.js";
import User from "../models/User.js";

// Protect routes - require authentication
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(" ")[1];
  }
  // Check for token in x-auth-token header
  else if (req.headers["x-auth-token"]) {
    token = req.headers["x-auth-token"];
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select("+password");

    if (!user) {
      return next(new ErrorResponse("No user found with this token", 401));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new ErrorResponse("User account is deactivated", 401));
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    req.user = user;
    next();
  } catch (err) {
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }
});

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

// Check if user is approved (for vendors and waiters)
export const checkApproval = asyncHandler(async (req, res, next) => {
  if (!req.user.isApproved) {
    return next(new ErrorResponse("Account is pending approval", 403));
  }
  next();
});

// Optional auth - doesn't fail if no token provided
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.headers["x-auth-token"]) {
    token = req.headers["x-auth-token"];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (user && user.isActive) {
        req.user = user;
      }
    } catch (err) {
      // Token invalid, but continue without user
    }
  }

  next();
});

// Check if user owns the resource or is admin
export const checkOwnership = (Model, paramName = "id") => {
  return asyncHandler(async (req, res, next) => {
    const resource = await Model.findById(req.params[paramName]);

    if (!resource) {
      return next(new ErrorResponse("Resource not found", 404));
    }

    // Check if user owns the resource or is admin
    if (
      resource.user &&
      resource.user.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return next(
        new ErrorResponse("Not authorized to access this resource", 403)
      );
    }

    // For direct user resources
    if (
      resource._id &&
      resource._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return next(
        new ErrorResponse("Not authorized to access this resource", 403)
      );
    }

    req.resource = resource;
    next();
  });
};

// Rate limiting for sensitive operations
export const sensitiveOpLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: "Too many attempts, please try again later",
  },
};

// Validate email verification
export const requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return next(
      new ErrorResponse("Please verify your email address first", 403)
    );
  }
  next();
};
