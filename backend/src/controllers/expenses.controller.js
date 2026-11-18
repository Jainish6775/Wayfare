const db = require('../config/db');

const expensesController = {
  // Helper to verify trip ownership
  async verifyTripAccess(tripId, userId, allowPublic = false) {
    const tripRes = await db.query('SELECT user_id, visibility FROM trips WHERE id = $1', [tripId]);
    if (tripRes.rows.length === 0) return { error: 'Trip not found', status: 404 };
    const trip = tripRes.rows[0];
    if (trip.user_id !== userId && (!allowPublic || trip.visibility !== 'public')) {
      return { error: 'Access denied', status: 403 };
    }
    return { success: true };
  },

  async getTripExpenses(req, res, next) {
    try {
      const { tripId } = req.params;
      const check = await expensesController.verifyTripAccess(tripId, req.user.id, true);
      if (check.error) return res.status(check.status).json({ error: check.error });

      const { rows } = await db.query('SELECT * FROM expenses WHERE trip_id = $1 ORDER BY expense_date DESC, id DESC', [tripId]);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  },

  async addExpense(req, res, next) {
    try {
      const { tripId } = req.params;
      const check = await expensesController.verifyTripAccess(tripId, req.user.id, false);
      if (check.error) return res.status(check.status).json({ error: check.error });

      const { trip_stop_id, category, description, amount, currency, expense_date } = req.body;
      
      const { rows } = await db.query(
        `INSERT INTO expenses (trip_id, trip_stop_id, category, description, amount, currency, expense_date) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [tripId, trip_stop_id || null, category || 'miscellaneous', description || null, amount || 0, currency || 'USD', expense_date || new Date().toISOString().split('T')[0]]
      );
      res.status(201).json(rows[0]);
    } catch (error) {
      next(error);
    }
  },

  async updateExpense(req, res, next) {
    try {
      const { tripId, id } = req.params;
      const check = await expensesController.verifyTripAccess(tripId, req.user.id, false);
      if (check.error) return res.status(check.status).json({ error: check.error });

      const { category, description, amount, currency, expense_date } = req.body;
      const { rows } = await db.query(
        `UPDATE expenses 
         SET category = COALESCE($1, category),
             description = COALESCE($2, description),
             amount = COALESCE($3, amount),
             currency = COALESCE($4, currency),
             expense_date = COALESCE($5, expense_date)
         WHERE id = $6 AND trip_id = $7
         RETURNING *`,
        [category, description, amount, currency, expense_date, id, tripId]
      );

      if (rows.length === 0) return res.status(404).json({ error: 'Expense not found' });
      res.json(rows[0]);
    } catch (error) {
      next(error);
    }
  },

  async deleteExpense(req, res, next) {
    try {
      const { tripId, id } = req.params;
      const check = await expensesController.verifyTripAccess(tripId, req.user.id, false);
      if (check.error) return res.status(check.status).json({ error: check.error });

      const result = await db.query('DELETE FROM expenses WHERE id = $1 AND trip_id = $2', [id, tripId]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Expense not found' });
      res.json({ message: 'Deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  async getBudgetSummary(req, res, next) {
    try {
      const { tripId } = req.params;
      const check = await expensesController.verifyTripAccess(tripId, req.user.id, true);
      if (check.error) return res.status(check.status).json({ error: check.error });
      
      // Get trip budget
      const tripRes = await db.query('SELECT budget FROM trips WHERE id = $1', [tripId]);
      if (tripRes.rows.length === 0) return res.status(404).json({ error: 'Trip not found' });
      const totalBudget = Number(tripRes.rows[0].budget || 0);

      // Aggregate expenses and sub-items using a UNION query sum.
      const totalSumRes = await db.query(`
        SELECT SUM(total_cost) as grand_total FROM (
          SELECT amount as total_cost FROM expenses WHERE trip_id = $1
          UNION ALL
          SELECT estimated_cost as total_cost FROM scheduled_activities sa JOIN trip_stops ts ON sa.trip_stop_id = ts.id WHERE ts.trip_id = $1
          UNION ALL
          SELECT cost as total_cost FROM accommodations a JOIN trip_stops ts ON a.trip_stop_id = ts.id WHERE ts.trip_id = $1
          UNION ALL
          SELECT cost as total_cost FROM transports t JOIN trip_stops ts ON t.trip_stop_id = ts.id WHERE ts.trip_id = $1
        ) as combined_costs
      `, [tripId]);

      const totalSpent = Number(totalSumRes.rows[0].grand_total || 0);

      // Category breakdown
      const activityRes = await db.query(`SELECT SUM(estimated_cost) as val FROM scheduled_activities sa JOIN trip_stops ts ON sa.trip_stop_id = ts.id WHERE ts.trip_id = $1`, [tripId]);
      const accRes = await db.query(`SELECT SUM(cost) as val FROM accommodations a JOIN trip_stops ts ON a.trip_stop_id = ts.id WHERE ts.trip_id = $1`, [tripId]);
      const transportRes = await db.query(`SELECT SUM(cost) as val FROM transports t JOIN trip_stops ts ON t.trip_stop_id = ts.id WHERE ts.trip_id = $1`, [tripId]);
      
      const expenseCatsRes = await db.query(`SELECT category, SUM(amount) as val FROM expenses WHERE trip_id = $1 GROUP BY category`, [tripId]);
      const expenseCatMap = {};
      for (const row of expenseCatsRes.rows) {
        expenseCatMap[row.category] = Number(row.val || 0);
      }

      const breakdown = {
        activity: Number(activityRes.rows[0].val || 0) + (expenseCatMap['activity'] || 0),
        accommodation: Number(accRes.rows[0].val || 0) + (expenseCatMap['accommodation'] || 0),
        transport: Number(transportRes.rows[0].val || 0) + (expenseCatMap['transport'] || 0),
        meal: expenseCatMap['meal'] || 0,
        misc: (expenseCatMap['miscellaneous'] || 0) + (expenseCatMap['misc'] || 0)
      };

      res.json({
        total_budget: totalBudget,
        total_spent: totalSpent,
        remaining: totalBudget - totalSpent,
        breakdown
      });

    } catch (error) {
      next(error);
    }
  }
};

module.exports = expensesController;
