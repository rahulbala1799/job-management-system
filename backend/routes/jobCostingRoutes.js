const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all costs for a job
router.get('/job/:jobId', async (req, res) => {
  try {
    const [costs] = await db.query(`
      SELECT * FROM job_costing
      WHERE job_id = ?
      ORDER BY created_at DESC
    `, [req.params.jobId]);
    
    res.json(costs);
  } catch (error) {
    console.error('Error fetching job costs:', error);
    res.status(500).json({ message: 'Failed to fetch job costs' });
  }
});

// Get all costs for a job item
router.get('/job-item/:itemId', async (req, res) => {
  try {
    const [costs] = await db.query(`
      SELECT * FROM job_costing
      WHERE job_item_id = ?
      ORDER BY created_at DESC
    `, [req.params.itemId]);
    
    res.json(costs);
  } catch (error) {
    console.error('Error fetching job item costs:', error);
    res.status(500).json({ message: 'Failed to fetch job item costs' });
  }
});

// Add a new cost
router.post('/', async (req, res) => {
  const { 
    job_id, 
    job_item_id, 
    cost_type, 
    cost_amount, 
    quantity, 
    units, 
    cost_per_unit, 
    notes 
  } = req.body;

  // Validate required fields
  if (!job_id || !job_item_id || !cost_type || !cost_amount || !quantity || !units || !cost_per_unit) {
    return res.status(400).json({ 
      message: 'Missing required fields. Required: job_id, job_item_id, cost_type, cost_amount, quantity, units, cost_per_unit'
    });
  }

  try {
    // Verify the job and job item exist
    const [jobs] = await db.query('SELECT id FROM jobs WHERE id = ?', [job_id]);
    if (jobs.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const [items] = await db.query('SELECT id FROM job_items WHERE id = ? AND job_id = ?', [job_item_id, job_id]);
    if (items.length === 0) {
      return res.status(404).json({ message: 'Job item not found or does not belong to the specified job' });
    }

    // Insert the new cost record
    const [result] = await db.query(`
      INSERT INTO job_costing (
        job_id, 
        job_item_id, 
        cost_type, 
        cost_amount, 
        quantity, 
        units, 
        cost_per_unit, 
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [job_id, job_item_id, cost_type, cost_amount, quantity, units, cost_per_unit, notes || null]);

    // Get the inserted cost
    const [costs] = await db.query(`
      SELECT * FROM job_costing
      WHERE id = ?
    `, [result.insertId]);

    res.status(201).json(costs[0]);
  } catch (error) {
    console.error('Error adding job cost:', error);
    res.status(500).json({ message: 'Failed to add job cost' });
  }
});

// Update a cost
router.put('/:id', async (req, res) => {
  const { 
    cost_type, 
    cost_amount, 
    quantity, 
    units, 
    cost_per_unit, 
    notes 
  } = req.body;

  try {
    // Check if cost exists
    const [costs] = await db.query('SELECT * FROM job_costing WHERE id = ?', [req.params.id]);
    if (costs.length === 0) {
      return res.status(404).json({ message: 'Cost not found' });
    }

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const params = [];
    
    if (cost_type) {
      updateFields.push('cost_type = ?');
      params.push(cost_type);
    }
    
    if (cost_amount !== undefined) {
      updateFields.push('cost_amount = ?');
      params.push(cost_amount);
    }
    
    if (quantity !== undefined) {
      updateFields.push('quantity = ?');
      params.push(quantity);
    }
    
    if (units) {
      updateFields.push('units = ?');
      params.push(units);
    }
    
    if (cost_per_unit !== undefined) {
      updateFields.push('cost_per_unit = ?');
      params.push(cost_per_unit);
    }
    
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      params.push(notes);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }
    
    params.push(req.params.id);
    
    // Update the cost
    await db.query(`
      UPDATE job_costing
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, params);

    // Get the updated cost
    const [updatedCosts] = await db.query(`
      SELECT * FROM job_costing
      WHERE id = ?
    `, [req.params.id]);

    res.json(updatedCosts[0]);
  } catch (error) {
    console.error('Error updating job cost:', error);
    res.status(500).json({ message: 'Failed to update job cost' });
  }
});

// Delete a cost
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(`
      DELETE FROM job_costing
      WHERE id = ?
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Cost not found' });
    }

    res.json({ message: 'Cost deleted successfully' });
  } catch (error) {
    console.error('Error deleting job cost:', error);
    res.status(500).json({ message: 'Failed to delete job cost' });
  }
});

module.exports = router; 