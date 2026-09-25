const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const swaggerSpec = require('./config/swagger');
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const ticketRoutes = require('./routes/ticketRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for rate limiter when deployed on Render / behind reverse proxies
app.set('trust proxy', 1);

// Interactive Swagger Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: '🎟️ Event Management & Ticketing API Docs',
    customCss: `
      .swagger-ui .topbar { background-color: #0f172a; border-bottom: 2px solid #6366f1; }
      .swagger-ui .topbar .topbar-wrapper .link span { display: none; }
      .swagger-ui .topbar .topbar-wrapper .link:after { content: "🎟️ Event Ticketing API (Harish Malviya)"; color: #ffffff; font-weight: 700; font-size: 1.1rem; }
    `
  })
);

// Health check and root landing
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🎟️ Event Management & Ticketing API is running',
    author: 'Harish Malviya (150096725162)',
    documentation: '/api-docs',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}. Route not found.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5001;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🎟️ Event Management & Ticketing API Server Running`);
    console.log(`👤 Student: Harish Malviya (150096725162)`);
    console.log(`🚀 Port: http://localhost:${PORT}`);
    console.log(`📚 Swagger Docs: http://localhost:${PORT}/api-docs`);
    console.log(`====================================================`);
  });
}

module.exports = app;
