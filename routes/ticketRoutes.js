const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Ticket = require('../models/Ticket');
const router = express.Router();

const generateTicketNumber = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

router.post('/create', async (req, res) => {
  const { title, description } = req.body;
  const { username } = req.user;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }
  
  const ticketNumber = generateTicketNumber();

  const newTicket = new Ticket({
    ticketNumber,
    title,
    description,
    username,
    messages: []
  });

  try {
    const savedTicket = await newTicket.save();
    res.status(201).json({ message: 'Ticket created successfully!', ticket: savedTicket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ticket.' });
  }
});

router.get('/list', async (req, res) => {
  const { username } = req.user;
  const isAdmin = req.user.role === 'administrator';

  try {
    const tickets = await Ticket.find();
    const userTickets = isAdmin ? tickets : tickets.filter(ticket => ticket.username === username);
    res.status(200).json({ tickets: userTickets });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve tickets.' });
  }
});

router.post('/message', async (req, res) => {
  const { ticketNumber, messageContent } = req.body;
  const { username } = req.user;

  if (!ticketNumber || !messageContent) {
    return res.status(400).json({ error: 'Ticket number and message content are required.' });
  }

  try {
    const ticket = await Ticket.findOne({ ticketNumber });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const newMessage = {
      messageId: uuidv4(),
      username,
      messageContent,
      sentAt: new Date()
    };

    ticket.messages.push(newMessage);
    await ticket.save();

    res.status(200).json({ message: 'Message added successfully!', ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add message.' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    res.status(200).json({ ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve ticket.' });
  }
});

router.post('/:id/close', async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'administrator';

  if (!isAdmin) {
    return res.status(403).json({ error: 'Unauthorized. Only administrators can close tickets.' });
  }

  try {
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    if (ticket.status === 'Closed') {
      return res.status(400).json({ error: 'Ticket is already closed.' });
    }

    ticket.status = 'Closed';
    ticket.closedAt = new Date();
    await ticket.save();

    res.status(200).json({ message: 'Ticket closed successfully!', ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to close ticket.' });
  }
});

module.exports = router;
