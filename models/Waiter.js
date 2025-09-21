import mongoose from "mongoose";

const waiterSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Professional Info
    expertise: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Expertise",
        required: true,
      },
    ],

    // Experience
    yearsOfExperience: {
      type: Number,
      min: 0,
      required: [true, "Please add years of experience"],
    },
    previousWorkplaces: [
      {
        name: String,
        position: String,
        duration: String,
        description: String,
      },
    ],

    // Skills & Certifications
    skills: [String],
    certifications: [
      {
        name: String,
        issuedBy: String,
        dateIssued: Date,
        expiryDate: Date,
        certificateUrl: String,
      },
    ],

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

    // Attitude & Personality
    attitudeRating: {
      type: Number,
      min: [0, "Attitude rating cannot be negative"],
      max: [5, "Attitude rating must can not be more than 5"],
      default: 0,
    },

    // Availability
    isAvailable: {
      type: Boolean,
      default: true,
    },
    availableHours: {
      monday: { start: String, end: String, available: Boolean },
      tuesday: { start: String, end: String, available: Boolean },
      wednesday: { start: String, end: String, available: Boolean },
      thursday: { start: String, end: String, available: Boolean },
      friday: { start: String, end: String, available: Boolean },
      saturday: { start: String, end: String, available: Boolean },
      sunday: { start: String, end: String, available: Boolean },
    },

    // Rates
    hourlyRate: {
      type: Number,
      required: [true, "Please add hourly rate"],
    },
    dailyRate: {
      type: Number,
    },
    currency: {
      type: String,
      default: "NGN",
    },

    // Location & Coverage
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
      city: String,
      state: String,
      country: String,
    },
    serviceAreas: [String], // Areas they can work in

    // Application Details (from the form you provided)
    applicationDetails: {
      // Personal Details
      highestEducation: String,
      hasWorkedAsBefore: {
        type: Boolean,
        default: false,
      },
      previousExperience: String,
      hasHospitalityTraining: {
        type: Boolean,
        default: false,
      },
      trainingDetails: String,

      // Work Preferences
      canWorkEvenings: {
        type: Boolean,
        default: true,
      },
      canWorkWeekends: {
        type: Boolean,
        default: true,
      },
      canWorkHolidays: {
        type: Boolean,
        default: true,
      },
      canWorkUnderPressure: {
        type: Boolean,
        default: true,
      },

      // Background Check
      hasBeenConvicted: {
        type: Boolean,
        default: false,
      },
      convictionDetails: String,
      usesSubstances: {
        type: Boolean,
        default: false,
      },

      // Next of Kin
      nextOfKin: {
        name: String,
        relationship: String,
        phone: String,
      },

      // Guarantor
      guarantor: {
        fullName: String,
        relationship: String,
        address: String,
        phone: String,
        email: String,
        occupation: String,
      },

      // Documents
      documents: {
        passportPhoto: {
          public_id: String,
          url: String,
        },
        governmentId: {
          public_id: String,
          url: String,
          type: String, // NIN, Driver's License, Int. Passport
        },
      },
    },

    // Verification Status
    isVerified: {
      type: Boolean,
      default: false,
    },
    backgroundCheckStatus: {
      type: String,
      enum: ["pending", "in-progress", "passed", "failed"],
      default: "pending",
    },

    // Statistics
    totalJobs: {
      type: Number,
      default: 0,
    },
    completedJobs: {
      type: Number,
      default: 0,
    },

    // Emergency Contact
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
waiterSchema.index({ location: "2dsphere" });
waiterSchema.index({ expertise: 1 });
waiterSchema.index({ averageRating: -1 });
waiterSchema.index({ attitudeRating: -1 });
waiterSchema.index({ hourlyRate: 1 });
waiterSchema.index({ isVerified: 1, isAvailable: 1 });

// Populate user and expertise details
waiterSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "firstName lastName email phone profilePicture isActive",
  }).populate({
    path: "expertise",
    select: "name description",
  });
  next();
});

// Virtual for completion rate
waiterSchema.virtual("completionRate").get(function () {
  if (this.totalJobs === 0) return 0;
  return Math.round((this.completedJobs / this.totalJobs) * 100);
});

// Virtual for response rate (placeholder - would be calculated based on actual responses)
waiterSchema.virtual("responseRate").get(function () {
  // This would be calculated based on how quickly they respond to job requests
  return 95; // Placeholder
});

// Update averageRating when a new rating is added
waiterSchema.methods.updateRating = async function () {
  const Rating = mongoose.model("Rating");

  const stats = await Rating.aggregate([
    { $match: { waiter: this._id } },
    {
      $group: {
        _id: "$waiter",
        averageRating: { $avg: "$rating" },
        attitudeRating: { $avg: "$attitudeRating" },
        totalRatings: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    this.averageRating = Math.ceil(stats[0].averageRating * 10) / 10;
    this.attitudeRating = Math.ceil(stats[0].attitudeRating * 10) / 10;
    this.totalRatings = stats[0].totalRatings;
  } else {
    this.averageRating = 0;
    this.attitudeRating = 0;
    this.totalRatings = 0;
  }

  await this.save();
};

export default mongoose.model("Waiter", waiterSchema);
