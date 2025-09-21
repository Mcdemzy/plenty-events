import { asyncHandler, ErrorResponse } from "../middleware/errorHandler.js";
import Waiter from "../models/Waiter.js";
import Vendor from "../models/Vendor.js";
import Rating from "../models/Rating.js";
import { Job, Order } from "../models/Booking.js";
import { Expertise } from "../models/Reference.js";
import { sendJobOfferEmail } from "../utils/emailService.js";

// @desc    Get all waiters with filtering, sorting, and pagination
// @route   GET /api/waiters
// @access  Public
export const getWaiters = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;
  const startIndex = (page - 1) * limit;

  // Build query object
  let query = { isVerified: true };

  // Filter by expertise
  if (req.query.expertise) {
    query.expertise = req.query.expertise;
  }

  // Filter by rating
  if (req.query.rating) {
    query.averageRating = { $gte: parseInt(req.query.rating) };
  }

  // Filter by attitude rating
  if (req.query.attitudeRating) {
    query.attitudeRating = { $gte: parseInt(req.query.attitudeRating) };
  }

  // Filter by location (city/state)
  if (req.query.location) {
    query.$or = [
      { "location.city": { $regex: req.query.location, $options: "i" } },
      { "location.state": { $regex: req.query.location, $options: "i" } },
      { serviceAreas: { $in: [new RegExp(req.query.location, "i")] } },
    ];
  }

  // Filter by hourly rate range
  if (req.query.minRate || req.query.maxRate) {
    if (req.query.minRate) {
      query.hourlyRate = { $gte: parseFloat(req.query.minRate) };
    }

    if (req.query.maxRate) {
      if (query.hourlyRate) {
        query.hourlyRate.$lte = parseFloat(req.query.maxRate);
      } else {
        query.hourlyRate = { $lte: parseFloat(req.query.maxRate) };
      }
    }
  }

  // Search functionality
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    query.$or = [
      { "user.firstName": searchRegex },
      { "user.lastName": searchRegex },
      { skills: { $in: [searchRegex] } },
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
      case "rate":
        sort.hourlyRate = order;
        break;
      case "experience":
        sort.yearsOfExperience = order;
        break;
      case "date":
      default:
        sort.createdAt = order;
        break;
    }
  } else {
    sort = { averageRating: -1, totalJobs: -1 };
  }

  try {
    // Execute query
    const waiters = await Waiter.find(query)
      .populate({
        path: "user",
        select: "firstName lastName profilePicture isActive",
      })
      .populate({
        path: "expertise",
        select: "name icon",
      })
      .sort(sort)
      .skip(startIndex)
      .limit(limit);

    // Get total count for pagination
    const total = await Waiter.countDocuments(query);

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
      count: waiters.length,
      total,
      pagination,
      data: waiters,
    });
  } catch (error) {
    return next(new ErrorResponse("Error fetching waiters", 500));
  }
});

// @desc    Get single waiter
// @route   GET /api/waiters/:id
// @access  Public
export const getWaiter = asyncHandler(async (req, res, next) => {
  const waiter = await Waiter.findById(req.params.id)
    .populate({
      path: "user",
      select: "firstName lastName email phone profilePicture createdAt",
    })
    .populate({
      path: "expertise",
      select: "name icon description",
    });

  if (!waiter) {
    return next(new ErrorResponse("Waiter not found", 404));
  }

  // Get recent ratings
  const ratings = await Rating.find({ waiter: waiter._id })
    .populate({
      path: "reviewer",
      select: "firstName lastName profilePicture",
    })
    .sort({ createdAt: -1 })
    .limit(10);

  res.status(200).json({
    success: true,
    data: {
      waiter,
      ratings,
    },
  });
});

// @desc    Update waiter profile
// @route   PUT /api/waiters/profile
// @access  Private (Waiter only)
export const updateWaiterProfile = asyncHandler(async (req, res, next) => {
  // Find waiter profile
  let waiter = await Waiter.findOne({ user: req.user._id });

  if (!waiter) {
    return next(new ErrorResponse("Waiter profile not found", 404));
  }

  // Validate hourly vs daily rate
  if (req.body.hourlyRate && req.body.dailyRate) {
    if (req.body.dailyRate < req.body.hourlyRate * 6) {
      return next(
        new ErrorResponse(
          "Daily rate should typically be at least 6x hourly rate",
          400
        )
      );
    }
  }

  // Update waiter profile
  waiter = await Waiter.findByIdAndUpdate(waiter._id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Waiter profile updated successfully",
    data: waiter,
  });
});

// @desc    Rate a waiter
// @route   POST /api/waiters/:id/rate
// @access  Private (Vendor only)
export const rateWaiter = asyncHandler(async (req, res, next) => {
  const waiter = await Waiter.findById(req.params.id);

  if (!waiter) {
    return next(new ErrorResponse("Waiter not found", 404));
  }

  // Check if vendor has hired this waiter before
  const existingJob = await Job.findOne({
    waiter: req.params.id,
    vendor: req.user.vendorProfile,
    status: "completed",
  });

  if (!existingJob) {
    return next(
      new ErrorResponse(
        "You can only rate waiters you have hired and completed jobs with",
        400
      )
    );
  }

  // Check if vendor has already rated this waiter for this job
  const existingRating = await Rating.findOne({
    reviewer: req.user._id,
    waiter: req.params.id,
    job: existingJob._id,
  });

  if (existingRating) {
    return next(
      new ErrorResponse("You have already rated this waiter for this job", 400)
    );
  }

  // Create rating
  const rating = await Rating.create({
    reviewer: req.user._id,
    waiter: req.params.id,
    job: existingJob._id,
    rating: req.body.rating,
    attitudeRating: req.body.attitudeRating,
    review: req.body.review,
    breakdown: req.body.breakdown,
  });

  // Mark job as rated
  existingJob.isRated = true;
  await existingJob.save();

  res.status(201).json({
    success: true,
    message: "Rating added successfully",
    data: rating,
  });
});

// @desc    Hire a waiter (create job)
// @route   POST /api/waiters/:id/hire
// @access  Private (Vendor only)
export const hireWaiter = asyncHandler(async (req, res, next) => {
  const waiter = await Waiter.findById(req.params.id);

  if (!waiter) {
    return next(new ErrorResponse("Waiter not found", 404));
  }

  if (!waiter.isAvailable) {
    return next(
      new ErrorResponse("This waiter is currently not available", 400)
    );
  }

  // Get vendor profile
  const vendorProfile =
    (await req.user.vendorProfile) ||
    (await Vendor.findOne({ user: req.user._id }));
  if (!vendorProfile) {
    return next(new ErrorResponse("Vendor profile not found", 404));
  }

  // Check if order exists (optional - for linking jobs to specific orders)
  let order = null;
  if (req.body.orderId) {
    order = await Order.findOne({
      _id: req.body.orderId,
      vendor: vendorProfile._id,
    });

    if (!order) {
      return next(
        new ErrorResponse("Order not found or not owned by you", 404)
      );
    }
  }

  // Calculate total amount based on hours
  const startTime = new Date(`2000-01-01 ${req.body.startTime}`);
  const endTime = new Date(`2000-01-01 ${req.body.endTime}`);
  const totalHours = Math.abs(endTime - startTime) / 36e5; // Convert to hours
  const totalAmount = totalHours * req.body.hourlyRate;

  // Create job
  const job = await Job.create({
    vendor: vendorProfile._id,
    waiter: req.params.id,
    order: order ? order._id : null,
    position: req.body.position,
    responsibilities: req.body.responsibilities,
    workDate: req.body.workDate,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    hourlyRate: req.body.hourlyRate,
    totalHours,
    totalAmount,
    instructions: req.body.instructions,
    dresscode: req.body.dresscode,
  });

  // Send job offer email (don't fail job creation if email fails)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      await sendJobOfferEmail(waiter, job, vendorProfile);
      console.log("✅ Job offer email sent successfully");
    } catch (error) {
      console.error("❌ Failed to send job offer email:", error.message);
      // Don't fail the job creation if email fails
    }
  } else {
    console.log(
      "⚠️ Email credentials not configured, skipping job offer email"
    );
  }

  res.status(201).json({
    success: true,
    message: "Job offer sent successfully",
    data: job,
  });
});

// @desc    Get waiter jobs
// @route   GET /api/waiters/jobs
// @access  Private (Waiter only)
export const getWaiterJobs = asyncHandler(async (req, res, next) => {
  const waiter = await Waiter.findOne({ user: req.user._id });

  if (!waiter) {
    return next(new ErrorResponse("Waiter profile not found", 404));
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Build query
  let query = { waiter: waiter._id };

  if (req.query.status) {
    query.status = req.query.status;
  }

  // Execute query
  const jobs = await Job.find(query)
    .populate({
      path: "vendor",
      select: "businessName user",
      populate: {
        path: "user",
        select: "firstName lastName phone",
      },
    })
    .populate({
      path: "order",
      select: "eventTitle eventDate venue",
    })
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  const total = await Job.countDocuments(query);

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
    count: jobs.length,
    total,
    pagination,
    data: jobs,
  });
});

// @desc    Get single waiter job
// @route   GET /api/waiters/jobs/:jobId
// @access  Private (Waiter only)
export const getWaiterJob = asyncHandler(async (req, res, next) => {
  const waiter = await Waiter.findOne({ user: req.user._id });

  if (!waiter) {
    return next(new ErrorResponse("Waiter profile not found", 404));
  }

  const job = await Job.findOne({
    _id: req.params.jobId,
    waiter: waiter._id,
  })
    .populate({
      path: "vendor",
      select: "businessName user",
      populate: {
        path: "user",
        select: "firstName lastName email phone",
      },
    })
    .populate({
      path: "order",
      select: "eventTitle eventDate eventDescription venue guestCount",
    });

  if (!job) {
    return next(new ErrorResponse("Job not found", 404));
  }

  res.status(200).json({
    success: true,
    data: job,
  });
});

// @desc    Update job status
// @route   PUT /api/waiters/jobs/:jobId
// @access  Private (Waiter only)
export const updateJobStatus = asyncHandler(async (req, res, next) => {
  const waiter = await Waiter.findOne({ user: req.user._id });

  if (!waiter) {
    return next(new ErrorResponse("Waiter profile not found", 404));
  }

  const job = await Job.findOne({
    _id: req.params.jobId,
    waiter: waiter._id,
  });

  if (!job) {
    return next(new ErrorResponse("Job not found", 404));
  }

  const { status } = req.body;

  // Validate status transitions
  const validTransitions = {
    pending: ["accepted", "declined"],
    accepted: ["in-progress", "cancelled"],
    declined: [],
    "in-progress": ["completed"],
    completed: [],
    cancelled: [],
  };

  if (!validTransitions[job.status].includes(status)) {
    return next(
      new ErrorResponse(
        `Cannot change status from ${job.status} to ${status}`,
        400
      )
    );
  }

  job.status = status;

  // Set response time
  if (status === "accepted" || status === "declined") {
    job.respondedAt = Date.now();
    if (status === "declined" && req.body.declineReason) {
      job.declineReason = req.body.declineReason;
    }
  }

  // Update waiter stats when job is completed
  if (status === "completed") {
    waiter.completedJobs += 1;
    waiter.totalJobs += 1;
    job.completedAt = Date.now();
    await waiter.save();
  } else if (status === "accepted") {
    waiter.totalJobs += 1;
    await waiter.save();
  }

  await job.save();

  res.status(200).json({
    success: true,
    message: "Job status updated successfully",
    data: job,
  });
});

// @desc    Get waiter statistics
// @route   GET /api/waiters/jobs/stats
// @access  Private (Waiter only)
export const getWaiterStats = asyncHandler(async (req, res, next) => {
  const waiter = await Waiter.findOne({ user: req.user._id });

  if (!waiter) {
    return next(new ErrorResponse("Waiter profile not found", 404));
  }

  // Get job statistics
  const jobStats = await Job.aggregate([
    { $match: { waiter: waiter._id } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalEarnings: { $sum: "$totalAmount" },
      },
    },
  ]);

  // Get monthly jobs for the last 12 months
  const monthlyJobs = await Job.aggregate([
    {
      $match: {
        waiter: waiter._id,
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
        earnings: { $sum: "$totalAmount" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  // Get ratings summary
  const ratingsStats = await Rating.aggregate([
    { $match: { waiter: waiter._id } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        averageAttitudeRating: { $avg: "$attitudeRating" },
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
      waiter: {
        totalJobs: waiter.totalJobs,
        completedJobs: waiter.completedJobs,
        completionRate: waiter.completionRate,
        averageRating: waiter.averageRating,
        attitudeRating: waiter.attitudeRating,
        totalRatings: waiter.totalRatings,
        responseRate: waiter.responseRate,
      },
      jobStats,
      monthlyJobs,
      ratingsStats: ratingsStats[0] || {
        averageRating: 0,
        averageAttitudeRating: 0,
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

// @desc    Upload waiter documents
// @route   POST /api/waiters/documents/upload
// @access  Private (Waiter only)
export const uploadWaiterDocuments = asyncHandler(async (req, res, next) => {
  const waiter = await Waiter.findOne({ user: req.user._id });

  if (!waiter) {
    return next(new ErrorResponse("Waiter profile not found", 404));
  }

  if (!req.files) {
    return next(new ErrorResponse("Please upload documents", 400));
  }

  const { passportPhoto, governmentId } = req.files;

  // Validate file types and sizes
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const maxSize = 5 * 1024 * 1024; // 5MB

  const validateFile = (file, fieldName) => {
    if (!file) return null;

    const fileToValidate = Array.isArray(file) ? file[0] : file;

    if (!allowedTypes.includes(fileToValidate.mimetype)) {
      throw new Error(`${fieldName} must be JPEG, JPG, PNG, or WebP format`);
    }

    if (fileToValidate.size > maxSize) {
      throw new Error(`${fieldName} must be less than 5MB`);
    }

    return fileToValidate;
  };

  try {
    const uploadedDocuments = {};

    // Validate and process passport photo
    if (passportPhoto) {
      const photo = validateFile(passportPhoto, "Passport photo");
      if (photo) {
        // Simulate cloud upload
        uploadedDocuments.passportPhoto = {
          public_id: `waiter_passport_${waiter._id}_${Date.now()}`,
          url: `https://example.com/uploads/passport_${photo.name}`, // This would be the actual cloud URL
        };
      }
    }

    // Validate and process government ID
    if (governmentId) {
      const id = validateFile(governmentId, "Government ID");
      if (id) {
        // Simulate cloud upload
        uploadedDocuments.governmentId = {
          public_id: `waiter_id_${waiter._id}_${Date.now()}`,
          url: `https://example.com/uploads/id_${id.name}`, // This would be the actual cloud URL
          type: req.body.idType || "NIN", // NIN, Driver's License, Int. Passport
        };
      }
    }

    // Update waiter's documents
    if (!waiter.applicationDetails) {
      waiter.applicationDetails = {};
    }
    if (!waiter.applicationDetails.documents) {
      waiter.applicationDetails.documents = {};
    }

    if (uploadedDocuments.passportPhoto) {
      waiter.applicationDetails.documents.passportPhoto =
        uploadedDocuments.passportPhoto;
    }

    if (uploadedDocuments.governmentId) {
      waiter.applicationDetails.documents.governmentId =
        uploadedDocuments.governmentId;
    }

    await waiter.save();

    res.status(200).json({
      success: true,
      message: "Documents uploaded successfully",
      data: {
        uploadedDocuments,
        allDocuments: waiter.applicationDetails.documents,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return next(
      new ErrorResponse(error.message || "Error uploading documents", 500)
    );
  }
});
