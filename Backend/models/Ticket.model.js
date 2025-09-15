const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    ticketType: {
      type: String,
      required: true,
      trim: true,
    },
    attendeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    qrCode: {
      type: String,
      default: null,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

TicketSchema.index({ eventId: 1 });
TicketSchema.index({ attendeeId: 1 });
TicketSchema.index({ isAvailable: 1 });

module.exports = mongoose.model("Ticket", TicketSchema);
