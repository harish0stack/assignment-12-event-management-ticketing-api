const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const { bookingRateLimiter } = require('../middleware/rateLimiter');

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Atomic ticket booking, attendee tickets, and cancellation
 */

/**
 * @swagger
 * /api/tickets/book:
 *   post:
 *     summary: Atomic Ticket Booking (Rate Limited)
 *     description: |
 *       Decrements tickets via Firestore atomic transaction (`runTransaction`) to guarantee tickets are never oversold under concurrent traffic.
 *       **Rate Limit:** 10 requests per minute per IP to prevent ticket-scalping bots.
 *       Only users with role 'Attendee' can book tickets.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookTicketInput'
 *     responses:
 *       201:
 *         description: Tickets booked successfully
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
 *                   example: Tickets booked successfully
 *                 data:
 *                   $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Insufficient tickets, event not found, or validation failure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires Attendee role
 *       429:
 *         description: Rate limit exceeded - Too many booking requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/book',
  bookingRateLimiter,
  auth,
  checkRole('Attendee'),
  ticketController.bookTicket
);

/**
 * @swagger
 * /api/tickets/my-tickets:
 *   get:
 *     summary: View purchased tickets
 *     description: Retrieve all confirmed and cancelled tickets purchased by the authenticated attendee.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of attendee tickets
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
 *                     $ref: '#/components/schemas/Ticket'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires Attendee role
 */
router.get(
  '/my-tickets',
  auth,
  checkRole('Attendee'),
  ticketController.getMyTickets
);

/**
 * @swagger
 * /api/tickets/{id}/cancel:
 *   post:
 *     summary: Cancel ticket & restore inventory
 *     description: Atomically marks ticket as cancelled and restores the ticket inventory to the associated event via Firestore transaction.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket document ID
 *     responses:
 *       200:
 *         description: Ticket cancelled successfully and inventory restored
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
 *                   example: Ticket cancelled successfully and inventory restored
 *                 data:
 *                   $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Ticket already cancelled or event not found
 *       403:
 *         description: Forbidden - You do not own this ticket
 *       404:
 *         description: Ticket not found
 */
router.post(
  '/:id/cancel',
  auth,
  checkRole('Attendee'),
  ticketController.cancelTicket
);

module.exports = router;
