const express = require("express");
const auth = require("../middleware/auth");
const { allowRoles } = require("../middleware/rbac");
const {
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  createTicket,
  getMyEvents
} = require("../controllers/organizer.controller");

const router = express.Router();


router.use(auth, allowRoles("organizer"));

router.post("/events", createEvent);

router.get("/events", getMyEvents);

router.get("/events/:id", getEventById);

router.put("/events/:id", updateEvent);

router.delete("/events/:id", deleteEvent);

router.post("/tickets/:eventId", createTicket);

module.exports = router;