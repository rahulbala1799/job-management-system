const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all customers
router.get('/', async (req, res) => {
  try {
    const [customers] = await db.query(`
      SELECT * FROM customers
      ORDER BY name ASC
    `);
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const [customers] = await db.query(`
      SELECT * FROM customers
      WHERE id = ?
    `, [req.params.id]);

    if (customers.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customers[0]);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ message: 'Failed to fetch customer' });
  }
});

// Create a new customer
router.post('/', async (req, res) => {
  const { name, company, email, phone, address, city, postal_code, country, notes } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Customer name is required' });
  }

  try {
    const [result] = await db.query(`
      INSERT INTO customers (name, company, email, phone, address, city, postal_code, country, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, company, email, phone, address, city, postal_code, country, notes]);

    const [newCustomer] = await db.query(`
      SELECT * FROM customers
      WHERE id = ?
    `, [result.insertId]);

    res.status(201).json(newCustomer[0]);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ message: 'Failed to create customer' });
  }
});

// Update a customer
router.put('/:id', async (req, res) => {
  const { name, company, email, phone, address, city, postal_code, country, notes } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Customer name is required' });
  }

  try {
    const [result] = await db.query(`
      UPDATE customers
      SET name = ?, company = ?, email = ?, phone = ?, address = ?, city = ?, postal_code = ?, country = ?, notes = ?
      WHERE id = ?
    `, [name, company, email, phone, address, city, postal_code, country, notes, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const [updatedCustomer] = await db.query(`
      SELECT * FROM customers
      WHERE id = ?
    `, [req.params.id]);

    res.json(updatedCustomer[0]);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ message: 'Failed to update customer' });
  }
});

// Delete a customer
router.delete('/:id', async (req, res) => {
  try {
    // Check if customer has associated jobs
    const [jobs] = await db.query(`
      SELECT COUNT(*) as count FROM jobs
      WHERE customer_name = (SELECT name FROM customers WHERE id = ?)
    `, [req.params.id]);

    if (jobs[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete customer with associated jobs. Please delete or reassign the jobs first.' 
      });
    }

    const [result] = await db.query(`
      DELETE FROM customers
      WHERE id = ?
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ message: 'Failed to delete customer' });
  }
});

module.exports = router; 