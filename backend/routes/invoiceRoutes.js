const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const db = require('../db');

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const [invoices] = await db.query(`
      SELECT i.*, c.name as customer_name, c.contact_person as customer_contact
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      ORDER BY i.created_at DESC
    `);
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Failed to fetch invoices' });
  }
});

// Get invoice by ID
router.get('/:id', async (req, res) => {
  const connection = await mysql.createConnection(db.config);
  
  try {
    await connection.beginTransaction();
    
    // Get invoice details
    const [invoices] = await connection.query(`
      SELECT i.*, c.name as customer_name, c.contact_person, 
             c.address as customer_address, c.email as customer_email, 
             c.phone as customer_phone
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `, [req.params.id]);

    if (invoices.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const invoice = invoices[0];

    // Get invoice items
    const [items] = await connection.query(`
      SELECT ii.*, p.name as product_name, p.category as product_category
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
    `, [req.params.id]);
    
    invoice.items = items;

    await connection.commit();
    res.json(invoice);
  } catch (error) {
    await connection.rollback();
    console.error('Error fetching invoice:', error);
    res.status(500).json({ message: 'Failed to fetch invoice' });
  } finally {
    connection.end();
  }
});

// Create a new invoice
router.post('/', async (req, res) => {
  const { 
    customer_id, 
    issue_date, 
    due_date, 
    subtotal, 
    vat_rate, 
    vat_amount, 
    total_amount, 
    notes, 
    status, 
    items 
  } = req.body;

  if (!customer_id || !items || items.length === 0) {
    return res.status(400).json({ message: 'Customer and at least one item are required' });
  }

  const connection = await mysql.createConnection(db.config);

  try {
    await connection.beginTransaction();

    // Generate invoice number (format: INV-YYYYMMDD-XXX)
    const date = new Date();
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get the latest invoice number to increment
    const [lastInvoice] = await connection.query(`
      SELECT invoice_number FROM invoices 
      WHERE invoice_number LIKE ? 
      ORDER BY id DESC LIMIT 1
    `, [`INV-${datePart}-%`]);
    
    let sequenceNumber = 1;
    if (lastInvoice.length > 0) {
      const lastSequence = parseInt(lastInvoice[0].invoice_number.split('-')[2]);
      sequenceNumber = lastSequence + 1;
    }
    
    const invoiceNumber = `INV-${datePart}-${sequenceNumber.toString().padStart(3, '0')}`;

    // Format dates to YYYY-MM-DD format for MySQL
    let formattedIssueDate, formattedDueDate;
    
    try {
      formattedIssueDate = new Date(issue_date).toISOString().split('T')[0];
      formattedDueDate = new Date(due_date).toISOString().split('T')[0];
    } catch (dateError) {
      console.error('Error formatting dates:', dateError);
      return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD format.' });
    }
    
    // Check if dates are valid
    if (formattedIssueDate === 'Invalid Date' || formattedDueDate === 'Invalid Date') {
      return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD format.' });
    }

    // Insert invoice
    const [invoiceResult] = await connection.query(`
      INSERT INTO invoices (
        invoice_number, customer_id, issue_date, due_date, 
        subtotal, vat_rate, vat_amount, total_amount, 
        notes, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoiceNumber, customer_id, formattedIssueDate, formattedDueDate, 
      subtotal, vat_rate, vat_amount, total_amount, 
      notes, status || 'draft'
    ]);

    const invoiceId = invoiceResult.insertId;

    // Insert invoice items
    for (const item of items) {
      await connection.query(`
        INSERT INTO invoice_items (
          invoice_id, product_id, description, quantity, 
          unit_price, width_m, height_m, total_price
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoiceId,
        item.product_id || null,
        item.description,
        item.quantity,
        item.unit_price,
        item.width_m || null,
        item.height_m || null,
        item.total_price
      ]);
    }

    // Get the created invoice with items
    const [invoices] = await connection.query(`
      SELECT i.*, c.name as customer_name, c.company as customer_company
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `, [invoiceId]);

    const invoice = invoices[0];

    // Get invoice items
    const [invoiceItems] = await connection.query(`
      SELECT ii.*, p.name as product_name, p.category as product_category
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
    `, [invoiceId]);
    
    invoice.items = invoiceItems;

    await connection.commit();
    res.status(201).json(invoice);
  } catch (error) {
    await connection.rollback();
    console.error('Error creating invoice:', error);
    res.status(500).json({ message: 'Failed to create invoice' });
  } finally {
    connection.end();
  }
});

// Update an invoice
router.put('/:id', async (req, res) => {
  const { 
    customer_id, 
    issue_date, 
    due_date, 
    subtotal, 
    vat_rate, 
    vat_amount, 
    total_amount, 
    notes, 
    status, 
    items 
  } = req.body;

  if (!customer_id || !items || items.length === 0) {
    return res.status(400).json({ message: 'Customer and at least one item are required' });
  }

  const connection = await mysql.createConnection(db.config);

  try {
    await connection.beginTransaction();

    // Format dates to YYYY-MM-DD format for MySQL
    let formattedIssueDate, formattedDueDate;
    
    try {
      formattedIssueDate = new Date(issue_date).toISOString().split('T')[0];
      formattedDueDate = new Date(due_date).toISOString().split('T')[0];
    } catch (dateError) {
      console.error('Error formatting dates:', dateError);
      return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD format.' });
    }
    
    // Check if dates are valid
    if (formattedIssueDate === 'Invalid Date' || formattedDueDate === 'Invalid Date') {
      return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD format.' });
    }

    // Update invoice
    await connection.query(`
      UPDATE invoices
      SET customer_id = ?, issue_date = ?, due_date = ?, 
          subtotal = ?, vat_rate = ?, vat_amount = ?, 
          total_amount = ?, notes = ?, status = ?
      WHERE id = ?
    `, [
      customer_id, formattedIssueDate, formattedDueDate, 
      subtotal, vat_rate, vat_amount, 
      total_amount, notes, status, 
      req.params.id
    ]);

    // Delete existing invoice items
    await connection.query(`
      DELETE FROM invoice_items
      WHERE invoice_id = ?
    `, [req.params.id]);

    // Insert new invoice items
    for (const item of items) {
      await connection.query(`
        INSERT INTO invoice_items (
          invoice_id, product_id, description, quantity, 
          unit_price, width_m, height_m, total_price
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.params.id,
        item.product_id || null,
        item.description,
        item.quantity,
        item.unit_price,
        item.width_m || null,
        item.height_m || null,
        item.total_price
      ]);
    }

    // Get the updated invoice with items
    const [invoices] = await connection.query(`
      SELECT i.*, c.name as customer_name, c.company as customer_company
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `, [req.params.id]);

    if (invoices.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const invoice = invoices[0];

    // Get invoice items
    const [invoiceItems] = await connection.query(`
      SELECT ii.*, p.name as product_name, p.category as product_category
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
    `, [req.params.id]);
    
    invoice.items = invoiceItems;

    await connection.commit();
    res.json(invoice);
  } catch (error) {
    await connection.rollback();
    console.error('Error updating invoice:', error);
    
    // Provide more specific error messages
    if (error.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({ message: 'Invalid customer or product reference' });
    } else if (error.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({ message: 'Data too long for one or more fields' });
    } else if (error.code === 'ER_TRUNCATED_WRONG_VALUE') {
      return res.status(400).json({ message: 'Invalid data format for one or more fields' });
    }
    
    res.status(500).json({ message: 'Failed to update invoice: ' + (error.message || 'Unknown error') });
  } finally {
    connection.end();
  }
});

// Delete an invoice
router.delete('/:id', async (req, res) => {
  const connection = await mysql.createConnection(db.config);

  try {
    await connection.beginTransaction();

    // Delete invoice items first (cascade should handle this, but just to be safe)
    await connection.query(`
      DELETE FROM invoice_items
      WHERE invoice_id = ?
    `, [req.params.id]);

    // Delete invoice
    const [result] = await connection.query(`
      DELETE FROM invoices
      WHERE id = ?
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Invoice not found' });
    }

    await connection.commit();
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting invoice:', error);
    res.status(500).json({ message: 'Failed to delete invoice' });
  } finally {
    connection.end();
  }
});

// Generate job from invoice
router.post('/:id/generate-job', async (req, res) => {
  const connection = await mysql.createConnection(db.config);

  try {
    await connection.beginTransaction();

    // Get invoice details
    const [invoices] = await connection.query(`
      SELECT i.*, c.name as customer_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `, [req.params.id]);

    if (invoices.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const invoice = invoices[0];

    // Get invoice items
    const [invoiceItems] = await connection.query(`
      SELECT ii.*, p.name as product_name, p.category as product_category
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
    `, [req.params.id]);

    if (invoiceItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Invoice has no items' });
    }

    // Create job
    const [jobResult] = await connection.query(`
      INSERT INTO jobs (
        customer_name, product_name, size, quantity, 
        status, total_cost, due_date, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoice.customer_name,
      invoiceItems[0].product_name || invoiceItems[0].description,
      invoiceItems[0].width_m && invoiceItems[0].height_m 
        ? `${invoiceItems[0].width_m}m x ${invoiceItems[0].height_m}m` 
        : 'Various',
      invoiceItems.reduce((sum, item) => sum + item.quantity, 0),
      'pending',
      invoice.total_amount,
      invoice.due_date,
      `Generated from invoice ${invoice.invoice_number}. ${invoice.notes || ''}`
    ]);

    const jobId = jobResult.insertId;

    // Create job items
    for (const item of invoiceItems) {
      if (item.product_id) {
        await connection.query(`
          INSERT INTO job_items (
            job_id, product_id, product_name, product_category,
            quantity, width_m, height_m, unit_price, total_price
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          jobId,
          item.product_id,
          item.product_name,
          item.product_category,
          item.quantity,
          item.width_m || null,
          item.height_m || null,
          item.unit_price,
          item.total_price
        ]);
      }
    }

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

    await connection.commit();
    res.status(201).json(job);
  } catch (error) {
    await connection.rollback();
    console.error('Error generating job from invoice:', error);
    res.status(500).json({ message: 'Failed to generate job from invoice' });
  } finally {
    connection.end();
  }
});

module.exports = router; 