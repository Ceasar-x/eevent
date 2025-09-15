const express = require("express");
const auth = require("../middleware/auth");
const { allowRoles } = require("../middleware/rbac");
const {
  deleteEvent,
  getTotalOrganizers,
  getTotalAttendees,
  getTotalTickets,
  deleteAttendee,
  deleteOrganizer,
  deleteAdmin,
  getDashboardStats,
  getAllUsers,
  getAllEvents,
  deleteTicket,
  getAllTickets
} = require("../controllers/admin.controller");

const router = express.Router();


router.use(auth, allowRoles("admin"));

router.get("/dashboard/stats", getDashboardStats);

router.get("/organizers", getTotalOrganizers);

router.get("/attendees", getTotalAttendees);

// Add route to get all tickets for admin
router.get("/tickets", getAllTickets);

// Delete ticket route for admin
router.delete("/tickets/:id", deleteTicket);

router.get("/users", getAllUsers);

router.delete("/attendees/:id", deleteAttendee);

router.delete("/organizers/:id", deleteOrganizer);

router.delete("/admins/:id", deleteAdmin);

router.get("/events", getAllEvents);

router.delete("/events/:id", deleteEvent);

module.exports = router;
