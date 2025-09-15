const Event = require("../models/Event.model");
const Ticket = require("../models/Ticket.model");
const { sendEmail } = require("../services/nodemailer");

// Get all events
async function getAllEvents(req, res) {
  try {
    const { page = 1, limit = 10, search, category } = req.query;
    const query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by category
    if (category) {
      query.category = { $regex: category, $options: "i" };
    }

    const events = await Event.find(query)
      .populate("organizerId", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Event.countDocuments(query);

    res.json({
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (err) {
    console.error("Get events error:", err);
    res.status(500).json({ error: "Server error while fetching events" });
  }
}

// Buy ticket
async function buyTicket(req, res) {
  try {
    const { ticketId } = req.params;

    // Find the ticket
    const ticket = await Ticket.findById(ticketId)
      .populate({
        path: "eventId",
        select: "name genre price",
        populate: {
          path: "organizerId",
          select: "name email"
        }
      })
      .populate("attendeeId", "name email");

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Check if ticket is available
    if (!ticket.isAvailable) {
      return res.status(400).json({ error: "Ticket is no longer available" });
    }

    // Check if attendee already bought this ticket
    if (ticket.attendeeId && ticket.attendeeId.toString() === req.user.id) {
      return res
        .status(400)
        .json({ error: "You have already purchased this ticket" });
    }

    // Update ticket with attendee info
    ticket.attendeeId = req.user.id;
    ticket.isAvailable = false;

    // Regenerate QR code with ticket information excluding attendee details
    const QRCode = require("qrcode");
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
    // const qrData = `

    // ticketId: ${ticket._id}                                                                
    // ticketType: ${ticket.ticketType}
    // eventName: ${ticket.eventId.name}
    // eventGenre: ${ticket.eventId.genre}
    // eventPrice: ${ticket.eventId.price}
    // organizerName: ${ticket.eventId.organizerId.name}
    // organizerEmail: ${ticket.eventId.organizerId.email}
    // createdAt: ${ticket.createdAt}


    // `;
      // ticketId: ticket._id,
      // ticketType: ticket.ticketType,
      // eventName: ticket.eventId.name,
      // eventGenre: ticket.eventId.genre,
      // eventPrice: ticket.eventId.price,
      // organizerName: ticket.eventId.organizerId.name,
      // organizerEmail: ticket.eventId.organizerId.email,
      // createdAt: ticket.createdAt
    
    const qrData = generateQRData(ticket, ticket.eventId);
    ticket.qrCode = await QRCode.toDataURL((qrData));
    await ticket.save();

    // Populate the updated ticket
    const updatedTicket = await Ticket.findById(ticket._id)
      .populate("eventId", "name description genre price organizerId")
      .populate("attendeeId", "name email");

    // Send confirmation email with QR code
    const ticketSubject = "EventHub - Ticket Purchase Confirmation";
    const ticketMessage = `Dear ${req.user.name},

Congratulations! You have successfully purchased a ticket.

Ticket Details:
- Event: ${updatedTicket.eventId.name}
- Ticket Type: ${updatedTicket.ticketType}
- Genre: ${updatedTicket.eventId.genre}
- Price: $${updatedTicket.eventId.price}
- Purchase Date: ${new Date().toLocaleDateString()}

Event Details:
- Description: ${updatedTicket.eventId.description}

Your QR Code Ticket:
Please find your QR code attached to this email. You can also scan it from your dashboard.

Best regards,
EventHub Team
Developer: kunlexlatest@gmail.com`;

    // Send email with QR code attachment
    await sendEmail(req.user.email, ticketSubject, ticketMessage, ticket.qrCode);

    res.json({
      message: "Ticket purchased successfully",
      ticket: updatedTicket,
    });
  } catch (err) {
    console.error("Buy ticket error:", err);

    if (err.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid ticket ID" });
    }

    res.status(500).json({ error: "Server error while purchasing ticket" });
  }
}

// Get my tickets
async function getMyTickets(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;

    const tickets = await Ticket.find({ attendeeId: req.user.id })
      .populate("eventId", "name description genre price organizerId")
      .populate({
        path: "eventId",
        populate: {
          path: "organizerId",
          select: "name email",
        },
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Ticket.countDocuments({ attendeeId: req.user.id });

    res.json({
      tickets,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (err) {
    console.error("Get my tickets error:", err);
    res.status(500).json({ error: "Server error while fetching your tickets" });
  }
}

async function getEventById(req, res) {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate("organizerId", "name email")
      .lean();

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Find available tickets for this event
    const availableTickets = await Ticket.find({
      eventId: eventId,
      isAvailable: true,
    });

    res.json({
      event,
      availableTickets,
    });
  } catch (err) {
    console.error("Get event by ID error:", err);
    res.status(500).json({ error: "Server error while fetching event details" });
  }
}

module.exports = {
  getAllEvents,
  buyTicket,
  getMyTickets,
  getEventById,
};
