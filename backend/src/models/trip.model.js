const db = require('../config/db');

const TripModel = {
  async create({ userId, name, description, coverImage, startDate, endDate, startingLocation, budget, travelerCount, visibility, status }) {
    const { rows } = await db.query(
      `INSERT INTO trips (user_id, name, description, cover_image, start_date, end_date, starting_location, budget, traveler_count, visibility, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [userId, name, description || null, coverImage || null, startDate, endDate, startingLocation || null, budget || 0, travelerCount || 1, visibility || 'private', status || 'draft']
    );
    return rows[0].id;
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM trips WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findAllByUser(userId, { status, search, limit = 50, offset = 0 }) {
    let query = 'SELECT * FROM trips WHERE user_id = $1';
    const params = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY start_date ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);
    return rows;
  },

  async update(id, fields) {
    const keyMapping = {
      name: 'name',
      description: 'description',
      cover_image: 'cover_image',
      coverImage: 'cover_image',
      start_date: 'start_date',
      startDate: 'start_date',
      end_date: 'end_date',
      endDate: 'end_date',
      starting_location: 'starting_location',
      startingLocation: 'starting_location',
      budget: 'budget',
      traveler_count: 'traveler_count',
      travelerCount: 'traveler_count',
      visibility: 'visibility',
      status: 'status'
    };

    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(fields)) {
      const dbColumn = keyMapping[key];
      if (dbColumn && value !== undefined) {
        updates.push(`${dbColumn} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) return false;

    values.push(id);
    await db.query(`UPDATE trips SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
    return true;
  },

  async delete(id) {
    await db.query('DELETE FROM trips WHERE id = $1', [id]);
    return true;
  },

  async duplicate(id, userId) {
    const original = await this.findById(id);
    if (!original) return null;

    const startDate = original.start_date ? new Date(original.start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const endDate = original.end_date ? new Date(original.end_date).toISOString().split('T')[0] : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const { rows } = await db.query(
      `INSERT INTO trips (user_id, name, description, cover_image, start_date, end_date, starting_location, budget, traveler_count, visibility, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [userId, `Copy of ${original.name}`, original.description, original.cover_image, startDate, endDate, original.starting_location, original.budget, original.traveler_count, 'private', 'draft']
    );

    const newTrip = rows[0];

    // Clone stops
    const stopsRes = await db.query('SELECT * FROM trip_stops WHERE trip_id = $1 ORDER BY sequence_order ASC', [id]);
    for (const stop of stopsRes.rows) {
      await db.query(
        `INSERT INTO trip_stops (trip_id, destination_id, arrival_date, departure_date, sequence_order, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newTrip.id, stop.destination_id, stop.arrival_date, stop.departure_date, stop.sequence_order, stop.notes]
      );
    }

    return newTrip;
  }
};

module.exports = TripModel;
