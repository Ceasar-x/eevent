const express = require("express");
const Event = require("../models/Event.model");
const Ticket = require("../models/Ticket.model");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10, search, genre } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (genre) {
      query.genre = { $regex: genre, $options: 'i' };
    }

    const events = await Event.find(query)
      .populate('organizerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Event.countDocuments(query);

    res.json({
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: "Server error while fetching events" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizerId', 'name email');

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Get available tickets for this event
    const tickets = await Ticket.find({ 
      eventId: req.params.id, 
      isAvailable: true 
    });

    res.json({
      event,
      availableTickets: tickets
    });
  } catch (err) {
    console.error('Get event error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: "Invalid event ID" });
    }
    
    res.status(500).json({ error: "Server error while fetching event" });
  }
});

module.exports = router;