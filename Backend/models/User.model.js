const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["attendee", "organizer", "admin"],
      required: true,
    },
  },
  { timestamps: true }
);

// UserSchema.index({ email: 1 });
// UserSchema.index({ role: 1 });

module.exports = mongoose.model("User", UserSchema);
