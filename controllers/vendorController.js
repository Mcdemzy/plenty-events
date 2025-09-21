import { asyncHandler, ErrorResponse } from "../middleware/errorHandler.js";
import Vendor from "../models/Vendor.js";
import Rating from "../models/Rating.js";
import { Order } from "../models/Booking.js";
import { Category, EventType } from "../models/Reference.js";
import {
  sendBookingConfirmationEmail,
  sendNewBookingNotificationEmail,
} from "../utils/emailService.js";

// @desc    Get all vendors with filtering, sorting, and pagination
// @route   GET /api/vendors
// @access  Public
export const getVendors = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;
  const startIndex = (page - 1) * limit;

  // Build query object
  let query = { isVerified: true };
  const queryObj = { ...req.query };

  // Remove fields that are not for filtering
  const removeFields = ["page", "limit", "sortBy", "order", "search"];
  removeFields.forEach((param) => delete queryObj[param]);

  // Filter by category
  if (req.query.category) {
    query.categories = req.query.category;
  }

  // Filter by rating
  if (req.query.rating) {
    query.averageRating = { $gte: parseInt(req.query.rating) };
  }

  // Filter by location (city/state)
  if (req.query.location) {
    query.$or = [
      { "location.city": { $regex: req.query.location, $options: "i" } },
      { "location.state": { $regex: req.query.location, $options: "i" } },
      { serviceAreas: { $in: [new RegExp(req.query.location, "i")] } },
    ];
  }

  // Filter by price range
  if (req.query.minPrice || req.query.maxPrice) {
    query.$and = [];

    if (req.query.minPrice) {
      query.$and.push({
        "priceRange.min": { $gte: parseFloat(req.query.minPrice) },
      });
    }

    if (req.query.maxPrice) {
      query.$and.push({
        "priceRange.max": { $lte: parseFloat(req.query.maxPrice) },
      });
    }
  }

  // Search functionality
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    query.$or = [
      { businessName: searchRegex },
      { businessDescription: searchRegex },
      { "user.firstName": searchRegex },
      { "user.lastName": searchRegex },
    ];
  }

  // Build sort object
  let sort = {};
  if (req.query.sortBy) {
    const sortBy = req.query.sortBy;
    const order = req.query.order === "desc" ? -1 : 1;

    switch (sortBy) {
      case "rating":
        sort.averageRating = order;
        break;
      case "price":
        sort["priceRange.min"] = order;
        break;
      case "popular":
        sort.totalBookings = order;
        break;
      case "date":
      default:
        sort.createdAt = order;
        break;
    }
  } else {
    sort = { averageRating: -1, totalBookings: -1 };
  }

  try {
    // Execute query
    const vendors = await Vendor.find(query)
      .populate({
        path: "user",
        select: "firstName lastName profilePicture isActive",
      })
      .populate({
        path: "categories",
        select: "name icon",
      })
      .sort(sort)
      .skip(startIndex)
      .limit(limit);

    // Get total count for pagination
    const total = await Vendor.countDocuments(query);

    // Pagination result
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
  } catch (error) {
    return next(new ErrorResponse("Error fetching vendors", 500));
  }
});

// @desc    Get single vendor
// @route   GET /api/vendors/:id
// @access  Public
export const getVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id)
    .populate({
      path: "user",
      select: "firstName lastName email phone profilePicture createdAt",
    })
    .populate({
      path: "categories",
      select: "name icon description",
    });

  if (!vendor) {
    return next(new ErrorResponse("Vendor not found", 404));
  }

  // Get recent ratings
  const ratings = await Rating.find({ vendor: vendor._id })
    .populate({
      path: "reviewer",
      select: "firstName lastName profilePicture",
    })
    .sort({ createdAt: -1 })
    .limit(10);

  res.status(200).json({
    success: true,
    data: {
      vendor,
      ratings,
    },
  });
});

// @desc    Update vendor profile
// @route   PUT /api/vendors/profile
// @access  Private (Vendor only)
export const updateVendorProfile = asyncHandler(async (req, res, next) => {
  // Find vendor profile
  let vendor = await Vendor.findOne({ user: req.user._id });

  if (!vendor) {
    return next(new ErrorResponse("Vendor profile not found", 404));
  }

  // Validate price range
  if (req.body.priceRange) {
    const { min, max } = req.body.priceRange;
    if (min && max && min > max) {
      return next(
        new ErrorResponse(
          "Minimum price cannot be greater than maximum price",
          400
        )
      );
    }
  }

  // Update vendor profile
  vendor = await Vendor.findByIdAndUpdate(vendor._id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Vendor profile updated successfully",
    data: vendor,
  });
});

// @desc    Rate a vendor
// @route   POST /api/vendors/:id/rate
// @access  Private (User only)
export const rateVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id);

  if (!vendor) {
    return next(new ErrorResponse("Vendor not found", 404));
  }

  // Check if user has booked this vendor before
  const existingOrder = await Order.findOne({
    user: req.user._id,
    vendor: req.params.id,
    status: "completed",
  });

  if (!existingOrder) {
    return next(
      new ErrorResponse(
        "You can only rate vendors you have booked and completed services with",
        400
      )
    );
  }

  // Check if user has already rated this vendor for this order
  const existingRating = await Rating.findOne({
    reviewer: req.user._id,
    vendor: req.params.id,
    order: existingOrder._id,
  });

  if (existingRating) {
    return next(
      new ErrorResponse(
        "You have already rated this vendor for this booking",
        400
      )
    );
  }

  // Create rating
  const rating = await Rating.create({
    reviewer: req.user._id,
    vendor: req.params.id,
    order: existingOrder._id,
    rating: req.body.rating,
    review: req.body.review,
    breakdown: req.body.breakdown,
  });

  // Mark order as rated
  existingOrder.isRated = true;
  await existingOrder.save();

  res.status(201).json({
    success: true,
    message: "Rating added successfully",
    data: rating,
  });
});

// @desc    Hire a vendor (create booking)
// @route   POST /api/vendors/:id/hire
// @access  Private (User only)
export const hireVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id);

  if (!vendor) {
    return next(new ErrorResponse("Vendor not found", 404));
  }

  if (!vendor.isAvailable) {
    return next(
      new ErrorResponse("This vendor is currently not available", 400)
    );
  }

  // Check if event type exists
  const eventType = await EventType.findById(req.body.eventType);
  if (!eventType) {
    return next(new ErrorResponse("Invalid event type", 400));
  }

  // Create booking
  const booking = await Order.create({
    user: req.user._id,
    vendor: req.params.id,
    eventType: req.body.eventType,
    eventTitle: req.body.eventTitle,
    eventDescription: req.body.eventDescription,
    eventDate: req.body.eventDate,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    guestCount: req.body.guestCount,
    quotedPrice: req.body.quotedPrice,
    venue: req.body.venue,
    specialRequests: req.body.specialRequests,
    dietaryRequirements: req.body.dietaryRequirements,
  });

  // Update vendor's total bookings
  vendor.totalBookings += 1;
  await vendor.save();

  // Send emails (don't fail booking if emails fail)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      await Promise.all([
        sendBookingConfirmationEmail(req.user, booking, vendor),
        sendNewBookingNotificationEmail(vendor, booking, req.user),
      ]);
      console.log("✅ Booking emails sent successfully");
    } catch (error) {
      console.error("❌ Failed to send booking emails:", error.message);
      // Don't fail the booking if emails fail
    }
  } else {
    console.log("⚠️ Email credentials not configured, skipping booking emails");
  }

  res.status(201).json({
    success: true,
    message: "Booking created successfully",
    data: booking,
  });
});

// @desc    Get vendor orders
// @route   GET /api/vendors/orders
// @access  Private (Vendor only)
export const getVendorOrders = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOne({ user: req.user._id });

  if (!vendor) {
    return next(new ErrorResponse("Vendor profile not found", 404));
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Build query
  let query = { vendor: vendor._id };

  if (req.query.status) {
    query.status = req.query.status;
  }

  // Execute query
  const orders = await Order.find(query)
    .populate({
      path: "user",
      select: "firstName lastName email phone",
    })
    .populate({
      path: "eventType",
      select: "name icon",
    })
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  const total = await Order.countDocuments(query);

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
    count: orders.length,
    total,
    pagination,
    data: orders,
  });
});

// @desc    Get single vendor order
// @route   GET /api/vendors/orders/:orderId
// @access  Private (Vendor only)
export const getVendorOrder = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOne({ user: req.user._id });

  if (!vendor) {
    return next(new ErrorResponse("Vendor profile not found", 404));
  }

  const order = await Order.findOne({
    _id: req.params.orderId,
    vendor: vendor._id,
  })
    .populate({
      path: "user",
      select: "firstName lastName email phone",
    })
    .populate({
      path: "eventType",
      select: "name icon description",
    });

  if (!order) {
    return next(new ErrorResponse("Order not found", 404));
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});

// @desc    Update order status
// @route   PUT /api/vendors/orders/:orderId
// @access  Private (Vendor only)
export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOne({ user: req.user._id });

  if (!vendor) {
    return next(new ErrorResponse("Vendor profile not found", 404));
  }

  const order = await Order.findOne({
    _id: req.params.orderId,
    vendor: vendor._id,
  });

  if (!order) {
    return next(new ErrorResponse("Order not found", 404));
  }

  const { status } = req.body;

  // Validate status transitions
  const validTransitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["in-progress", "cancelled"],
    "in-progress": ["completed", "cancelled"],
    completed: [],
    cancelled: [],
    refunded: [],
  };

  if (!validTransitions[order.status].includes(status)) {
    return next(
      new ErrorResponse(
        `Cannot change status from ${order.status} to ${status}`,
        400
      )
    );
  }

  order.status = status;

  // Update vendor stats when order is completed
  if (status === "completed") {
    vendor.completedBookings += 1;
    await vendor.save();
  }

  await order.save();

  res.status(200).json({
    success: true,
    message: "Order status updated successfully",
    data: order,
  });
});

// @desc    Get vendor statistics
// @route   GET /api/vendors/orders/stats
// @access  Private (Vendor only)
export const getVendorStats = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOne({ user: req.user._id });

  if (!vendor) {
    return next(new ErrorResponse("Vendor profile not found", 404));
  }

  // Get order statistics
  const orderStats = await Order.aggregate([
    { $match: { vendor: vendor._id } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$quotedPrice" },
      },
    },
  ]);

  // Get monthly bookings for the last 12 months
  const monthlyBookings = await Order.aggregate([
    {
      $match: {
        vendor: vendor._id,
        createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
        revenue: { $sum: "$quotedPrice" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  // Get ratings summary
  const ratingsStats = await Rating.aggregate([
    { $match: { vendor: vendor._id } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalRatings: { $sum: 1 },
        fiveStars: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
        fourStars: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
        threeStars: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
        twoStars: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
        oneStar: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      vendor: {
        totalBookings: vendor.totalBookings,
        completedBookings: vendor.completedBookings,
        completionRate: vendor.completionRate,
        averageRating: vendor.averageRating,
        totalRatings: vendor.totalRatings,
      },
      orderStats,
      monthlyBookings,
      ratingsStats: ratingsStats[0] || {
        averageRating: 0,
        totalRatings: 0,
        fiveStars: 0,
        fourStars: 0,
        threeStars: 0,
        twoStars: 0,
        oneStar: 0,
      },
    },
  });
});

// @desc    Upload portfolio images
// @route   POST /api/vendors/portfolio/upload
// @access  Private (Vendor only)
export const uploadPortfolioImages = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOne({ user: req.user._id });

  if (!vendor) {
    return next(new ErrorResponse("Vendor profile not found", 404));
  }

  if (!req.files || !req.files.images) {
    return next(new ErrorResponse("Please upload images", 400));
  }

  const files = Array.isArray(req.files.images)
    ? req.files.images
    : [req.files.images];

  if (files.length > 10) {
    return next(
      new ErrorResponse("You can upload maximum 10 images at once", 400)
    );
  }

  // Validate file types and sizes
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const maxSize = 5 * 1024 * 1024; // 5MB

  for (const file of files) {
    if (!allowedTypes.includes(file.mimetype)) {
      return next(
        new ErrorResponse(
          "Only JPEG, JPG, PNG, and WebP images are allowed",
          400
        )
      );
    }

    if (file.size > maxSize) {
      return next(new ErrorResponse("Images must be less than 5MB", 400));
    }
  }

  try {
    // Here you would typically upload to cloud storage like Cloudinary
    // For now, we'll simulate the upload process
    const uploadedImages = [];

    for (const file of files) {
      // Simulate cloud upload
      const uploadResult = {
        public_id: `vendor_${vendor._id}_${Date.now()}_${Math.random()
          .toString(36)
          .substring(7)}`,
        url: `https://example.com/uploads/${file.name}`, // This would be the actual cloud URL
        caption: req.body.caption || "",
      };

      uploadedImages.push(uploadResult);
    }

    // Add to vendor's portfolio
    vendor.portfolio = vendor.portfolio || [];
    vendor.portfolio.push(...uploadedImages);

    // Keep only last 50 images
    if (vendor.portfolio.length > 50) {
      vendor.portfolio = vendor.portfolio.slice(-50);
    }

    await vendor.save();

    res.status(200).json({
      success: true,
      message: "Images uploaded successfully",
      data: {
        uploadedImages,
        totalPortfolioImages: vendor.portfolio.length,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return next(new ErrorResponse("Error uploading images", 500));
  }
});
