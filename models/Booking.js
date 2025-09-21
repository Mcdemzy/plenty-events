import mongoose from "mongoose";

// Order/Booking Model (User -> Vendor)
const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    vendor: {
      type: mongoose.Schema.ObjectId,
      ref: "Vendor",
      required: true,
    },

    // Event Details
    eventType: {
      type: mongoose.Schema.ObjectId,
      ref: "EventType",
      required: true,
    },
    eventTitle: {
      type: String,
      required: [true, "Please add an event title"],
      maxlength: [100, "Event title cannot be more than 100 characters"],
    },
    eventDescription: {
      type: String,
      maxlength: [
        1000,
        "Event description cannot be more than 1000 characters",
      ],
    },

    // Date & Time
    eventDate: {
      type: Date,
      required: [true, "Please add event date"],
    },
    startTime: {
      type: String,
      required: [true, "Please add start time"],
    },
    endTime: {
      type: String,
      required: [true, "Please add end time"],
    },

    // Location
    venue: {
      name: String,
      address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },

    // Guest Info
    guestCount: {
      type: Number,
      required: [true, "Please add guest count"],
      min: [1, "Guest count must be at least 1"],
    },

    // Pricing
    quotedPrice: {
      type: Number,
      required: true,
    },
    finalPrice: Number,
    currency: {
      type: String,
      default: "NGN",
    },

    // Status
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "in-progress",
        "completed",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },

    // Special Requirements
    specialRequests: String,
    dietaryRequirements: [String],

    // Communication
    messages: [
      {
        sender: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        message: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Payment Info
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "refunded"],
      default: "pending",
    },
    paymentMethod: String,
    transactionId: String,

    // Cancellation
    cancellationReason: String,
    cancelledBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    cancelledAt: Date,

    // Rating
    isRated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Job Model (Vendor -> Waiter)
const jobSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.ObjectId,
      ref: "Vendor",
      required: true,
    },
    waiter: {
      type: mongoose.Schema.ObjectId,
      ref: "Waiter",
      required: true,
    },
    order: {
      type: mongoose.Schema.ObjectId,
      ref: "Order",
      required: true,
    },

    // Job Details
    position: {
      type: String,
      required: [true, "Please specify the position"],
      maxlength: [50, "Position cannot be more than 50 characters"],
    },
    responsibilities: [String],

    // Schedule
    workDate: {
      type: Date,
      required: [true, "Please add work date"],
    },
    startTime: {
      type: String,
      required: [true, "Please add start time"],
    },
    endTime: {
      type: String,
      required: [true, "Please add end time"],
    },

    // Compensation
    hourlyRate: {
      type: Number,
      required: true,
    },
    totalHours: Number,
    totalAmount: Number,
    currency: {
      type: String,
      default: "NGN",
    },

    // Status
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "declined",
        "in-progress",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },

    // Special Instructions
    instructions: String,
    dresscode: String,

    // Communication
    messages: [
      {
        sender: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        message: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Response
    respondedAt: Date,
    declineReason: String,

    // Completion
    completedAt: Date,

    // Rating
    isRated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
orderSchema.index({ user: 1, vendor: 1 });
orderSchema.index({ eventDate: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

jobSchema.index({ vendor: 1, waiter: 1 });
jobSchema.index({ workDate: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ createdAt: -1 });

// Populate related data
orderSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "firstName lastName email phone",
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
      path: "eventType",
      select: "name icon",
    });
  next();
});

jobSchema.pre(/^find/, function (next) {
  this.populate({
    path: "vendor",
    select: "businessName user",
    populate: {
      path: "user",
      select: "firstName lastName",
    },
  })
    .populate({
      path: "waiter",
      select: "user hourlyRate",
      populate: {
        path: "user",
        select: "firstName lastName phone",
      },
    })
    .populate({
      path: "order",
      select: "eventTitle eventDate venue guestCount",
    });
  next();
});

// Virtual for duration
jobSchema.virtual("duration").get(function () {
  if (!this.startTime || !this.endTime) return null;

  const start = new Date(`2000-01-01 ${this.startTime}`);
  const end = new Date(`2000-01-01 ${this.endTime}`);

  return Math.abs(end - start) / 36e5; // Convert to hours
});

export const Order = mongoose.model("Order", orderSchema);
export const Job = mongoose.model("Job", jobSchema);
