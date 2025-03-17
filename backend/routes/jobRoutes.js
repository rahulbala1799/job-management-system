const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const db = require('../db');

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [jobs] = await db.query(`
      SELECT * FROM jobs
      ORDER BY created_at DESC
    `);
    
    // Ensure jobs is always an array, even if empty
    if (!jobs || !Array.isArray(jobs)) {
      console.log('Query returned non-array result:', jobs);
      return res.json([]);
    }
    
    // Process jobs safely
    const processedJobs = [];
    for (const job of jobs) {
      processedJobs.push({
        ...job,
        created_at: job.created_at ? new Date(job.created_at).toISOString() : null,
        updated_at: job.updated_at ? new Date(job.updated_at).toISOString() : null,
        delivery_date: job.delivery_date ? new Date(job.delivery_date).toISOString() : null,
      });
    }
    
    res.json(processedJobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ message: 'Error fetching jobs' });
  }
});

// Get job by ID
router.get('/:id', async (req, res) => {
  try {
    const [jobs] = await db.query(`
      SELECT * FROM jobs
      WHERE id = ?
    `, [req.params.id]);

    if (jobs.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const job = jobs[0];

    // Get job items
    const [items] = await db.query(`
      SELECT id, job_id, product_id, product_name, product_category, quantity, 
             work_completed, is_printed, width_m, height_m, unit_price, 
             total_price, ink_cost_per_unit, ink_consumption
      FROM job_items
      WHERE job_id = ?
    `, [job.id]);
    
    job.items = items;

    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ message: 'Failed to fetch job' });
  }
});

// Create a new job
router.post('/', async (req, res) => {
  const { customer_name, items, notes, total_cost, status, due_date } = req.body;

  if (!customer_name || !items || items.length === 0) {
    return res.status(400).json({ message: 'Customer name and at least one item are required' });
  }

  const connection = await mysql.createConnection(db.config);

  try {
    await connection.beginTransaction();

    // Get the first item's product name to use as the job's product_name
    const product_name = items[0]?.product_name || 'Multiple Products';
    const size = items[0]?.width_m && items[0]?.height_m 
      ? `${items[0].width_m}m x ${items[0].height_m}m` 
      : 'Various';
    const quantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    // Insert job
    const [jobResult] = await connection.query(`
      INSERT INTO jobs (customer_name, product_name, size, quantity, status, total_cost, due_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [customer_name, product_name, size, quantity, status || 'pending', total_cost, due_date || null, notes]);

    const jobId = jobResult.insertId;

    // Insert job items
    for (const item of items) {
      await connection.query(`
        INSERT INTO job_items (
          job_id, 
          product_id, 
          product_name, 
          product_category, 
          quantity, 
          is_printed, 
          width_m, 
          height_m, 
          unit_price, 
          total_price
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        jobId,
        item.product_id,
        item.product_name,
        item.product_category,
        item.quantity,
        item.is_printed || false,
        item.width_m || null,
        item.height_m || null,
        item.unit_price,
        item.total_price
      ]);
    }

    await connection.commit();

    // Get the created job with items
    const [jobs] = await connection.query(`
      SELECT * FROM jobs
      WHERE id = ?
    `, [jobId]);

    const job = jobs[0];

    // Get job items
    const [jobItems] = await connection.query(`
      SELECT * FROM job_items
      WHERE job_id = ?
    `, [jobId]);
    
    job.items = jobItems;

    res.status(201).json(job);
  } catch (error) {
    await connection.rollback();
    console.error('Error creating job:', error);
    res.status(500).json({ message: 'Failed to create job' });
  } finally {
    connection.end();
  }
});

// Update job status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  
  if (!status || !['pending', 'in_progress', 'artwork_issue', 'client_approval', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Valid status is required' });
  }

  try {
    const [result] = await db.query(`
      UPDATE jobs
      SET status = ?
      WHERE id = ?
    `, [status, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json({ message: 'Job status updated successfully' });
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({ message: 'Failed to update job status' });
  }
});

// Delete a job
router.delete('/:id', async (req, res) => {
  const connection = await mysql.createConnection(db.config);

  try {
    await connection.beginTransaction();

    // Delete job items first
    await connection.query(`
      DELETE FROM job_items
      WHERE job_id = ?
    `, [req.params.id]);

    // Delete job
    const [result] = await connection.query(`
      DELETE FROM jobs
      WHERE id = ?
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Job not found' });
    }

    await connection.commit();
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting job:', error);
    res.status(500).json({ message: 'Failed to delete job' });
  } finally {
    connection.end();
  }
});

// Update a job
router.put('/:id', async (req, res) => {
  const { work_completed, ink_cost_per_unit, ink_consumption } = req.body;
  
  try {
    // Validate that we don't exceed quantity
    if (work_completed !== undefined) {
      const [jobs] = await db.query('SELECT quantity FROM jobs WHERE id = ?', [req.params.id]);
      
      if (jobs.length === 0) {
        return res.status(404).json({ message: 'Job not found' });
      }
      
      const job = jobs[0];
      if (work_completed > job.quantity) {
        return res.status(400).json({ message: 'Work completed cannot exceed total job quantity' });
      }
    }
    
    // Build update query dynamically based on provided fields
    const updateFields = [];
    const params = [];
    
    if (work_completed !== undefined) {
      updateFields.push('work_completed = ?');
      params.push(work_completed);
    }
    
    if (ink_cost_per_unit !== undefined) {
      updateFields.push('ink_cost_per_unit = ?');
      params.push(ink_cost_per_unit);
    }
    
    if (ink_consumption !== undefined) {
      updateFields.push('ink_consumption = ?');
      params.push(ink_consumption);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    params.push(req.params.id); // Add job ID as the last parameter
    
    // Execute update
    const [result] = await db.query(
      `UPDATE jobs SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.json({ message: 'Job updated successfully' });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ message: 'Failed to update job' });
  }
});

// Update a job item
router.put('/:id/items/:itemId', async (req, res) => {
  const { work_completed, ink_cost_per_unit, ink_consumption } = req.body;
  const jobId = req.params.id;
  const itemId = req.params.itemId;
  
  try {
    // Get the job item to validate work_completed value
    const [items] = await db.query(
      'SELECT * FROM job_items WHERE id = ? AND job_id = ?', 
      [itemId, jobId]
    );
    
    if (items.length === 0) {
      return res.status(404).json({ message: 'Job item not found' });
    }
    
    const item = items[0];
    
    // Validate that work_completed doesn't exceed quantity
    if (work_completed !== undefined && work_completed > item.quantity) {
      return res.status(400).json({ 
        message: 'Work completed cannot exceed item quantity' 
      });
    }
    
    // Build update query dynamically based on provided fields
    const updateFields = [];
    const params = [];
    
    if (work_completed !== undefined) {
      updateFields.push('work_completed = ?');
      params.push(work_completed);
    }
    
    if (ink_cost_per_unit !== undefined) {
      updateFields.push('ink_cost_per_unit = ?');
      params.push(ink_cost_per_unit);
    }
    
    if (ink_consumption !== undefined) {
      updateFields.push('ink_consumption = ?');
      params.push(ink_consumption);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    // Add update timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    // Add item ID and job ID as the last parameters
    params.push(itemId);
    params.push(jobId);
    
    // Execute update
    const [result] = await db.query(
      `UPDATE job_items 
       SET ${updateFields.join(', ')} 
       WHERE id = ? AND job_id = ?`,
      params
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Job item not found' });
    }
    
    // If we updated work_completed, update the job's overall work_completed
    if (work_completed !== undefined) {
      // Get all items for this job
      const [allItems] = await db.query(
        'SELECT * FROM job_items WHERE job_id = ?',
        [jobId]
      );
      
      // Calculate total work completed across all items
      let totalWorkCompleted = 0;
      let totalQuantity = 0;
      
      for (const jobItem of allItems) {
        totalWorkCompleted += jobItem.work_completed || 0;
        totalQuantity += jobItem.quantity || 0;
      }
      
      // Update the job's work_completed field
      await db.query(
        'UPDATE jobs SET work_completed = ? WHERE id = ?',
        [totalWorkCompleted, jobId]
      );
    }
    
    // Get updated item to return
    const [updatedItems] = await db.query(
      'SELECT * FROM job_items WHERE id = ?',
      [itemId]
    );
    
    res.json(updatedItems[0]);
  } catch (error) {
    console.error('Error updating job item:', error);
    res.status(500).json({ message: 'Failed to update job item' });
  }
});

module.exports = router; 