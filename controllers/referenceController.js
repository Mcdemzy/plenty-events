import { asyncHandler, ErrorResponse } from "../middleware/errorHandler.js";
import { Category, Expertise, EventType } from "../models/Reference.js";

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getCategories = asyncHandler(async (req, res, next) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

// @desc    Create new category
// @route   POST /api/categories
// @access  Private (Admin only)
export const createCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.create(req.body);

  res.status(201).json({
    success: true,
    message: "Category created successfully",
    data: category,
  });
});

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (Admin only)
export const updateCategory = asyncHandler(async (req, res, next) => {
  let category = await Category.findById(req.params.id);

  if (!category) {
    return next(new ErrorResponse("Category not found", 404));
  }

  category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Category updated successfully",
    data: category,
  });
});

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private (Admin only)
export const deleteCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new ErrorResponse("Category not found", 404));
  }

  // Check if category is being used by any vendors
  const Vendor = (await import("../models/Vendor.js")).default;
  const vendorCount = await Vendor.countDocuments({
    categories: req.params.id,
  });

  if (vendorCount > 0) {
    return next(
      new ErrorResponse(
        `Cannot delete category. It is being used by ${vendorCount} vendor(s)`,
        400
      )
    );
  }

  await Category.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Category deleted successfully",
  });
});

// @desc    Get all expertise areas
// @route   GET /api/expertise
// @access  Public
export const getExpertise = asyncHandler(async (req, res, next) => {
  const expertise = await Expertise.find({ isActive: true }).sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: expertise.length,
    data: expertise,
  });
});

// @desc    Create new expertise
// @route   POST /api/expertise
// @access  Private (Admin only)
export const createExpertise = asyncHandler(async (req, res, next) => {
  const expertise = await Expertise.create(req.body);

  res.status(201).json({
    success: true,
    message: "Expertise created successfully",
    data: expertise,
  });
});

// @desc    Update expertise
// @route   PUT /api/expertise/:id
// @access  Private (Admin only)
export const updateExpertise = asyncHandler(async (req, res, next) => {
  let expertise = await Expertise.findById(req.params.id);

  if (!expertise) {
    return next(new ErrorResponse("Expertise not found", 404));
  }

  expertise = await Expertise.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Expertise updated successfully",
    data: expertise,
  });
});

// @desc    Delete expertise
// @route   DELETE /api/expertise/:id
// @access  Private (Admin only)
export const deleteExpertise = asyncHandler(async (req, res, next) => {
  const expertise = await Expertise.findById(req.params.id);

  if (!expertise) {
    return next(new ErrorResponse("Expertise not found", 404));
  }

  // Check if expertise is being used by any waiters
  const Waiter = (await import("../models/Waiter.js")).default;
  const waiterCount = await Waiter.countDocuments({ expertise: req.params.id });

  if (waiterCount > 0) {
    return next(
      new ErrorResponse(
        `Cannot delete expertise. It is being used by ${waiterCount} waiter(s)`,
        400
      )
    );
  }

  await Expertise.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Expertise deleted successfully",
  });
});

// @desc    Get all event types
// @route   GET /api/events
// @access  Public
export const getEventTypes = asyncHandler(async (req, res, next) => {
  const eventTypes = await EventType.find({ isActive: true })
    .populate({
      path: "suggestedVendorCategories",
      select: "name icon",
    })
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: eventTypes.length,
    data: eventTypes,
  });
});

// @desc    Create new event type
// @route   POST /api/events
// @access  Private (Admin only)
export const createEventType = asyncHandler(async (req, res, next) => {
  const eventType = await EventType.create(req.body);

  // Populate the created event type
  await eventType.populate({
    path: "suggestedVendorCategories",
    select: "name icon",
  });

  res.status(201).json({
    success: true,
    message: "Event type created successfully",
    data: eventType,
  });
});

// @desc    Update event type
// @route   PUT /api/events/:id
// @access  Private (Admin only)
export const updateEventType = asyncHandler(async (req, res, next) => {
  let eventType = await EventType.findById(req.params.id);

  if (!eventType) {
    return next(new ErrorResponse("Event type not found", 404));
  }

  eventType = await EventType.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate({
    path: "suggestedVendorCategories",
    select: "name icon",
  });

  res.status(200).json({
    success: true,
    message: "Event type updated successfully",
    data: eventType,
  });
});

// @desc    Delete event type
// @route   DELETE /api/events/:id
// @access  Private (Admin only)
export const deleteEventType = asyncHandler(async (req, res, next) => {
  const eventType = await EventType.findById(req.params.id);

  if (!eventType) {
    return next(new ErrorResponse("Event type not found", 404));
  }

  // Check if event type is being used by any orders
  const { Order } = await import("../models/Booking.js");
  const orderCount = await Order.countDocuments({ eventType: req.params.id });

  if (orderCount > 0) {
    return next(
      new ErrorResponse(
        `Cannot delete event type. It is being used by ${orderCount} order(s)`,
        400
      )
    );
  }

  await EventType.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Event type deleted successfully",
  });
});
