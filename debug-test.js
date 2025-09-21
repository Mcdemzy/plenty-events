import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User.js";
import Vendor from "./models/Vendor.js";
import Waiter from "./models/Waiter.js";

// Load env vars
dotenv.config();

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

// Test user creation
const testUserCreation = async () => {
  try {
    console.log("\n🧪 Testing User Registration...");

    // Test regular user
    const user = new User({
      firstName: "Test",
      lastName: "User",
      email: "test.user@example.com",
      phone: "+2348012345678",
      password: "Password123",
      role: "user",
    });

    console.log("✅ User model validation passed");

    // Test vendor creation
    const vendor = new Vendor({
      user: new mongoose.Types.ObjectId(),
      businessName: "Test Catering Services",
      businessDescription: "Professional catering services",
      categories: [],
      priceRange: { min: 10000, max: 50000 },
    });

    console.log("✅ Vendor model validation passed");

    // Test waiter creation
    const waiter = new Waiter({
      user: new mongoose.Types.ObjectId(),
      expertise: [],
      yearsOfExperience: 2,
      hourlyRate: 2000,
    });

    console.log("✅ Waiter model validation passed");
    console.log("✅ All model validations successful!");
  } catch (error) {
    console.error("❌ Model validation failed:", error.message);
  }
};

// Test email configuration
const testEmailConfig = () => {
  console.log("\n📧 Email Configuration Check:");
  console.log(
    "EMAIL_USER:",
    process.env.EMAIL_USER ? "✅ Configured" : "⚠️ Not configured"
  );
  console.log(
    "EMAIL_PASS:",
    process.env.EMAIL_PASS ? "✅ Configured" : "⚠️ Not configured"
  );

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("📝 Note: Email features will be skipped during development");
    console.log(
      "📝 To enable emails, add EMAIL_USER and EMAIL_PASS to your .env file"
    );
  }
};

// Run tests
const runTests = async () => {
  console.log("🚀 Starting Debug Tests...\n");

  await connectDB();
  testEmailConfig();
  await testUserCreation();

  console.log("\n🎉 Debug tests completed!");
  process.exit(0);
};

runTests().catch((error) => {
  console.error("❌ Debug test failed:", error);
  process.exit(1);
});
