const db = require('../config/db');

const communityController = {
  async getPublicTrips(req, res, next) {
    try {
      const { search } = req.query;

      let query = `
        SELECT t.*, 
        COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email, 'Anonymous Explorer') AS creator_name,
        u.profile_image AS creator_avatar,
        COALESCE((SELECT COUNT(*) FROM likes WHERE trip_id = t.id), 0) AS likes_count
        FROM trips t
        JOIN users u ON t.user_id = u.id
        WHERE t.visibility = 'public'
      `;
      let params = [];

      if (search) {
        query += ` AND t.name ILIKE $1`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY t.created_at DESC LIMIT 50`;

      try {
        const { rows } = await db.query(query, params);
        res.json(rows);
      } catch (err) {
        // Fallback without subquery if table was just created
        const fallbackQuery = `
          SELECT t.*, 
          COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email, 'Anonymous Explorer') AS creator_name,
          u.profile_image AS creator_avatar,
          0 AS likes_count
          FROM trips t
          JOIN users u ON t.user_id = u.id
          WHERE t.visibility = 'public'
          ORDER BY t.created_at DESC LIMIT 50
        `;
        const { rows } = await db.query(fallbackQuery);
        res.json(rows);
      }
    } catch (error) {
      next(error);
    }
  },

  async likeTrip(req, res, next) {
    try {
      const { tripId } = req.params;
      const userId = req.user.id;

      // Check if already liked
      const checkRes = await db.query('SELECT * FROM likes WHERE user_id = $1 AND trip_id = $2', [userId, tripId]);

      if (checkRes.rows.length > 0) {
        // Unlike
        await db.query('DELETE FROM likes WHERE user_id = $1 AND trip_id = $2', [userId, tripId]);
        res.json({ message: 'Unliked', liked: false });
      } else {
        // Like
        await db.query('INSERT INTO likes (user_id, trip_id) VALUES ($1, $2)', [userId, tripId]);
        res.json({ message: 'Liked', liked: true });
      }
    } catch (error) {
      next(error);
    }
  },

  async saveTrip(req, res, next) {
    try {
      const { tripId } = req.params;
      const userId = req.user.id;

      // Check if table exists, create if not
      await db.query(`
        CREATE TABLE IF NOT EXISTS saved_trips (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL,
          trip_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, trip_id)
        );
      `);

      const checkRes = await db.query('SELECT * FROM saved_trips WHERE user_id = $1 AND trip_id = $2', [userId, tripId]);

      if (checkRes.rows.length > 0) {
        await db.query('DELETE FROM saved_trips WHERE user_id = $1 AND trip_id = $2', [userId, tripId]);
        res.json({ message: 'Unsaved from collection', saved: false });
      } else {
        await db.query('INSERT INTO saved_trips (user_id, trip_id) VALUES ($1, $2)', [userId, tripId]);
        res.json({ message: 'Saved to collection', saved: true });
      }
    } catch (error) {
      next(error);
    }
  },

  async copyTrip(req, res, next) {
    try {
      const { tripId } = req.params;
      const userId = req.user.id;

      const tripRes = await db.query('SELECT * FROM trips WHERE id = $1 AND visibility = $2', [tripId, 'public']);
      if (tripRes.rows.length === 0) return res.status(404).json({ error: 'Public trip not found' });

      const tripToCopy = tripRes.rows[0];

      const startDate = tripToCopy.start_date ? new Date(tripToCopy.start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const endDate = tripToCopy.end_date ? new Date(tripToCopy.end_date).toISOString().split('T')[0] : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      const { rows } = await db.query(
        `INSERT INTO trips (user_id, name, description, cover_image, start_date, end_date, starting_location, budget, traveler_count, visibility, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          userId,
          `Copy of ${tripToCopy.name}`,
          tripToCopy.description,
          tripToCopy.cover_image,
          startDate,
          endDate,
          tripToCopy.starting_location,
          tripToCopy.budget || 0,
          tripToCopy.traveler_count || 1,
          'private',
          'draft'
        ]
      );

      const newTrip = rows[0];

      // Clone trip stops if present
      const stopRows = await db.query('SELECT * FROM trip_stops WHERE trip_id = $1 ORDER BY sequence_order ASC', [tripId]);
      for (const stop of stopRows.rows) {
        await db.query(
          `INSERT INTO trip_stops (trip_id, destination_id, arrival_date, departure_date, sequence_order, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [newTrip.id, stop.destination_id, stop.arrival_date, stop.departure_date, stop.sequence_order, stop.notes]
        );
      }

      res.status(201).json(newTrip);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = communityController;
