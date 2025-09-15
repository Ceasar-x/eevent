const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const MONGO = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO);
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
