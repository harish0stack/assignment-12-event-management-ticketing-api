const swaggerJsDoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '🎟️ Event Management & Ticketing API',
      version: '1.0.0',
      description: `
**Student Name:** Harish Malviya | **Roll No:** 150096725162
### High-Concurrency Event Ticketing & Live Booking REST API
Engineered with Google Firebase Firestore, JWT Role-Based Access Control (Organizer vs Attendee), API Rate Limiting for bot/scalper protection, and Firestore ACID Transactions (\`runTransaction\`) to guarantee zero overselling.

---
### 🔐 Authentication Flow
1. Register as **Organizer** or **Attendee** via \`/api/auth/register\`.
2. Login via \`/api/auth/login\` to obtain a Bearer JWT token.
3. Click the **Authorize** button on the top right and enter your Bearer token in the format: \`<token>\`.
      `,
      contact: {
        name: 'Harish Malviya',
        email: 'harishmalviya@example.com'
      }
    },
    servers: [
      {
        url: '/',
        description: 'Current Environment / Live Render Server'
      },
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token> or simply <token>'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'usr_organizer_01' },
            name: { type: 'string', example: 'Harish Malviya' },
            email: { type: 'string', format: 'email', example: 'harishmalviya@example.com' },
            role: { type: 'string', enum: ['Organizer', 'Attendee'], example: 'Organizer' },
            createdAt: { type: 'string', format: 'date-time', example: '2026-03-01T10:00:00Z' }
          }
        },
        RegisterInput: {
          type: 'object',
          required: ['name', 'email', 'password', 'role'],
          properties: {
            name: { type: 'string', example: 'Harish Malviya' },
            email: { type: 'string', format: 'email', example: 'harishmalviya@example.com' },
            password: { type: 'string', format: 'password', example: 'Password123' },
            role: { type: 'string', enum: ['Organizer', 'Attendee'], example: 'Organizer' }
          }
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'harishmalviya@example.com' },
            password: { type: 'string', format: 'password', example: 'Password123' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Authentication successful' },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: { $ref: '#/components/schemas/User' }
          }
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'event_techconf_2026' },
            title: { type: 'string', example: 'Global Cloud & AI Summit 2026' },
            description: { type: 'string', example: 'Annual flagship backend conference' },
            category: { type: 'string', example: 'Technology' },
            eventDate: { type: 'string', format: 'date-time', example: '2026-06-15T09:00:00Z' },
            venue: { type: 'string', example: 'Bandra Kurla Complex, Mumbai' },
            organizerId: { type: 'string', example: 'usr_organizer_01' },
            ticketPrice: { type: 'number', example: 1499 },
            totalCapacity: { type: 'integer', example: 500 },
            availableTickets: { type: 'integer', example: 482 },
            createdAt: { type: 'string', format: 'date-time', example: '2026-03-01T12:00:00Z' }
          }
        },
        CreateEventInput: {
          type: 'object',
          required: ['title', 'description', 'category', 'eventDate', 'venue', 'ticketPrice', 'totalCapacity'],
          properties: {
            title: { type: 'string', example: 'Global Cloud & AI Summit 2026' },
            description: { type: 'string', example: 'Annual flagship backend conference' },
            category: { type: 'string', example: 'Technology' },
            eventDate: { type: 'string', format: 'date-time', example: '2026-06-15T09:00:00Z' },
            venue: { type: 'string', example: 'Bandra Kurla Complex, Mumbai' },
            ticketPrice: { type: 'number', example: 1499 },
            totalCapacity: { type: 'integer', example: 500 }
          }
        },
        UpdateEventInput: {
          type: 'object',
          properties: {
            title: { type: 'string', example: 'Global Cloud & AI Summit 2026 - Updated' },
            description: { type: 'string', example: 'Updated flagship conference description' },
            category: { type: 'string', example: 'Technology' },
            eventDate: { type: 'string', format: 'date-time', example: '2026-07-20T09:00:00Z' },
            venue: { type: 'string', example: 'BKC Ground, Mumbai' },
            ticketPrice: { type: 'number', example: 1799 }
          }
        },
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'ticket_rec_88219' },
            eventId: { type: 'string', example: 'event_techconf_2026' },
            eventTitle: { type: 'string', example: 'Global Cloud & AI Summit 2026' },
            userId: { type: 'string', example: 'usr_attendee_99' },
            attendeeName: { type: 'string', example: 'Kunal Sharma' },
            attendeeEmail: { type: 'string', format: 'email', example: 'kunal@gmail.com' },
            quantity: { type: 'integer', example: 2 },
            totalPaid: { type: 'number', example: 2998 },
            bookingRef: { type: 'string', example: 'TKT-2026-88219' },
            status: { type: 'string', enum: ['confirmed', 'cancelled'], example: 'confirmed' },
            bookedAt: { type: 'string', format: 'date-time', example: '2026-03-02T16:20:00Z' }
          }
        },
        BookTicketInput: {
          type: 'object',
          required: ['eventId', 'quantity', 'attendeeName', 'attendeeEmail'],
          properties: {
            eventId: { type: 'string', example: 'event_techconf_2026' },
            quantity: { type: 'integer', minimum: 1, example: 2 },
            attendeeName: { type: 'string', example: 'Kunal Sharma' },
            attendeeEmail: { type: 'string', format: 'email', example: 'kunal@gmail.com' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message description' }
          }
        }
      }
    }
  },
  apis: [
    path.resolve(__dirname, '../routes/*.js'),
    path.resolve(__dirname, '../server.js')
  ]
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = swaggerSpec;
