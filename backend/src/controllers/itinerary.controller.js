const db = require('../config/db');

const itineraryController = {
  // Helper to verify stop access through trip ownership
  async verifyStopAccess(stopId, userId, allowPublic = false) {
    const res = await db.query(
      `SELECT ts.id, t.user_id, t.visibility 
       FROM trip_stops ts 
       JOIN trips t ON ts.trip_id = t.id 
       WHERE ts.id = $1`,
      [stopId]
    );
    if (res.rows.length === 0) return { error: 'Stop not found', status: 404 };
    const stop = res.rows[0];
    if (stop.user_id !== userId && (!allowPublic || stop.visibility !== 'public')) {
      return { error: 'Access denied', status: 403 };
    }
    return { success: true };
  },

  // Activities
  async getActivitiesForStop(req, res, next) {
    try {
      const { stopId } = req.params;
      const check = await itineraryController.verifyStopAccess(stopId, req.user.id, true);
      if (check.error) return res.status(check.status).json({ error: check.error });

      const { rows } = await db.query('SELECT * FROM scheduled_activities WHERE trip_stop_id = $1 ORDER BY day_number ASC, scheduled_time ASC', [stopId]);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  },

  async addActivity(req, res, next) {
    try {
      const { stopId } = req.params;
      const check = await itineraryController.verifyStopAccess(stopId, req.user.id, false);
      if (check.error) return res.status(check.status).json({ error: check.error });

      const { activity_id, custom_name, day_number, scheduled_time, duration_hours, estimated_cost, notes } = req.body;
      
      const { rows } = await db.query(
        `INSERT INTO scheduled_activities (trip_stop_id, activity_id, custom_name, day_number, scheduled_time, duration_hours, estimated_cost, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [stopId, activity_id || null, custom_name || 'Planned Activity', day_number || 1, scheduled_time || null, duration_hours || 2.0, estimated_cost || 0, notes || null]
      );
      res.status(201).json(rows[0]);
    } catch (error) {
      next(error);
    }
  },

  async updateActivity(req, res, next) {
    try {
      const { stopId, id } = req.params;
      const check = await itineraryController.verifyStopAccess(stopId, req.user.id, false);
      if (check.error) return res.status(check.status).json({ error: check.error });

      const { custom_name, day_number, scheduled_time, duration_hours, estimated_cost, notes } = req.body;

      const { rows } = await db.query(
        `UPDATE scheduled_activities
         SET custom_name = COALESCE($1, custom_name),
             day_number = COALESCE($2, day_number),
             scheduled_time = COALESCE($3, scheduled_time),
             duration_hours = COALESCE($4, duration_hours),
             estimated_cost = COALESCE($5, estimated_cost),
             notes = COALESCE($6, notes)
         WHERE id = $7 AND trip_stop_id = $8
         RETURNING *`,
        [custom_name, day_number, scheduled_time, duration_hours, estimated_cost, notes, id, stopId]
      );

      if (rows.length === 0) return res.status(404).json({ error: 'Activity not found' });
      res.json(rows[0]);
    } catch (error) {
      next(error);
    }
  },

  async deleteActivity(req, res, next) {
    try {
      const { stopId, id } = req.params;
      const check = await itineraryController.verifyStopAccess(stopId, req.user.id, false);
      if (check.error) return res.status(check.status).json({ error: check.error });

      const result = await db.query('DELETE FROM scheduled_activities WHERE id = $1 AND trip_stop_id = $2', [id, stopId]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Activity not found' });
      res.json({ message: 'Deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Accommodations
  async getAccommodationsForStop(req, res, next) {
    try {
      const { stopId } = req.params;
      const check = await itineraryController.verifyStopAccess(stopId, req.user.id, true);
      if (check.error) return res.status(check.status).json({ error: check.error });

      const { rows } = await db.query('SELECT * FROM accommodations WHERE trip_stop_id = $1 ORDER BY check_in_date ASC', [stopId]);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  },

  async addAccommodation(req, res, next) {
    try {
      const { stopId } = req.params;
      const check = await itineraryController.verifyStopAccess(stopId, req.user.id, false);
      if (check.error) return res.status(check.status).json({ error: check.error });

      const { name, type, check_in_date, check_out_date, cost, notes } = req.body;
      
      const { rows } = await db.query(
        `INSERT INTO accommodations (trip_stop_id, name, type, check_in_date, check_out_date, cost, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [stopId, name, type || 'hotel', check_in_date, check_out_date, cost || 0, notes || null]
      );
      res.status(201).json(rows[0]);
    } catch (error) {
      next(error);
    }
  },

  async updateAccommodation(req, res, next) {
    try {
      const { stopId, id } = req.params;
      const check = await itineraryController.verifyStopAccess(stopId, req.user.id, false);
      if (check.error) return res.status(check.status).json({ error: check.error });

      const { name, type, check_in_date, check_out_date, cost, notes } = req.body;
      const { rows } = await db.query(
        `UPDATE accommodations
         SET name = COALESCE($1, name),
             type = COALESCE($2, type),
             check_in_date = COALESCE($3, check_in_date),
             check_out_date = COALESCE($4, check_out_date),
             cost = COALESCE($5, cost),
             notes = COALESCE($6, notes)
         WHERE id = $7 AND trip_stop_id = $8
         RETURNING *`,
        [name, type, check_in_date, check_out_date, cost, notes, id, stopId]
      );

      if (rows.length === 0) return res.status(404).json({ error: 'Accommodation not found' });
      res.json(rows[0]);
    } catch (error) {
      next(error);
    }
  },

  async deleteAccommodation(req, res, next) {
    try {
      const { stopId, id } = req.params;
      const check = await itineraryController.verifyStopAccess(stopId, req.user.id, false);
      if (check.error) return res.status(check.status).json({ error: check.error });

      const result = await db.query('DELETE FROM accommodations WHERE id = $1 AND trip_stop_id = $2', [id, stopId]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Accommodation not found' });
      res.json({ message: 'Deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Transports
  async getTransportsForStop(req, res, next) {
    try {
      const { stopId } = req.params;
      const check = await itineraryController.verifyStopAccess(stopId, req.user.id, true);
      if (check.error) return res.status(check.status).json({ error: check.error });

      const { rows } = await db.query('SELECT * FROM transports WHERE trip_stop_id = $1 ORDER BY departure_time ASC', [stopId]);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  },

  async addTransport(req, res, next) {
    try {
      const { stopId } = req.params;
      const check = await itineraryController.verifyStopAccess(stopId, req.user.id, false);
      if (check.error) return res.status(check.status).json({ error: check.error });

      const { mode, from_location, to_location, departure_time, arrival_time, cost, notes } = req.body;
      
      const { rows } = await db.query(
        `INSERT INTO transports (trip_stop_id, mode, from_location, to_location, departure_time, arrival_time, cost, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [stopId, mode || 'flight', from_location, to_location, departure_time, arrival_time, cost || 0, notes || null]
      );
      res.status(201).json(rows[0]);
    } catch (error) {
      next(error);
    }
  },

  async updateTransport(req, res, next) {
    try {
      const { stopId, id } = req.params;
      const check = await itineraryController.verifyStopAccess(stopId, req.user.id, false);
      if (check.error) return res.status(check.status).json({ error: check.error });

      const { mode, from_location, to_location, departure_time, arrival_time, cost, notes } = req.body;
      const { rows } = await db.query(
        `UPDATE transports
         SET mode = COALESCE($1, mode),
             from_location = COALESCE($2, from_location),
             to_location = COALESCE($3, to_location),
             departure_time = COALESCE($4, departure_time),
             arrival_time = COALESCE($5, arrival_time),
             cost = COALESCE($6, cost),
             notes = COALESCE($7, notes)
         WHERE id = $8 AND trip_stop_id = $9
         RETURNING *`,
        [mode, from_location, to_location, departure_time, arrival_time, cost, notes, id, stopId]
      );

      if (rows.length === 0) return res.status(404).json({ error: 'Transport not found' });
      res.json(rows[0]);
    } catch (error) {
      next(error);
    }
  },

  async deleteTransport(req, res, next) {
    try {
      const { stopId, id } = req.params;
      const check = await itineraryController.verifyStopAccess(stopId, req.user.id, false);
      if (check.error) return res.status(check.status).json({ error: check.error });

      const result = await db.query('DELETE FROM transports WHERE id = $1 AND trip_stop_id = $2', [id, stopId]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Transport not found' });
      res.json({ message: 'Deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = itineraryController;
