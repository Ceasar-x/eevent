const express = require("express");
const auth = require("../middleware/auth");
const { allowRoles } = require("../middleware/rbac");
const {
  getAllEvents,
  buyTicket,
  getMyTickets,
  getEventById
} = require("../controllers/attendee.controller");

const router = express.Router();


router.use(auth, allowRoles("attendee"));

router.get("/events", getAllEvents);

router.get("/events/:eventId", getEventById);

router.post("/tickets/buy/:ticketId", buyTicket);

router.get("/tickets/mine", getMyTickets);

module.exports = router;
