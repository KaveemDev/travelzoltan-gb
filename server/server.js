require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');

// Import routes
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const documentRoutes = require('./routes/documentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => {
      try {
        return new URL(url.trim()).origin;
      } catch (e) {
        return url.trim();
      }
    })
  : '*';

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded documents statically (only for mock/dev)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register API Routes
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/document', documentRoutes);

// Health check endpoint (API only)
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Visa Booking Platform API is running!' });
});

// GET / returns service status
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Zoltan Visa API'
  });
});

// Catch-all route for any unhandled routes (all HTTP methods)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`,
    message: 'The requested API route was not found on this server.'
  });
});

// Start the server (local dev only, not for Vercel serverless)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const startServer = async () => {
    try {
      await sequelize.authenticate();
      console.log('Database connection has been established successfully.');
      
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    } catch (error) {
      console.error('Unable to connect to the database or start server:', error);
      process.exit(1);
    }
  };
  
  startServer();
}

// Export for Vercel serverless
module.exports = app;
