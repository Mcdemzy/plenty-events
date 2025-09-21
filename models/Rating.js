import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    // Who is giving the rating
    reviewer: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },

    // Who/what is being rated
    vendor: {
      type: mongoose.Schema.ObjectId,
      ref: "Vendor",
    },
    waiter: {
      type: mongoose.Schema.ObjectId,
      ref: "Waiter",
    },

    // Related booking/job
    order: {
      type: mongoose.Schema.ObjectId,
      ref: "Order",
    },
    job: {
      type: mongoose.Schema.ObjectId,
      ref: "Job",
    },

    // Rating Details
    rating: {
      type: Number,
      required: [true, "Please add a rating"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot be more than 5"],
    },

    // For waiters - additional attitude rating
    attitudeRating: {
      type: Number,
      min: [1, "Attitude rating must be at least 1"],
      max: [5, "Attitude rating cannot be more than 5"],
    },

    // Review Text
    review: {
      type: String,
      maxlength: [500, "Review cannot be more than 500 characters"],
    },

    // Specific Ratings (optional detailed breakdown)
    breakdown: {
      quality: Number, // Quality of service/food
      punctuality: Number, // On-time delivery/service
      communication: Number, // Communication skills
      value: Number, // Value for money
      professionalism: Number, // Overall professionalism
    },

    // Media attachments (photos of the service/event)
    photos: [
      {
        public_id: String,
        url: String,
      },
    ],

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Response from vendor/waiter
    response: {
      message: String,
      respondedAt: Date,
    },

    // Helpful votes (other users can mark reviews as helpful)
    helpfulVotes: {
      type: Number,
      default: 0,
    },

    // Report status (if review is reported as inappropriate)
    isReported: {
      type: Boolean,
      default: false,
    },
    reportReason: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ratingSchema.index({ vendor: 1 });
ratingSchema.index({ waiter: 1 });
ratingSchema.index({ reviewer: 1 });
ratingSchema.index({ rating: -1 });
ratingSchema.index({ createdAt: -1 });

// Ensure a user can only rate a vendor/waiter once per order/job
ratingSchema.index(
  { reviewer: 1, vendor: 1, order: 1 },
  {
    unique: true,
    partialFilterExpression: {
      vendor: { $exists: true },
      order: { $exists: true },
    },
  }
);
ratingSchema.index(
  { reviewer: 1, waiter: 1, job: 1 },
  {
    unique: true,
    partialFilterExpression: {
      waiter: { $exists: true },
      job: { $exists: true },
    },
  }
);

// Validation: Must rate either a vendor or waiter, not both
ratingSchema.pre("save", function (next) {
  if ((this.vendor && this.waiter) || (!this.vendor && !this.waiter)) {
    next(
      new Error("Must rate either a vendor or a waiter, not both or neither")
    );
  }
  next();
});

// Populate reviewer details
ratingSchema.pre(/^find/, function (next) {
  this.populate({
    path: "reviewer",
    select: "firstName lastName profilePicture",
  });
  next();
});

// Update vendor/waiter rating after new rating is saved
ratingSchema.post("save", async function () {
  if (this.vendor) {
    const Vendor = mongoose.model("Vendor");
    const vendor = await Vendor.findById(this.vendor);
    if (vendor) {
      await vendor.updateRating();
    }
  }

  if (this.waiter) {
    const Waiter = mongoose.model("Waiter");
    const waiter = await Waiter.findById(this.waiter);
    if (waiter) {
      await waiter.updateRating();
    }
  }
});

// Update vendor/waiter rating after rating is removed
ratingSchema.post("findOneAndDelete", async function (doc) {
  if (doc && doc.vendor) {
    const Vendor = mongoose.model("Vendor");
    const vendor = await Vendor.findById(doc.vendor);
    if (vendor) {
      await vendor.updateRating();
    }
  }

  if (doc && doc.waiter) {
    const Waiter = mongoose.model("Waiter");
    const waiter = await Waiter.findById(doc.waiter);
    if (waiter) {
      await waiter.updateRating();
    }
  }
});

// Virtual for overall rating (if breakdown ratings are provided)
ratingSchema.virtual("overallBreakdownRating").get(function () {
  if (!this.breakdown) return null;

  const ratings = Object.values(this.breakdown).filter((rating) => rating > 0);
  if (ratings.length === 0) return null;

  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
});

export default mongoose.model("Rating", ratingSchema);
