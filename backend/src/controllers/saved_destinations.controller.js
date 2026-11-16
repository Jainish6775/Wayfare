const db = require('../config/db');

const savedDestinationsController = {
  async getAll(req, res, next) {
    try {
      const userId = req.user.id;
      const { rows } = await db.query(
        `SELECT sd.id, sd.destination_id, sd.created_at,
                d.name, d.country, d.region, d.description, d.image_url,
                d.cost_level, d.popularity_score, d.recommended_days, d.latitude, d.longitude
         FROM saved_destinations sd
         JOIN destinations d ON sd.destination_id = d.id
         WHERE sd.user_id = $1
         ORDER BY sd.created_at DESC`,
        [userId]
      );
      res.json(rows);
    } catch (error) {
      next(error);
    }
  },

  async save(req, res, next) {
    try {
      const userId = req.user.id;
      const destinationId = req.body.destination_id || req.body.destinationId;

      if (!destinationId) {
        return res.status(400).json({ error: 'destination_id is required' });
      }

      // Check if destination exists
      const destCheck = await db.query('SELECT id FROM destinations WHERE id = $1', [destinationId]);
      if (destCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Destination not found' });
      }

      const { rows } = await db.query(
        `INSERT INTO saved_destinations (user_id, destination_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, destination_id) DO NOTHING
         RETURNING *`,
        [userId, destinationId]
      );

      res.status(201).json(rows[0] || { message: 'Already saved', user_id: userId, destination_id: destinationId });
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const numId = parseInt(id, 10);
      if (isNaN(numId)) {
        return res.status(400).json({ error: 'Invalid id' });
      }

      await db.query(
        `DELETE FROM saved_destinations 
         WHERE (id = $1 OR destination_id = $1) AND user_id = $2`,
        [numId, userId]
      );

      res.json({ message: 'Removed from saved destinations' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = savedDestinationsController;
