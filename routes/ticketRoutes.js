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

router.post('/create', (req, res) => {
  const { title, description } = req.body;
  const { username } = req.user;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }
  const ticketNumber = generateTicketNumber();

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

const generateTicketNumber = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

router.get('/list', (req, res) => {
  const { username } = req.user;
  const tickets = readTicketsFile();
  const isAdmin = req.user.role === 'administrator';
  const userTickets = isAdmin ? tickets : tickets.filter(ticket => ticket.username === username);
  res.status(200).json({ tickets: userTickets });
});

router.post('/message', (req, res) => {
  const { ticketNumber, messageContent } = req.body;
  const { username } = req.user;

  console.log('Received message request:');
  console.log('Username:', username);
  console.log('Ticket number:', ticketNumber);
  console.log('Message content:', messageContent);

  if (!ticketNumber || !messageContent) {
    console.error('Error: Missing ticket number or message content');
    return res.status(400).json({ error: 'Ticket number and message content are required.' });
  }

  const tickets = readTicketsFile();
  const ticket = tickets.find(t => t.ticketNumber === parseInt(ticketNumber));

  if (!ticket) {
    console.error(`Error: Ticket with number ${ticketNumber} not found`);
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  const newMessage = {
    messageId: uuidv4(),
    username,
    messageContent,
    sentAt: new Date()
  };

  console.log('New message:', newMessage);

  ticket.messages.push(newMessage);
  writeTicketsFile(tickets);

  console.log('Message added successfully to ticket:', ticketNumber);
  res.status(200).json({ message: 'Message added successfully!', ticket });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  console.log(`Fetching details for ticket ID: ${id}`);

  const tickets = readTicketsFile();
  const ticket = tickets.find(t => t.id === id);

  if (!ticket) {
    console.error(`Error: Ticket with ID ${id} not found`);
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  console.log(`Ticket found:`, ticket);
  res.status(200).json({ ticket });
});

router.post('/:id/close', (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'administrator';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Unauthorized. Only administrators can close tickets.' });
  }

  const tickets = readTicketsFile();
  const ticket = tickets.find(t => t.id === id);

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  if (ticket.status === 'Closed') {
    return res.status(400).json({ error: 'Ticket is already closed.' });
  }

  ticket.status = 'Closed';
  ticket.closedAt = new Date();

  writeTicketsFile(tickets);

  res.status(200).json({ message: 'Ticket closed successfully!', ticket });
});


module.exports = router;
