const express = require('express');
const fs = require('fs');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const ticketsFilePath = path.join(__dirname, '../tickets.json');
const readTicketsFile = () => {
  if (!fs.existsSync(ticketsFilePath)) {
    return [];
  }
  const data = fs.readFileSync(ticketsFilePath, 'utf8');
  return JSON.parse(data);
};
const writeTicketsFile = (data) => {
  fs.writeFileSync(ticketsFilePath, JSON.stringify(data, null, 2), 'utf8');
};
const validateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  next();
};

router.post('/create', validateToken, (req, res) => {
  const { title, description, username } = req.body;
  if (!title || !description || !username) {
    return res.status(400).json({ error: 'Title, description, and username are required.' });
  }
  const ticketNumber = Math.floor(1000 + Math.random() * 9000);
  const newTicket = {
    id: uuidv4(),
    ticketNumber,
    title,
    description,
    username,
    messages: [],
    createdAt: new Date(),
    status: 'Open'
  };

  const tickets = readTicketsFile();
  tickets.push(newTicket);
  writeTicketsFile(tickets);

  res.status(201).json({ message: 'Ticket created successfully!', ticket: newTicket });
});

router.post('/message', validateToken, (req, res) => {
  const { ticketNumber, username, messageContent } = req.body;

  if (!ticketNumber || !username || !messageContent) {
    return res.status(400).json({ error: 'Ticket number, username, and message content are required.' });
  }

  const tickets = readTicketsFile();
  const ticket = tickets.find(t => t.ticketNumber === parseInt(ticketNumber));

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
  writeTicketsFile(tickets);

  res.status(200).json({ message: 'Message added successfully!', ticket });
});

module.exports = router;
