const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const sendMail = require("./services/nodemailer");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route loading with error handling
console.log("Loading auth routes...");
try {
  const authroutes = require("./routes/auth.routes");
  app.use('/api/auth', authroutes);
  console.log("✅ Auth routes loaded successfully");
} catch (error) {
  console.log("❌ Error in auth routes:", error.message);
  process.exit(1);
}

console.log("Loading attendee routes...");
try {
  const attendeeroutes = require("./routes/attendee.routes");
  app.use('/api/attendees', attendeeroutes);
  console.log("✅ Attendee routes loaded successfully");
} catch (error) {
  console.log("❌ Error in attendee routes:", error.message);
  process.exit(1);
}

console.log("Loading organizer routes...");
try {
  const organizerroutes = require("./routes/organizer.routes");
  app.use('/api/organizers', organizerroutes);
  console.log("✅ Organizer routes loaded successfully");
} catch (error) {
  console.log("❌ Error in organizer routes:", error.message);
  process.exit(1);
}

console.log("Loading admin routes...");
try {
  const adminroutes = require("./routes/admin.routes");
  app.use('/api/admin', adminroutes);
  console.log("✅ Admin routes loaded successfully");
} catch (error) {
  console.log("❌ Error in Admin routes:", error.message);
  process.exit(1);
}

// console.log("Loading Public routes...");
// try {
//   const publicroutes = require("./routes/public.routes");
//   app.use('/api/public', publicroutes);
//   console.log("✅ Public routes loaded successfully");
// } catch (error) {
//   console.log("❌ Error in Public routes:", error.message);
//   process.exit(1);
// }

app.get("/", (req, res) => res.json({ message: "EventHub API is running successfully!" }));

const PORT = process.env.PORT ;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
