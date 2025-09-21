import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Business Info
    businessName: {
      type: String,
      required: [true, "Please add a business name"],
      trim: true,
      maxlength: [100, "Business name cannot be more than 100 characters"],
    },
    businessDescription: {
      type: String,
      required: [true, "Please add a business description"],
      maxlength: [1000, "Description cannot be more than 1000 characters"],
    },

    // Categories
    categories: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Category",
        required: true,
      },
    ],

    // Location
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        index: "2dsphere",
      },
      formattedAddress: String,
      street: String,
      city: String,
      state: String,
      zipcode: String,
      country: String,
    },

    // Pricing
    priceRange: {
      min: {
        type: Number,
        required: [true, "Please add minimum price"],
      },
      max: {
        type: Number,
        required: [true, "Please add maximum price"],
      },
      currency: {
        type: String,
        default: "NGN",
      },
    },

    // Portfolio/Gallery
    portfolio: [
      {
        public_id: String,
        url: String,
        caption: String,
      },
    ],

    // Social Media & Contact
    website: String,
    socialMedia: {
      instagram: String,
      facebook: String,
      twitter: String,
      linkedin: String,
    },

    // Business Hours
    businessHours: {
      monday: { open: String, close: String, isClosed: Boolean },
      tuesday: { open: String, close: String, isClosed: Boolean },
      wednesday: { open: String, close: String, isClosed: Boolean },
      thursday: { open: String, close: String, isClosed: Boolean },
      friday: { open: String, close: String, isClosed: Boolean },
      saturday: { open: String, close: String, isClosed: Boolean },
      sunday: { open: String, close: String, isClosed: Boolean },
    },

    // Ratings
    averageRating: {
      type: Number,
      min: [0, "Rating cannot be negative"],
      max: [5, "Rating must can not be more than 5"],
      default: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },

    // Experience & Credentials
    yearsOfExperience: {
      type: Number,
      min: 0,
    },
    certifications: [String],

    // Availability
    isAvailable: {
      type: Boolean,
      default: true,
    },

    // Verification Status
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationDocuments: [
      {
        type: String,
        url: String,
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
      },
    ],

    // Statistics
    totalBookings: {
      type: Number,
      default: 0,
    },
    completedBookings: {
      type: Number,
      default: 0,
    },

    // Service Area (cities/states they serve)
    serviceAreas: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
vendorSchema.index({ location: "2dsphere" });
vendorSchema.index({ categories: 1 });
vendorSchema.index({ averageRating: -1 });
vendorSchema.index({ "priceRange.min": 1, "priceRange.max": 1 });
vendorSchema.index({ isVerified: 1, isAvailable: 1 });

// Populate user details
vendorSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "firstName lastName email phone profilePicture isActive",
  }).populate({
    path: "categories",
    select: "name icon",
  });
  next();
});

// Virtual for completion rate
vendorSchema.virtual("completionRate").get(function () {
  if (this.totalBookings === 0) return 0;
  return Math.round((this.completedBookings / this.totalBookings) * 100);
});

// Update averageRating when a new rating is added
vendorSchema.methods.updateRating = async function () {
  const Rating = mongoose.model("Rating");

  const stats = await Rating.aggregate([
    { $match: { vendor: this._id } },
    {
      $group: {
        _id: "$vendor",
        averageRating: { $avg: "$rating" },
        totalRatings: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    this.averageRating = Math.ceil(stats[0].averageRating * 10) / 10;
    this.totalRatings = stats[0].totalRatings;
  } else {
    this.averageRating = 0;
    this.totalRatings = 0;
  }

  await this.save();
};

export default mongoose.model("Vendor", vendorSchema);
