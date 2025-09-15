const Event = require("../models/Event.model");
const Ticket = require("../models/Ticket.model");
const QRCode = require("qrcode");
const { sendEmail } = require("../services/nodemailer");

// Create event
async function createEvent(req, res) {
  try {
    const { name, description, genre, category, price } = req.body;

    // Validation
    if (!name || !description || !genre || !category || price === undefined) {
      return res.status(400).json({ error: "Name, description, genre, category, and price are required" });
    }

    if (price < 0) {
      return res.status(400).json({ error: "Price cannot be negative" });
    }

    // Create event
    const event = await Event.create({
      name: name.trim(),
      description: description.trim(),
      genre: genre.trim(),
      category: category.trim(),
      price: parseFloat(price),
      organizerId: req.user.id
    });

    // Populate organizer info
    const populatedEvent = await Event.findById(event._id)
      .populate('organizerId', 'name email');

    // Send confirmation email
    const eventSubject = "EventHub - Event Created Successfully";
    const eventMessage = `Dear ${req.user.name},

Congratulations! You have successfully created a new event.

Event Details:
- Name: ${event.name}
- Description: ${event.description}
- Genre: ${event.genre}
- Price: $${event.price}
- Created Date: ${new Date().toLocaleDateString()}

Your event is now live and attendees can view it. You can create tickets for this event from your organizer dashboard.

Best regards,
EventHub Team
Developer: kunlexlatest@gmail.com`;

    await sendEmail(req.user.email, eventSubject, eventMessage);

    res.status(201).json({
      message: "Event created successfully",
      event: populatedEvent
    });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: "Server error while creating event" });
  }
}

// Get event by ID
async function getEventById(req, res) {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizerId', 'name email');

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Get tickets for this event
    const tickets = await Ticket.find({ eventId: req.params.id })
      .populate('attendeeId', 'name email');

    res.json({
      event,
      tickets
    });
  } catch (err) {
    console.error('Get event error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: "Invalid event ID" });
    }
    
    res.status(500).json({ error: "Server error while fetching event" });
  }
}

// Update event
async function updateEvent(req, res) {
  try {
    const { name, description, genre, category, price } = req.body;
    const updates = {};

    if (name) updates.name = name.trim();
    if (description) updates.description = description.trim();
    if (genre) updates.genre = genre.trim();
    if (category) updates.category = category.trim();
    if (price !== undefined) {
      if (price < 0) {
        return res.status(400).json({ error: "Price cannot be negative" });
      }
      updates.price = parseFloat(price);
    }

    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, organizerId: req.user.id }, // Only update own events
      updates,
      { new: true, runValidators: true }
    ).populate('organizerId', 'name email');

    if (!event) {
      return res.status(404).json({ error: "Event not found or unauthorized" });
    }

    res.json({ 
      message: "Event updated successfully", 
      event 
    });
  } catch (err) {
    console.error('Update event error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: "Invalid event ID" });
    }
    
    res.status(500).json({ error: "Server error while updating event" });
  }
}

// Delete event
async function deleteEvent(req, res) {
  try {
    const event = await Event.findOneAndDelete({ 
      _id: req.params.id, 
      organizerId: req.user.id 
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found or unauthorized" });
    }

    // Delete all tickets for this event
    await Ticket.deleteMany({ eventId: req.params.id });

    // Send confirmation email
    const deleteSubject = "EventHub - Event Deleted";
    const deleteMessage = `Dear ${req.user.name},

You have successfully deleted your event.

Deleted Event Details:
- Name: ${event.name}
- Description: ${event.description}
- Genre: ${event.genre}
- Price: $${event.price}
- Deleted Date: ${new Date().toLocaleDateString()}

All associated tickets have also been removed.

Best regards,
EventHub Team
Developer: kunlexlatest@gmail.com`;

    await sendEmail(req.user.email, deleteSubject, deleteMessage);

    res.json({ message: "Event and associated tickets deleted successfully" });
  } catch (err) {
    console.error('Delete event error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: "Invalid event ID" });
    }
    
    res.status(500).json({ error: "Server error while deleting event" });
  }
}

async function createTicket(req, res) {
  try {
    const { eventId } = req.params;
    const { ticketType } = req.body;

    if (!ticketType) {
      return res.status(400).json({ error: "Ticket type is required" });
    }

    // Verify event exists and belongs to organizer
    const event = await Event.findOne({ _id: eventId, organizerId: req.user.id })
      .populate('organizerId', 'name email');

    if (!event) {
      return res.status(404).json({ error: "Event not found or unauthorized" });
    }

    // Create ticket
    const ticket = await Ticket.create({
      eventId: eventId,
      ticketType: ticketType.trim(),
      isAvailable: true
    });

    // Generate QR code data with ticket details (excluding attendee info)
    function generateQRData(ticket, event) {
      const padWidth = 15;

      const line = (label, value) =>
        label.padEnd(padWidth, " ") + ": " + value;
      return `
      ${line("Ticket ID", ticket._id).trim()}
      ${line("Ticket Type", ticket.ticketType).trim()}
      ${line("Event Name", event.name).trim()}
      ${line("Event Genre", event.genre).trim()}
      ${line("Event Price", `$${event.price}`).trim()}
      ${line("Organizer Name", event.organizerId.name || 'N/A').trim()}
      ${line("Organizer Email", event.organizerId.email || 'N/A').trim()}
      ${line("Created At", ticket.createdAt.toLocaleString()).trim()}
      `.trim();
    }

    const qrData = generateQRData(ticket, event);

    // Generate QR code for the ticket
    const qrCodeImage = await QRCode.toDataURL(qrData);
    ticket.qrCode = qrCodeImage;
    await ticket.save();

    // Populate event info including qrCode
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('eventId', 'name description genre price organizerId')
      .populate('attendeeId', 'name email')
      .lean();

    populatedTicket.qrCode = ticket.qrCode;

    res.status(201).json({
      message: "Ticket created successfully",
      ticket: populatedTicket
    });
  } catch (err) {
    console.error('Create ticket error:', err);

    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    res.status(500).json({ error: "Server error while creating ticket" });
  }
}

// Get my events
async function getMyEvents(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;

    const events = await Event.find({ organizerId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Event.countDocuments({ organizerId: req.user.id });

    res.json({
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error('Get my events error:', err);
    res.status(500).json({ error: "Server error while fetching your events" });
  }
}

module.exports = {
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  createTicket,
  getMyEvents
};