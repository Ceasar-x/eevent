const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const { sendEmail } = require("../services/nodemailer");

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: "Name, email, password, and role are required"
      });
    }

    if (!["attendee", "organizer", "admin"].includes(role)) {
      return res.status(400).json({
        error: "Invalid role. Must be attendee, organizer, or admin"
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Please provide a valid email address"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long"
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
    const hashed = await bcrypt.hash(password, rounds);

    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      role: role
    });

    await newUser.save();

    const welcomeSubject = "Welcome to EventHub";
    const welcomeMessage = `Dear ${newUser.name},

Welcome to EventHub! Your ${newUser.role} account has been successfully created.

Account Details:
- Name: ${newUser.name}
- Email: ${newUser.email}
- Role: ${newUser.role}

You can now login to your dashboard and start using the platform.

Best regards,
EventHub Team
Developer: kunlexlatest@gmail.com`;

    try {
      await sendEmail(newUser.email, welcomeSubject, welcomeMessage);
    } catch (emailError) {
      console.log("Email sending failed:", emailError.message);
    }

    const safeUser = newUser.toObject();
    delete safeUser.password;

    res.status(201).json({
      message: "User registered successfully",
      user: safeUser
    });

  } catch (err) {
    console.error("Registration error:", err);
    
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email already exists" });
    }
    
    res.status(500).json({ error: "Server error during registration" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.json({
      message: "Login successful",
      token,
      user: safeUser
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
};

module.exports = {
  registerUser,
  loginUser
};