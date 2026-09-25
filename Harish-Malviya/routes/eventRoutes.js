const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event listing, creation, and management
 */

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Browse all upcoming events
 *     description: Retrieve all upcoming events, sorted by eventDate ascending. Supports optional query filters for category and city.
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter events by category (e.g. Technology, Music, Sports)
 *         example: Technology
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter events by city or venue location
 *         example: Mumbai
 *     responses:
 *       200:
 *         description: List of upcoming events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 */
router.get('/', eventController.getEvents);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: View event details & live remaining ticket count
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event not found
 */
router.get('/:id', eventController.getEventById);

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create new event listing
 *     description: Only authenticated users with the 'Organizer' role can create events. availableTickets is initialized to totalCapacity.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEventInput'
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Event created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Missing or invalid event input fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires Organizer role
 */
router.post('/', auth, checkRole('Organizer'), eventController.createEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Update event details
 *     description: Organizers can only update events that they created.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEventInput'
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Event updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       403:
 *         description: Forbidden - Not event owner
 *       404:
 *         description: Event not found
 */
router.put('/:id', auth, checkRole('Organizer'), eventController.updateEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Cancel and delete event listing
 *     description: Organizers can only delete events that they created.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       403:
 *         description: Forbidden - Not event owner
 *       404:
 *         description: Event not found
 */
router.delete('/:id', auth, checkRole('Organizer'), eventController.deleteEvent);

/**
 * @swagger
 * /api/events/{id}/attendees:
 *   get:
 *     summary: List all registered attendees for the event
 *     description: Retrieve all confirmed attendee ticket bookings for an event. Organizer must own the event.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: List of registered attendees
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 eventId:
 *                   type: string
 *                   example: event_techconf_2026
 *                 eventTitle:
 *                   type: string
 *                   example: Global Cloud & AI Summit 2026
 *                 totalAttendees:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ticketId: { type: string }
 *                       userId: { type: string }
 *                       attendeeName: { type: string }
 *                       attendeeEmail: { type: string }
 *                       quantity: { type: integer }
 *                       totalPaid: { type: number }
 *                       bookingRef: { type: string }
 *                       bookedAt: { type: string }
 *       403:
 *         description: Forbidden - Not event owner
 *       404:
 *         description: Event not found
 */
router.get('/:id/attendees', auth, checkRole('Organizer'), eventController.getEventAttendees);

module.exports = router;
