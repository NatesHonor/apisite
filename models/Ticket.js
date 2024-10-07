const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketNumber: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  username: { type: String, required: true },
  messages: [
    {
      messageId: { type: String, required: true },
      role: { type: String, required: true },
      username: { type: String, required: true },
      messageContent: { type: String, required: true },
      sentAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: 'Open' },
  closedAt: { type: Date }
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
