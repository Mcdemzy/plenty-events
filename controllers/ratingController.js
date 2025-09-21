import { asyncHandler, ErrorResponse } from "../middleware/errorHandler.js";
import Rating from "../models/Rating.js";
import Vendor from "../models/Vendor.js";
import Waiter from "../models/Waiter.js";

// @desc    Get vendor ratings
// @route   GET /api/ratings/vendor/:vendorId
// @access  Public
export const getVendorRatings = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.vendorId);

  if (!vendor) {
    return next(new ErrorResponse("Vendor not found", 404));
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Build query
  let query = { vendor: req.params.vendorId, isActive: true };

  // Filter by rating
  if (req.query.rating) {
    query.rating = parseInt(req.query.rating);
  }

  // Build sort object
  let sort = {};
  if (req.query.sortBy) {
    const sortBy = req.query.sortBy;
    const order = req.query.order === "asc" ? 1 : -1;

    switch (sortBy) {
      case "rating":
        sort.rating = order;
        break;
      case "helpful":
        sort.helpfulVotes = order;
        break;
      case "date":
      default:
        sort.createdAt = order;
        break;
    }
  } else {
    sort = { createdAt: -1 };
  }

  // Execute query
  const ratings = await Rating.find(query)
    .populate({
      path: "reviewer",
      select: "firstName lastName profilePicture",
    })
    .populate({
      path: "order",
      select: "eventTitle eventDate",
    })
    .sort(sort)
    .skip(startIndex)
    .limit(limit);

  const total = await Rating.countDocuments(query);

  // Get rating breakdown
  const ratingBreakdown = await Rating.aggregate([
    { $match: { vendor: vendor._id, isActive: true } },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);

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
    count: ratings.length,
    total,
    pagination,
    data: {
      ratings,
      ratingBreakdown,
      averageRating: vendor.averageRating,
      totalRatings: vendor.totalRatings,
    },
  });
});

// @desc    Get waiter ratings
// @route   GET /api/ratings/waiter/:waiterId
// @access  Public
export const getWaiterRatings = asyncHandler(async (req, res, next) => {
  const waiter = await Waiter.findById(req.params.waiterId);

  if (!waiter) {
    return next(new ErrorResponse("Waiter not found", 404));
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Build query
  let query = { waiter: req.params.waiterId, isActive: true };

  // Filter by rating
  if (req.query.rating) {
    query.rating = parseInt(req.query.rating);
  }

  // Build sort object
  let sort = {};
  if (req.query.sortBy) {
    const sortBy = req.query.sortBy;
    const order = req.query.order === "asc" ? 1 : -1;

    switch (sortBy) {
      case "rating":
        sort.rating = order;
        break;
      case "helpful":
        sort.helpfulVotes = order;
        break;
      case "date":
      default:
        sort.createdAt = order;
        break;
    }
  } else {
    sort = { createdAt: -1 };
  }

  // Execute query
  const ratings = await Rating.find(query)
    .populate({
      path: "reviewer",
      select: "firstName lastName profilePicture",
    })
    .populate({
      path: "job",
      select: "position workDate",
    })
    .sort(sort)
    .skip(startIndex)
    .limit(limit);

  const total = await Rating.countDocuments(query);

  // Get rating breakdown
  const ratingBreakdown = await Rating.aggregate([
    { $match: { waiter: waiter._id, isActive: true } },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  // Get attitude rating breakdown
  const attitudeBreakdown = await Rating.aggregate([
    {
      $match: {
        waiter: waiter._id,
        isActive: true,
        attitudeRating: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: "$attitudeRating",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);

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
    count: ratings.length,
    total,
    pagination,
    data: {
      ratings,
      ratingBreakdown,
      attitudeBreakdown,
      averageRating: waiter.averageRating,
      attitudeRating: waiter.attitudeRating,
      totalRatings: waiter.totalRatings,
    },
  });
});

// @desc    Get single rating
// @route   GET /api/ratings/:id
// @access  Private
export const getRatingById = asyncHandler(async (req, res, next) => {
  const rating = await Rating.findById(req.params.id)
    .populate({
      path: "reviewer",
      select: "firstName lastName profilePicture",
    })
    .populate({
      path: "vendor",
      select: "businessName user",
      populate: {
        path: "user",
        select: "firstName lastName",
      },
    })
    .populate({
      path: "waiter",
      select: "user",
      populate: {
        path: "user",
        select: "firstName lastName",
      },
    })
    .populate({
      path: "order",
      select: "eventTitle eventDate",
    })
    .populate({
      path: "job",
      select: "position workDate",
    });

  if (!rating) {
    return next(new ErrorResponse("Rating not found", 404));
  }

  // Check if user can view this rating (owner, rated party, or admin)
  const canView =
    req.user.role === "admin" ||
    rating.reviewer._id.toString() === req.user._id.toString() ||
    (rating.vendor &&
      rating.vendor.user.toString() === req.user._id.toString()) ||
    (rating.waiter &&
      rating.waiter.user.toString() === req.user._id.toString());

  if (!canView) {
    return next(new ErrorResponse("Not authorized to view this rating", 403));
  }

  res.status(200).json({
    success: true,
    data: rating,
  });
});

// @desc    Delete rating
// @route   DELETE /api/ratings/:id
// @access  Private (Owner or Admin)
export const deleteRating = asyncHandler(async (req, res, next) => {
  const rating = await Rating.findById(req.params.id);

  if (!rating) {
    return next(new ErrorResponse("Rating not found", 404));
  }

  // Check if user can delete this rating (owner or admin)
  const canDelete =
    req.user.role === "admin" ||
    rating.reviewer.toString() === req.user._id.toString();

  if (!canDelete) {
    return next(new ErrorResponse("Not authorized to delete this rating", 403));
  }

  // Soft delete by marking as inactive
  rating.isActive = false;
  await rating.save();

  // Update vendor/waiter ratings
  if (rating.vendor) {
    const vendor = await Vendor.findById(rating.vendor);
    if (vendor) {
      await vendor.updateRating();
    }
  }

  if (rating.waiter) {
    const waiter = await Waiter.findById(rating.waiter);
    if (waiter) {
      await waiter.updateRating();
    }
  }

  res.status(200).json({
    success: true,
    message: "Rating deleted successfully",
  });
});

// @desc    Report rating
// @route   POST /api/ratings/:id/report
// @access  Private
export const reportRating = asyncHandler(async (req, res, next) => {
  const rating = await Rating.findById(req.params.id);

  if (!rating) {
    return next(new ErrorResponse("Rating not found", 404));
  }

  // Check if rating is already reported
  if (rating.isReported) {
    return next(new ErrorResponse("Rating is already reported", 400));
  }

  // Report the rating
  rating.isReported = true;
  rating.reportReason = req.body.reason || "Inappropriate content";
  await rating.save();

  res.status(200).json({
    success: true,
    message: "Rating reported successfully",
  });
});

// @desc    Respond to rating
// @route   POST /api/ratings/:id/respond
// @access  Private (Vendor/Waiter)
export const respondToRating = asyncHandler(async (req, res, next) => {
  const rating = await Rating.findById(req.params.id);

  if (!rating) {
    return next(new ErrorResponse("Rating not found", 404));
  }

  // Check if user can respond to this rating
  let canRespond = false;

  if (rating.vendor && req.user.role === "vendor") {
    const vendor = await Vendor.findOne({
      _id: rating.vendor,
      user: req.user._id,
    });
    canRespond = !!vendor;
  }

  if (rating.waiter && req.user.role === "waiter") {
    const waiter = await Waiter.findOne({
      _id: rating.waiter,
      user: req.user._id,
    });
    canRespond = !!waiter;
  }

  if (!canRespond) {
    return next(
      new ErrorResponse("Not authorized to respond to this rating", 403)
    );
  }

  // Check if already responded
  if (rating.response && rating.response.message) {
    return next(
      new ErrorResponse("You have already responded to this rating", 400)
    );
  }

  // Add response
  rating.response = {
    message: req.body.message,
    respondedAt: Date.now(),
  };

  await rating.save();

  res.status(200).json({
    success: true,
    message: "Response added successfully",
    data: rating,
  });
});
