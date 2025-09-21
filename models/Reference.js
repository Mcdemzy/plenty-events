import mongoose from "mongoose";

// Category Model (for vendors)
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a category name"],
      unique: true,
      trim: true,
      maxlength: [50, "Category name cannot be more than 50 characters"],
    },
    description: {
      type: String,
      maxlength: [200, "Description cannot be more than 200 characters"],
    },
    icon: String, // Icon name or URL
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Expertise Model (for waiters)
const expertiseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add an expertise name"],
      unique: true,
      trim: true,
      maxlength: [50, "Expertise name cannot be more than 50 characters"],
    },
    description: {
      type: String,
      maxlength: [200, "Description cannot be more than 200 characters"],
    },
    icon: String, // Icon name or URL
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Event Type Model
const eventTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add an event type name"],
      unique: true,
      trim: true,
      maxlength: [50, "Event type name cannot be more than 50 characters"],
    },
    description: {
      type: String,
      maxlength: [200, "Description cannot be more than 200 characters"],
    },
    icon: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    suggestedVendorCategories: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Category",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Category = mongoose.model("Category", categorySchema);
export const Expertise = mongoose.model("Expertise", expertiseSchema);
export const EventType = mongoose.model("EventType", eventTypeSchema);
