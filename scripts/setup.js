import dotenv from "dotenv";
import mongoose from "mongoose";
import { Category, Expertise, EventType } from "../models/Reference.js";
import User from "../models/User.js";

// Load env vars
dotenv.config();

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

// Sample data
const categories = [
  {
    name: "Catering",
    description: "Food and beverage services for events",
    icon: "utensils",
  },
  {
    name: "Decoration",
    description: "Event decoration and styling services",
    icon: "palette",
  },
  {
    name: "Photography",
    description: "Professional photography services",
    icon: "camera",
  },
  {
    name: "Videography",
    description: "Professional videography services",
    icon: "video",
  },
  {
    name: "Entertainment",
    description: "Music, DJ, and entertainment services",
    icon: "music",
  },
  {
    name: "Venue",
    description: "Event venue rental services",
    icon: "building",
  },
  {
    name: "Transportation",
    description: "Event transportation services",
    icon: "car",
  },
  {
    name: "Security",
    description: "Event security services",
    icon: "shield",
  },
  {
    name: "Lighting & Sound",
    description: "Audio visual and lighting services",
    icon: "volume-2",
  },
  {
    name: "Planning & Coordination",
    description: "Event planning and coordination services",
    icon: "calendar",
  },
];

const expertise = [
  {
    name: "Serving",
    description: "Food and beverage serving",
    icon: "coffee",
  },
  {
    name: "Bartending",
    description: "Professional bartending services",
    icon: "wine",
  },
  {
    name: "Cleaning",
    description: "Event cleanup and maintenance",
    icon: "trash-2",
  },
  {
    name: "Setup & Breakdown",
    description: "Event setup and breakdown assistance",
    icon: "settings",
  },
  {
    name: "Guest Relations",
    description: "Guest reception and assistance",
    icon: "users",
  },
  {
    name: "Kitchen Assistant",
    description: "Kitchen and food preparation assistance",
    icon: "chef-hat",
  },
  {
    name: "Security Assistant",
    description: "Event security and crowd control",
    icon: "shield-check",
  },
  {
    name: "Ushering",
    description: "Guest ushering and guidance",
    icon: "navigation",
  },
];

const eventTypes = [
  {
    name: "Wedding",
    description: "Wedding ceremonies and receptions",
    icon: "heart",
    suggestedVendorCategories: [],
  },
  {
    name: "Birthday Party",
    description: "Birthday celebrations and parties",
    icon: "gift",
    suggestedVendorCategories: [],
  },
  {
    name: "Corporate Event",
    description: "Business meetings, conferences, and corporate gatherings",
    icon: "briefcase",
    suggestedVendorCategories: [],
  },
  {
    name: "Conference",
    description: "Professional conferences and seminars",
    icon: "presentation",
    suggestedVendorCategories: [],
  },
  {
    name: "Baby Shower",
    description: "Baby shower celebrations",
    icon: "baby",
    suggestedVendorCategories: [],
  },
  {
    name: "Graduation",
    description: "Graduation ceremonies and parties",
    icon: "graduation-cap",
    suggestedVendorCategories: [],
  },
  {
    name: "Anniversary",
    description: "Anniversary celebrations",
    icon: "calendar-heart",
    suggestedVendorCategories: [],
  },
  {
    name: "Festival",
    description: "Cultural and music festivals",
    icon: "music",
    suggestedVendorCategories: [],
  },
  {
    name: "Funeral/Memorial",
    description: "Funeral and memorial services",
    icon: "flower",
    suggestedVendorCategories: [],
  },
  {
    name: "Other",
    description: "Other types of events",
    icon: "more-horizontal",
    suggestedVendorCategories: [],
  },
];

// Setup function
const setupDatabase = async () => {
  try {
    await connectDB();

    console.log("Setting up database...");

    // Clear existing data
    await Category.deleteMany({});
    await Expertise.deleteMany({});
    await EventType.deleteMany({});

    console.log("Existing reference data cleared");

    // Insert categories
    const createdCategories = await Category.insertMany(categories);
    console.log(`${createdCategories.length} categories created`);

    // Insert expertise
    const createdExpertise = await Expertise.insertMany(expertise);
    console.log(`${createdExpertise.length} expertise areas created`);

    // Insert event types with suggested categories
    const eventTypesWithCategories = eventTypes.map((eventType) => {
      switch (eventType.name) {
        case "Wedding":
          eventType.suggestedVendorCategories = createdCategories
            .filter((cat) =>
              [
                "Catering",
                "Photography",
                "Decoration",
                "Entertainment",
                "Venue",
              ].includes(cat.name)
            )
            .map((cat) => cat._id);
          break;
        case "Corporate Event":
        case "Conference":
          eventType.suggestedVendorCategories = createdCategories
            .filter((cat) =>
              [
                "Catering",
                "Venue",
                "Lighting & Sound",
                "Transportation",
              ].includes(cat.name)
            )
            .map((cat) => cat._id);
          break;
        case "Birthday Party":
          eventType.suggestedVendorCategories = createdCategories
            .filter((cat) =>
              [
                "Catering",
                "Decoration",
                "Entertainment",
                "Photography",
              ].includes(cat.name)
            )
            .map((cat) => cat._id);
          break;
        default:
          eventType.suggestedVendorCategories = createdCategories
            .filter((cat) => ["Catering", "Decoration"].includes(cat.name))
            .map((cat) => cat._id);
      }
      return eventType;
    });

    const createdEventTypes = await EventType.insertMany(
      eventTypesWithCategories
    );
    console.log(`${createdEventTypes.length} event types created`);

    // Create admin user if it doesn't exist
    const adminEmail = "admin@plentyevents.com";
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const adminUser = await User.create({
        firstName: "Super",
        lastName: "Admin",
        email: adminEmail,
        phone: "+2348000000000",
        password: "Admin@123",
        role: "admin",
        isApproved: true,
        isEmailVerified: true,
      });

      console.log("Admin user created with email:", adminEmail);
      console.log(
        "Admin password: Admin@123 (Please change this after first login)"
      );
    } else {
      console.log("Admin user already exists");
    }

    console.log("\n✅ Database setup completed successfully!");
    console.log("\nReference data created:");
    console.log(`- ${createdCategories.length} vendor categories`);
    console.log(`- ${createdExpertise.length} waiter expertise areas`);
    console.log(`- ${createdEventTypes.length} event types`);
    console.log("\nYou can now start using the API!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
};

// Run setup
setupDatabase();
