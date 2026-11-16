const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const tripRoutes = require('./routes/trip.routes');
const destinationsRoutes = require('./routes/destinations.routes');
const activitiesRoutes = require('./routes/activities.routes');
const itineraryRoutes = require('./routes/itinerary.routes');
const communityRoutes = require('./routes/community.routes');
const savedDestinationsRoutes = require('./routes/saved_destinations.routes');

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl) or localhost dev origins
    if (!origin) return callback(null, true);
    if (config.frontendUrl && origin === config.frontendUrl) return callback(null, true);
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/destinations', destinationsRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/stops', itineraryRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/saved-destinations', savedDestinationsRoutes);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
