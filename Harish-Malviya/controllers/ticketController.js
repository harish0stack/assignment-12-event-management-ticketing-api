const { db } = require('../config/firebaseConfig');

/**
 * Atomic Ticket Booking using Firestore ACID Transaction (runTransaction)
 * Decrements tickets safely under high concurrency and creates ticket record.
 */
exports.bookTicket = async (req, res) => {
  const { eventId, quantity, attendeeName, attendeeEmail } = req.body;
  const userId = req.user.id;
  const qty = parseInt(quantity, 10);

  if (!eventId || !qty || !attendeeName || !attendeeEmail) {
    return res.status(400).json({
      success: false,
      message:
        'Please provide all required fields: eventId, quantity, attendeeName, attendeeEmail'
    });
  }

  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Quantity must be a positive integer greater than 0'
    });
  }

  const eventRef = db.collection('events').doc(eventId);
  const ticketRef = db.collection('tickets').doc();

  try {
    const result = await db.runTransaction(async (t) => {
      const eventDoc = await t.get(eventRef);
      if (!eventDoc.exists) {
        throw new Error('Event not found');
      }

      const eventData = eventDoc.data();

      // Check remaining ticket inventory
      if (eventData.availableTickets < qty) {
        throw new Error(
          `Insufficient tickets available. Only ${eventData.availableTickets} tickets left.`
        );
      }

      // 1. Decrement available tickets
      t.update(eventRef, {
        availableTickets: eventData.availableTickets - qty
      });

      // 2. Create ticket document
      const bookingRef = `TKT-${Date.now().toString().slice(-6)}`;
      const newTicket = {
        id: ticketRef.id,
        eventId,
        eventTitle: eventData.title,
        userId,
        attendeeName: attendeeName.trim(),
        attendeeEmail: attendeeEmail.toLowerCase().trim(),
        quantity: qty,
        totalPaid: qty * eventData.ticketPrice,
        bookingRef,
        status: 'confirmed',
        bookedAt: new Date().toISOString()
      };

      t.set(ticketRef, newTicket);
      return newTicket;
    });

    res.status(201).json({
      success: true,
      message: 'Tickets booked successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Retrieve all tickets purchased by the authenticated attendee
 */
exports.getMyTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const ticketsSnapshot = await db
      .collection('tickets')
      .where('userId', '==', userId)
      .get();

    const tickets = [];
    ticketsSnapshot.forEach((doc) => {
      tickets.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort by bookedAt descending
    tickets.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    console.error('Get My Tickets Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tickets: ' + error.message
    });
  }
};

/**
 * Cancel ticket & restore ticket inventory to event via atomic transaction
 */
exports.cancelTicket = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const ticketRef = db.collection('tickets').doc(id);

  try {
    const result = await db.runTransaction(async (t) => {
      const ticketDoc = await t.get(ticketRef);
      if (!ticketDoc.exists) {
        throw new Error('Ticket not found');
      }

      const ticketData = ticketDoc.data();

      // Ensure ticket belongs to the requester
      if (ticketData.userId !== userId) {
        throw new Error('Forbidden. You do not own this ticket.');
      }

      // Check if ticket is already cancelled
      if (ticketData.status === 'cancelled') {
        throw new Error('Ticket is already cancelled');
      }

      const eventRef = db.collection('events').doc(ticketData.eventId);
      const eventDoc = await t.get(eventRef);

      // Restore available tickets if event still exists
      if (eventDoc.exists) {
        const eventData = eventDoc.data();
        const restoredTickets = Math.min(
          eventData.totalCapacity,
          eventData.availableTickets + ticketData.quantity
        );
        t.update(eventRef, {
          availableTickets: restoredTickets
        });
      }

      // Update ticket status
      const updatedTicket = {
        ...ticketData,
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      };

      t.update(ticketRef, {
        status: 'cancelled',
        cancelledAt: updatedTicket.cancelledAt
      });

      return updatedTicket;
    });

    res.status(200).json({
      success: true,
      message: 'Ticket cancelled successfully and inventory restored',
      data: result
    });
  } catch (error) {
    console.error('Cancel Ticket Error:', error);
    const status = error.message.includes('Forbidden') ? 403 : 400;
    res.status(status).json({
      success: false,
      message: error.message
    });
  }
};
