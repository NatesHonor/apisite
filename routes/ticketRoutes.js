const express = require('express')
const { v4: uuidv4 } = require('uuid')
const mongoose = require('mongoose')
const Ticket = require('../models/Ticket')

const router = express.Router()

const isValidObjectId = id => mongoose.Types.ObjectId.isValid(id)

const generateTicketNumber = async () => {
  let ticketNumber
  let exists = true

  while (exists) {
    ticketNumber = Math.floor(1000 + Math.random() * 9000)
    exists = await Ticket.exists({ ticketNumber })
  }

  return ticketNumber
}

router.post('/create', async (req, res) => {
  const { title, description } = req.body
  const { username } = req.user

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required.' })
  }

  try {
    const ticketNumber = await generateTicketNumber()

    const ticket = await Ticket.create({
      ticketNumber,
      title,
      description,
      username,
      messages: []
    })

    res.status(201).json({ ticket })
  } catch {
    res.status(500).json({ error: 'Failed to create ticket.' })
  }
})

router.get('/list', async (req, res) => {
  const { username, role } = req.user

  try {
    const query = role === 'administrator' ? {} : { username }
    const tickets = await Ticket.find(query)
    res.json({ tickets })
  } catch {
    res.status(500).json({ error: 'Failed to retrieve tickets.' })
  }
})

router.post('/message', async (req, res) => {
  const { ticketID, messageContent } = req.body
  const { username, role } = req.user

  if (!ticketID || !messageContent) {
    return res.status(400).json({ error: 'Ticket ID and message content are required.' })
  }

  if (!isValidObjectId(ticketID)) {
    return res.status(400).json({ error: 'Invalid ticket ID.' })
  }

  try {
    const ticket = await Ticket.findById(ticketID)

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' })
    }

    if (ticket.username !== username && role !== 'administrator') {
      return res.status(403).json({ error: 'Unauthorized.' })
    }

    ticket.messages.push({
      messageId: uuidv4(),
      username,
      role,
      messageContent,
      sentAt: new Date()
    })

    await ticket.save()
    res.json({ ticket })
  } catch {
    res.status(500).json({ error: 'Failed to add message.' })
  }
})

router.get('/:id', async (req, res) => {
  const { id } = req.params
  const { username, role } = req.user

  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid ticket ID.' })
  }

  try {
    const ticket = await Ticket.findById(id)

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' })
    }

    if (ticket.username !== username && role !== 'administrator') {
      return res.status(403).json({ error: 'Unauthorized.' })
    }

    res.json({ ticket })
  } catch {
    res.status(500).json({ error: 'Failed to retrieve ticket.' })
  }
})

router.post('/:id/close', async (req, res) => {
  const { id } = req.params
  const { role } = req.user

  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid ticket ID.' })
  }

  if (role !== 'administrator') {
    return res.status(403).json({ error: 'Unauthorized.' })
  }

  try {
    const ticket = await Ticket.findById(id)

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' })
    }

    if (ticket.status === 'Closed') {
      return res.status(400).json({ error: 'Ticket is already closed.' })
    }

    ticket.status = 'Closed'
    ticket.closedAt = new Date()
    await ticket.save()

    res.json({ ticket })
  } catch {
    res.status(500).json({ error: 'Failed to close ticket.' })
  }
})

module.exports = router