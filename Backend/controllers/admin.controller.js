const User = require("../models/User.model");
const Event = require("../models/Event.model");
const Ticket = require("../models/Ticket.model");
const { sendEmail } = require("../services/nodemailer");

//DELETE TICKET
async function deleteTicket(req, res) {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    res.json({ message: "Ticket deleted successfully" });
  } catch (err) {
    console.error('Delete ticket error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: "Invalid ticket ID" });
    }
    res.status(500).json({ error: "Server error while deleting ticket" });
  }
}


// Delete event (admin)
async function deleteEvent(req, res) {
  try {
    const event = await Event.findByIdAndDelete(req.params.id)
      .populate('organizerId', 'name email');

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Delete all tickets for this event
    const deletedTickets = await Ticket.deleteMany({ eventId: req.params.id });

    // Send notification email to admin
    const adminSubject = "EventHub - Event Deleted (Admin Action)";
    const adminMessage = `Dear ${req.user.name},

You have successfully deleted an event as an administrator.

Deleted Event Details:
- Name: ${event.name}
- Description: ${event.description}
- Genre: ${event.genre}
- Price: $${event.price}
- Organizer: ${event.organizerId.name} (${event.organizerId.email})
- Deleted Date: ${new Date().toLocaleDateString()}
- Tickets Deleted: ${deletedTickets.deletedCount}

Best regards,
EventHub Team
Developer: kunlexlatest@gmail.com`;

    await sendEmail(req.user.email, adminSubject, adminMessage);

    res.json({ 
      message: "Event and associated tickets deleted successfully",
      deletedTickets: deletedTickets.deletedCount
    });
  } catch (err) {
    console.error('Admin delete event error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: "Invalid event ID" });
    }
    
    res.status(500).json({ error: "Server error while deleting event" });
  }
}

// Get total organizers
async function getTotalOrganizers(req, res) {
  try {
    const total = await User.countDocuments({ role: "organizer" });
    res.json({ total });
  } catch (err) {
    console.error('Get total organizers error:', err);
    res.status(500).json({ error: "Server error while counting organizers" });
  }
}

// Get total attendees
async function getTotalAttendees(req, res) {
  try {
    const total = await User.countDocuments({ role: "attendee" });
    res.json({ total });
  } catch (err) {
    console.error('Get total attendees error:', err);
    res.status(500).json({ error: "Server error while counting attendees" });
  }
}

// Get total tickets
async function getTotalTickets(req, res) {
  try {
    const total = await Ticket.countDocuments();
    const sold = await Ticket.countDocuments({ isAvailable: false });
    const available = await Ticket.countDocuments({ isAvailable: true });
    
    res.json({ 
      total,
      sold,
      available
    });
  } catch (err) {
    console.error('Get total tickets error:', err);
    res.status(500).json({ error: "Server error while counting tickets" });
  }
}

// Delete attendee
async function deleteAttendee(req, res) {
  try {
    const user = await User.findOneAndDelete({ 
      _id: req.params.id, 
      role: "attendee" 
    });

    if (!user) {
      return res.status(404).json({ error: "Attendee not found" });
    }

    // Update tickets (remove attendee reference)
    await Ticket.updateMany(
      { attendeeId: req.params.id },
      { attendeeId: null, isAvailable: true }
    );

    // Send notification email to admin
    const adminSubject = "EventHub - Attendee Deleted (Admin Action)";
    const adminMessage = `Dear ${req.user.name},

You have successfully deleted an attendee account.

Deleted Attendee Details:
- Name: ${user.name}
- Email: ${user.email}
- Role: ${user.role}
- Deleted Date: ${new Date().toLocaleDateString()}

All tickets purchased by this attendee have been made available again.

Best regards,
EventHub Team
Developer: kunlexlatest@gmail.com`;

    await sendEmail(req.user.email, adminSubject, adminMessage);

    res.json({ message: "Attendee deleted successfully. Associated tickets made available again." });
  } catch (err) {
    console.error('Delete attendee error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: "Invalid attendee ID" });
    }
    
    res.status(500).json({ error: "Server error while deleting attendee" });
  }
}



// Delete organizer
async function deleteOrganizer(req, res) {
  try {
    const user = await User.findOneAndDelete({ 
      _id: req.params.id, 
      role: "organizer" 
    });

    if (!user) {
      return res.status(404).json({ error: "Organizer not found" });
    }

    // Delete organizer's events and their tickets
    const deletedEvents = await Event.deleteMany({ organizerId: req.params.id });
    const deletedTickets = await Ticket.deleteMany({ 
      eventId: { $in: await Event.find({ organizerId: req.params.id }).distinct('_id') }
    });

    // Send notification email to admin
    const adminSubject = "EventHub - Organizer Deleted (Admin Action)";
    const adminMessage = `Dear ${req.user.name},

You have successfully deleted an organizer account.

Deleted Organizer Details:
- Name: ${user.name}
- Email: ${user.email}
- Role: ${user.role}
- Deleted Date: ${new Date().toLocaleDateString()}
- Events Deleted: ${deletedEvents.deletedCount}
- Tickets Deleted: ${deletedTickets.deletedCount}

All events and tickets created by this organizer have been removed.

Best regards,
EventHub Team
Developer: kunlexlatest@gmail.com`;

    await sendEmail(req.user.email, adminSubject, adminMessage);

    res.json({ 
      message: "Organizer deleted successfully. Associated events and tickets removed.",
      deletedEvents: deletedEvents.deletedCount,
      deletedTickets: deletedTickets.deletedCount
    });
  } catch (err) {
    console.error('Delete organizer error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: "Invalid organizer ID" });
    }
    
    res.status(500).json({ error: "Server error while deleting organizer" });
  }
}

// Delete admin
async function deleteAdmin(req, res) {
  try {
    const user = await User.findOneAndDelete({ 
      _id: req.params.id, 
      role: "admin" 
    });

    if (!user) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ error: "You cannot delete your own admin account" });
    }

    // Send notification email to admin
    const adminSubject = "EventHub - Admin Account Deleted";
    const adminMessage = `Dear ${req.user.name},

You have successfully deleted an admin account.

Deleted Admin Details:
- Name: ${user.name}
- Email: ${user.email}
- Role: ${user.role}
- Deleted Date: ${new Date().toLocaleDateString()}

Best regards,
EventHub Team
Developer: kunlexlatest@gmail.com`;

    await sendEmail(req.user.email, adminSubject, adminMessage);

    res.json({ message: "Admin deleted successfully" });
  } catch (err) {
    console.error('Delete admin error:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: "Invalid admin ID" });
    }
    
    res.status(500).json({ error: "Server error while deleting admin" });
  }
}

// Get dashboard stats
async function getDashboardStats(req, res) {
  try {
    const [
      totalEvents,
      totalAttendees,
      totalOrganizers,
      totalAdmins,
      totalTickets,
      soldTickets,
      recentEvents
    ] = await Promise.all([
      Event.countDocuments(),
      User.countDocuments({ role: "attendee" }),
      User.countDocuments({ role: "organizer" }),
      User.countDocuments({ role: "admin" }),
      Ticket.countDocuments(),
      Ticket.countDocuments({ isAvailable: false }),
      Event.find().populate('organizerId', 'name email').sort({ createdAt: -1 }).limit(5)
    ]);

    res.json({
      totalEvents,
      totalAttendees,
      totalOrganizers,
      totalAdmins,
      totalTickets,
      soldTickets,
      availableTickets: totalTickets - soldTickets,
      recentEvents
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: "Server error while fetching dashboard statistics" });
  }
}

// Get all users (admin)
async function getAllUsers(req, res) {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const query = {};

    // Filter by role if provided
    if (role && ['attendee', 'organizer', 'admin'].includes(role)) {
      query.role = role;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: "Server error while fetching users" });
  }
}

// Get all events (admin)
async function getAllEvents(req, res) {
  try {
    const { page = 1, limit = 10, search, genre } = req.query;
    const query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by genre
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
}

async function getAllTickets(req, res) {
  try {
    const tickets = await Ticket.find()
      .populate('eventId', 'name')
      .populate('attendeeId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ tickets });
  } catch (err) {
    console.error('Get all tickets error:', err);
    res.status(500).json({ error: "Server error while fetching tickets" });
  }
}

module.exports = {
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
  getAllTickets,
};
