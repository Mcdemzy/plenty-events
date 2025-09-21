import { asyncHandler, ErrorResponse } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import Waiter from "../models/Waiter.js";
import { Order, Job } from "../models/Booking.js";
import Rating from "../models/Rating.js";
import { sendAccountApprovalEmail } from "../utils/emailService.js";

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
export const getDashboardStats = asyncHandler(async (req, res, next) => {
  // Get user counts
  const userCounts = await User.aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
        active: { $sum: { $cond: ["$isActive", 1, 0] } },
        approved: { $sum: { $cond: ["$isApproved", 1, 0] } },
      },
    },
  ]);

  // Get booking stats
  const bookingStats = await Order.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalValue: { $sum: "$quotedPrice" },
      },
    },
  ]);

  // Get job stats
  const jobStats = await Job.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalValue: { $sum: "$totalAmount" },
      },
    },
  ]);

  // Get recent activities (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const recentUsers = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo },
  });

  const recentBookings = await Order.countDocuments({
    createdAt: { $gte: thirtyDaysAgo },
  });

  const recentJobs = await Job.countDocuments({
    createdAt: { $gte: thirtyDaysAgo },
  });

  // Get pending approvals
  const pendingApprovals = await User.countDocuments({
    role: { $in: ["vendor", "waiter"] },
    isApproved: false,
    isActive: true,
  });

  // Get top rated vendors and waiters
  const topVendors = await Vendor.find()
    .populate("user", "firstName lastName")
    .sort({ averageRating: -1, totalRatings: -1 })
    .limit(5);

  const topWaiters = await Waiter.find()
    .populate("user", "firstName lastName")
    .sort({ averageRating: -1, totalRatings: -1 })
    .limit(5);

  res.status(200).json({
    success: true,
    data: {
      userCounts,
      bookingStats,
      jobStats,
      recentActivity: {
        newUsers: recentUsers,
        newBookings: recentBookings,
        newJobs: recentJobs,
      },
      pendingApprovals,
      topPerformers: {
        vendors: topVendors,
        waiters: topWaiters,
      },
    },
  });
});

// @desc    Get platform analytics
// @route   GET /api/admin/analytics
// @access  Private (Admin only)
export const getPlatformAnalytics = asyncHandler(async (req, res, next) => {
  // Monthly user registrations for the last 12 months
  const monthlyRegistrations = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          role: "$role",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  // Monthly bookings and revenue
  const monthlyBookings = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        bookings: { $sum: 1 },
        revenue: { $sum: "$quotedPrice" },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  // Platform usage statistics
  const platformStats = {
    totalRevenue: await Order.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$quotedPrice" } } },
    ]),
    totalJobs: await Job.countDocuments(),
    totalRatings: await Rating.countDocuments(),
    averagePlatformRating: await Rating.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]),
  };

  res.status(200).json({
    success: true,
    data: {
      monthlyRegistrations,
      monthlyBookings,
      platformStats: {
        totalRevenue: platformStats.totalRevenue[0]?.total || 0,
        totalJobs: platformStats.totalJobs,
        totalRatings: platformStats.totalRatings,
        averagePlatformRating:
          platformStats.averagePlatformRating[0]?.avgRating || 0,
      },
    },
  });
});

// @desc    Get all users with filtering and pagination
// @route   GET /api/admin/users
// @access  Private (Admin only)
export const getAllUsers = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  // Build query
  let query = {};

  // Filter by role
  if (req.query.role) {
    query.role = req.query.role;
  }

  // Filter by status
  if (req.query.status) {
    switch (req.query.status) {
      case "active":
        query.isActive = true;
        break;
      case "inactive":
        query.isActive = false;
        break;
      case "pending":
        query.isApproved = false;
        break;
      case "approved":
        query.isApproved = true;
        break;
    }
  }

  // Search functionality
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    query.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
    ];
  }

  // Build sort object
  let sort = {};
  if (req.query.sortBy) {
    const sortBy = req.query.sortBy;
    const order = req.query.order === "desc" ? -1 : 1;

    switch (sortBy) {
      case "name":
        sort.firstName = order;
        break;
      case "email":
        sort.email = order;
        break;
      case "lastLogin":
        sort.lastLogin = order;
        break;
      case "createdAt":
      default:
        sort.createdAt = order;
        break;
    }
  } else {
    sort = { createdAt: -1 };
  }

  // Execute query
  const users = await User.find(query)
    .select("-password")
    .sort(sort)
    .skip(startIndex)
    .limit(limit);

  const total = await User.countDocuments(query);

  // Pagination
  const pagination = {};
  if (startIndex + limit < total) {
    pagination.next = { page: page + 1, limit };
  }
  if (startIndex > 0) {
    pagination.prev = { page: page - 1, limit };
  }

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    pagination,
    data: users,
  });
});

// @desc    Get all vendors with their profiles
// @route   GET /api/admin/vendors
// @access  Private (Admin only)
export const getAllVendors = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  // Build query
  let query = {};

  // Search functionality
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    query.$or = [
      { businessName: searchRegex },
      { businessDescription: searchRegex },
    ];
  }

  // Filter by verification status
  if (req.query.status === "verified") {
    query.isVerified = true;
  } else if (req.query.status === "unverified") {
    query.isVerified = false;
  }

  // Build sort
  let sort = {};
  if (req.query.sortBy === "rating") {
    sort.averageRating = req.query.order === "asc" ? 1 : -1;
  } else {
    sort.createdAt = -1;
  }

  // Execute query
  const vendors = await Vendor.find(query)
    .populate({
      path: "user",
      select:
        "firstName lastName email phone isActive isApproved createdAt lastLogin",
    })
    .populate({
      path: "categories",
      select: "name",
    })
    .sort(sort)
    .skip(startIndex)
    .limit(limit);

  const total = await Vendor.countDocuments(query);

  // Pagination
  const pagination = {};
  if (startIndex + limit < total) {
    pagination.next = { page: page + 1, limit };
  }
  if (startIndex > 0) {
    pagination.prev = { page: page - 1, limit };
  }

  res.status(200).json({
    success: true,
    count: vendors.length,
    total,
    pagination,
    data: vendors,
  });
});

// @desc    Get all waiters with their profiles
// @route   GET /api/admin/waiters
// @access  Private (Admin only)
export const getAllWaiters = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  // Build query
  let query = {};

  // Search functionality
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    // Note: We can't directly search user fields in Waiter model
    // This would require a more complex aggregation pipeline
  }

  // Filter by verification status
  if (req.query.status === "verified") {
    query.isVerified = true;
  } else if (req.query.status === "unverified") {
    query.isVerified = false;
  }

  // Build sort
  let sort = {};
  if (req.query.sortBy === "rating") {
    sort.averageRating = req.query.order === "asc" ? 1 : -1;
  } else {
    sort.createdAt = -1;
  }

  // Execute query
  const waiters = await Waiter.find(query)
    .populate({
      path: "user",
      select:
        "firstName lastName email phone isActive isApproved createdAt lastLogin",
    })
    .populate({
      path: "expertise",
      select: "name",
    })
    .sort(sort)
    .skip(startIndex)
    .limit(limit);

  const total = await Waiter.countDocuments(query);

  // Pagination
  const pagination = {};
  if (startIndex + limit < total) {
    pagination.next = { page: page + 1, limit };
  }
  if (startIndex > 0) {
    pagination.prev = { page: page - 1, limit };
  }

  res.status(200).json({
    success: true,
    count: waiters.length,
    total,
    pagination,
    data: waiters,
  });
});

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
export const getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  // Get role-specific profile
  let profile = null;
  if (user.role === "vendor") {
    profile = await Vendor.findOne({ user: user._id }).populate("categories");
  } else if (user.role === "waiter") {
    profile = await Waiter.findOne({ user: user._id }).populate("expertise");
  }

  // Get user's activity stats
  let activityStats = {};
  if (user.role === "user") {
    activityStats = {
      totalBookings: await Order.countDocuments({ user: user._id }),
      completedBookings: await Order.countDocuments({
        user: user._id,
        status: "completed",
      }),
      ratingsGiven: await Rating.countDocuments({ reviewer: user._id }),
    };
  } else if (user.role === "vendor") {
    activityStats = {
      totalOrders: await Order.countDocuments({ vendor: profile?._id }),
      completedOrders: await Order.countDocuments({
        vendor: profile?._id,
        status: "completed",
      }),
      totalJobs: await Job.countDocuments({ vendor: profile?._id }),
    };
  } else if (user.role === "waiter") {
    activityStats = {
      totalJobs: await Job.countDocuments({ waiter: profile?._id }),
      completedJobs: await Job.countDocuments({
        waiter: profile?._id,
        status: "completed",
      }),
      ratingsReceived: await Rating.countDocuments({ waiter: profile?._id }),
    };
  }

  res.status(200).json({
    success: true,
    data: {
      user,
      profile,
      activityStats,
    },
  });
});

// @desc    Approve user account
// @route   PUT /api/admin/users/:id/approve
// @access  Private (Admin only)
export const approveUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  if (user.isApproved) {
    return next(new ErrorResponse("User is already approved", 400));
  }

  // Approve user
  user.isApproved = true;
  await user.save();

  // Send approval email (don't fail approval if email fails)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      await sendAccountApprovalEmail(user);
      console.log("✅ Approval email sent successfully");
    } catch (error) {
      console.error("❌ Failed to send approval email:", error.message);
      // Don't fail the approval if email fails
    }
  } else {
    console.log("⚠️ Email credentials not configured, skipping approval email");
  }

  res.status(200).json({
    success: true,
    message: "User approved successfully",
    data: user,
  });
});

// @desc    Deactivate user account
// @route   PUT /api/admin/users/:id/deactivate
// @access  Private (Admin only)
export const deactivateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  // Toggle active status
  user.isActive = !user.isActive;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
    data: user,
  });
});

// @desc    Delete user account
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  // Don't allow deleting admin users
  if (user.role === "admin") {
    return next(new ErrorResponse("Cannot delete admin users", 403));
  }

  // Delete related profiles and data
  if (user.role === "vendor") {
    const vendor = await Vendor.findOne({ user: user._id });
    if (vendor) {
      // Delete related orders and jobs
      await Order.deleteMany({ vendor: vendor._id });
      await Job.deleteMany({ vendor: vendor._id });
      await Rating.deleteMany({ vendor: vendor._id });
      await Vendor.findByIdAndDelete(vendor._id);
    }
  } else if (user.role === "waiter") {
    const waiter = await Waiter.findOne({ user: user._id });
    if (waiter) {
      // Delete related jobs and ratings
      await Job.deleteMany({ waiter: waiter._id });
      await Rating.deleteMany({ waiter: waiter._id });
      await Waiter.findByIdAndDelete(waiter._id);
    }
  } else if (user.role === "user") {
    // Delete user's orders and ratings
    await Order.deleteMany({ user: user._id });
    await Rating.deleteMany({ reviewer: user._id });
  }

  // Delete the user
  await User.findByIdAndDelete(user._id);

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});
