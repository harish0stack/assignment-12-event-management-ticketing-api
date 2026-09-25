const { db } = require('../config/firebaseConfig');

/**
 * Browse all upcoming events (supports ?category=Technology&city=Mumbai)
 */
exports.getEvents = async (req, res) => {
  try {
    const { category, city } = req.query;
    let query = db.collection('events');

    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    let events = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        ...data
      });
    });

    // Filter by city if specified (matches against venue field case-insensitively)
    if (city) {
      const lowerCity = city.toLowerCase();
      events = events.filter((ev) =>
        ev.venue && ev.venue.toLowerCase().includes(lowerCity)
      );
    }

    // Sort upcoming events by date
    events.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Get Events Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve events: ' + error.message
    });
  }
};

/**
 * View event details & live remaining ticket count
 */
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection('events').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const eventData = doc.data();
    res.status(200).json({
      success: true,
      data: {
        id: doc.id,
        ...eventData
      }
    });
  } catch (error) {
    console.error('Get Event By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve event: ' + error.message
    });
  }
};

/**
 * Create new event listing (Organizer only)
 */
exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      eventDate,
      venue,
      ticketPrice,
      totalCapacity
    } = req.body;

    if (
      !title ||
      !description ||
      !category ||
      !eventDate ||
      !venue ||
      ticketPrice === undefined ||
      totalCapacity === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide all required fields: title, description, category, eventDate, venue, ticketPrice, totalCapacity'
      });
    }

    const capacity = parseInt(totalCapacity, 10);
    const price = parseFloat(ticketPrice);

    if (isNaN(capacity) || capacity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'totalCapacity must be a positive integer'
      });
    }

    if (isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'ticketPrice must be a valid non-negative number'
      });
    }

    const eventRef = db.collection('events').doc();
    const newEvent = {
      id: eventRef.id,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      eventDate: new Date(eventDate).toISOString(),
      venue: venue.trim(),
      organizerId: req.user.id,
      ticketPrice: price,
      totalCapacity: capacity,
      availableTickets: capacity,
      createdAt: new Date().toISOString()
    };

    await eventRef.set(newEvent);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: newEvent
    });
  } catch (error) {
    console.error('Create Event Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event: ' + error.message
    });
  }
};

/**
 * Update event details (Organizer must own event)
 */
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const eventRef = db.collection('events').doc(id);
    const doc = await eventRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const eventData = doc.data();

    // Verify ownership
    if (eventData.organizerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to update this event.'
      });
    }

    const updates = {};
    const allowedFields = [
      'title',
      'description',
      'category',
      'eventDate',
      'venue',
      'ticketPrice'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'eventDate') {
          updates[field] = new Date(req.body[field]).toISOString();
        } else if (field === 'ticketPrice') {
          updates[field] = parseFloat(req.body[field]);
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    // Optional capacity change handling: only allow increase
    if (req.body.totalCapacity !== undefined) {
      const newCapacity = parseInt(req.body.totalCapacity, 10);
      if (newCapacity < eventData.totalCapacity) {
        return res.status(400).json({
          success: false,
          message: 'Cannot decrease totalCapacity of an existing event.'
        });
      }
      const capacityDiff = newCapacity - eventData.totalCapacity;
      updates.totalCapacity = newCapacity;
      updates.availableTickets = eventData.availableTickets + capacityDiff;
    }

    updates.updatedAt = new Date().toISOString();

    await eventRef.update(updates);

    const updatedDoc = await eventRef.get();

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error('Update Event Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event: ' + error.message
    });
  }
};

/**
 * Cancel and delete event (Organizer must own event)
 */
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const eventRef = db.collection('events').doc(id);
    const doc = await eventRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const eventData = doc.data();

    // Verify ownership
    if (eventData.organizerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to delete this event.'
      });
    }

    await eventRef.delete();

    res.status(200).json({
      success: true,
      message: 'Event cancelled and deleted successfully'
    });
  } catch (error) {
    console.error('Delete Event Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event: ' + error.message
    });
  }
};

/**
 * List all registered attendees for an event (Organizer must own event)
 */
exports.getEventAttendees = async (req, res) => {
  try {
    const { id } = req.params;
    const eventRef = db.collection('events').doc(id);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const eventData = eventDoc.data();

    // Verify ownership
    if (eventData.organizerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to view attendees for this event.'
      });
    }

    const ticketsSnapshot = await db
      .collection('tickets')
      .where('eventId', '==', id)
      .where('status', '==', 'confirmed')
      .get();

    const attendees = [];
    ticketsSnapshot.forEach((doc) => {
      const ticket = doc.data();
      attendees.push({
        ticketId: doc.id,
        userId: ticket.userId,
        attendeeName: ticket.attendeeName,
        attendeeEmail: ticket.attendeeEmail,
        quantity: ticket.quantity,
        totalPaid: ticket.totalPaid,
        bookingRef: ticket.bookingRef,
        bookedAt: ticket.bookedAt
      });
    });

    res.status(200).json({
      success: true,
      eventId: id,
      eventTitle: eventData.title,
      totalAttendees: attendees.length,
      data: attendees
    });
  } catch (error) {
    console.error('Get Attendees Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendees: ' + error.message
    });
  }
};
