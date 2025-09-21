import crypto from "crypto";
import { asyncHandler, ErrorResponse } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import Waiter from "../models/Waiter.js";
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from "../utils/emailService.js";

// Register user
export const register = asyncHandler(async (req, res, next) => {
  const {
    firstName,
    middleName,
    lastName,
    email,
    phone,
    password,
    role,
    dateOfBirth,
    gender,
    maritalStatus,
    stateOfOrigin,
    lga,
    address,
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { phone }],
  });

  if (existingUser) {
    if (existingUser.email === email) {
      return next(new ErrorResponse("Email already registered", 400));
    }
    if (existingUser.phone === phone) {
      return next(new ErrorResponse("Phone number already registered", 400));
    }
  }

  // Create user
  const user = await User.create({
    firstName,
    middleName,
    lastName,
    email,
    phone,
    password,
    role,
    dateOfBirth,
    gender,
    maritalStatus,
    stateOfOrigin,
    lga,
    address,
  });

  // Create role-specific profile
  if (role === "vendor") {
    await Vendor.create({
      user: user._id,
      businessName: `${firstName} ${lastName} Services`, // Default name
      businessDescription: "Professional event services provider",
      categories: [], // Will be updated later by user
      priceRange: { min: 0, max: 0 }, // Will be updated later
    });
  } else if (role === "waiter") {
    await Waiter.create({
      user: user._id,
      expertise: [], // Will be updated later
      yearsOfExperience: 0,
      hourlyRate: 0, // Will be updated later
    });
  }

  // Send welcome email (don't fail registration if email fails)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      await sendWelcomeEmail(user);
      console.log("✅ Welcome email sent successfully");
    } catch (error) {
      console.error("❌ Failed to send welcome email:", error.message);
      // Don't fail registration if email fails
    }
  } else {
    console.log("⚠️ Email credentials not configured, skipping welcome email");
  }

  // Generate token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  res
    .status(201)
    .cookie("token", token, options)
    .json({
      success: true,
      message: "Registration successful",
      token,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isApproved: user.isApproved,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
});

// Login user
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user with password field
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // Check if account is active
  if (!user.isActive) {
    return next(new ErrorResponse("Account has been deactivated", 401));
  }

  // Update last login
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res, "Login successful");
});

// Logout user
export const logout = asyncHandler(async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
    data: {},
  });
});

// Get current logged in user
export const getMe = asyncHandler(async (req, res, next) => {
  let userData = {
    id: req.user._id,
    firstName: req.user.firstName,
    middleName: req.user.middleName,
    lastName: req.user.lastName,
    fullName: req.user.fullName,
    email: req.user.email,
    phone: req.user.phone,
    role: req.user.role,
    dateOfBirth: req.user.dateOfBirth,
    gender: req.user.gender,
    maritalStatus: req.user.maritalStatus,
    stateOfOrigin: req.user.stateOfOrigin,
    lga: req.user.lga,
    address: req.user.address,
    profilePicture: req.user.profilePicture,
    isActive: req.user.isActive,
    isApproved: req.user.isApproved,
    isEmailVerified: req.user.isEmailVerified,
    lastLogin: req.user.lastLogin,
    createdAt: req.user.createdAt,
  };

  // Get role-specific profile data
  if (req.user.role === "vendor") {
    const vendorProfile = await Vendor.findOne({ user: req.user._id });
    if (vendorProfile) {
      userData.vendorProfile = vendorProfile;
    }
  } else if (req.user.role === "waiter") {
    const waiterProfile = await Waiter.findOne({ user: req.user._id });
    if (waiterProfile) {
      userData.waiterProfile = waiterProfile;
    }
  }

  res.status(200).json({
    success: true,
    data: { user: userData },
  });
});

// Update user profile
export const updateProfile = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    firstName: req.body.firstName,
    middleName: req.body.middleName,
    lastName: req.body.lastName,
    phone: req.body.phone,
    dateOfBirth: req.body.dateOfBirth,
    gender: req.body.gender,
    maritalStatus: req.body.maritalStatus,
    stateOfOrigin: req.body.stateOfOrigin,
    lga: req.body.lga,
    address: req.body.address,
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach((key) => {
    if (fieldsToUpdate[key] === undefined) {
      delete fieldsToUpdate[key];
    }
  });

  // Check if phone number is already taken by another user
  if (req.body.phone && req.body.phone !== req.user.phone) {
    const existingUser = await User.findOne({
      phone: req.body.phone,
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      return next(new ErrorResponse("Phone number already in use", 400));
    }
  }

  const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: { user },
  });
});

// Forgot password
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorResponse("There is no user with that email", 404));
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      await sendPasswordResetEmail(user, resetToken);
      console.log("✅ Password reset email sent successfully");

      res.status(200).json({
        success: true,
        message: "Password reset email sent",
      });
    } catch (err) {
      console.error("❌ Password reset email failed:", err.message);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new ErrorResponse("Email could not be sent", 500));
    }
  } else {
    console.log("⚠️ Email credentials not configured");
    res.status(200).json({
      success: true,
      message: "Password reset token generated (email not configured)",
      resetToken, // Only show token in development when email is not configured
    });
  }
});

// Reset password
export const resetPassword = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resettoken)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse("Invalid or expired token", 400));
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  sendTokenResponse(user, 200, res, "Password reset successful");
});

// Update password
export const updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse("Current password is incorrect", 401));
  }

  // Check if new password is different from current
  if (await user.matchPassword(req.body.newPassword)) {
    return next(
      new ErrorResponse(
        "New password must be different from current password",
        400
      )
    );
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res, "Password updated successfully");
});

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res, message) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      message,
      token,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isApproved: user.isApproved,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
};
