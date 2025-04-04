const express = require('express');
const router = express.Router();
const db = require('../db');
const mysql = require('mysql2/promise');

// Get all products
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// Get products by category
router.get('/category/:category', async (req, res) => {
  const { category } = req.params;
  
  try {
    const [rows] = await db.query('SELECT * FROM products WHERE category = ? ORDER BY name', [category]);
    res.json(rows);
  } catch (error) {
    console.error(`Error fetching ${category} products:`, error);
    res.status(500).json({ message: `Failed to fetch ${category} products` });
  }
});

// Get a single product by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = rows[0];
    
    // If this is a finished product, get its components
    if (product.category === 'finished_product') {
      const [components] = await db.query(`
        SELECT fpc.*, p.name as component_name 
        FROM finished_product_components fpc
        JOIN products p ON fpc.component_product_id = p.id
        WHERE fpc.finished_product_id = ?
      `, [id]);
      
      product.components = components;
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
});

// Get components for a finished product
router.get('/:id/components', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [product] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product[0].category !== 'finished_product') {
      return res.status(400).json({ message: 'Not a finished product' });
    }
    
    const [components] = await db.query(`
      SELECT fpc.*, p.name as component_name 
      FROM finished_product_components fpc
      JOIN products p ON fpc.component_product_id = p.id
      WHERE fpc.finished_product_id = ?
    `, [id]);
    
    res.json(components);
  } catch (error) {
    console.error('Error fetching components:', error);
    res.status(500).json({ message: 'Failed to fetch components' });
  }
});

// Create a new product
router.post('/', async (req, res) => {
  const product = req.body;
  
  if (!product.name || !product.category) {
    return res.status(400).json({ message: 'Name and category are required' });
  }
  
  try {
    // Fix: Convert the product object to a format suitable for MySQL INSERT
    const columns = Object.keys(product).join(', ');
    const placeholders = Object.keys(product).map(() => '?').join(', ');
    const values = Object.values(product);
    
    const sql = `INSERT INTO products (${columns}) VALUES (${placeholders})`;
    console.log('Executing SQL:', sql, 'with values:', values);
    
    const [result] = await db.query(sql, values);
    
    if (!result) {
      return res.status(500).json({ message: 'Failed to create product - no result returned' });
    }
    
    const [newProduct] = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    
    res.status(201).json(newProduct[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
});

// Create a new finished product with components
router.post('/finished', async (req, res) => {
  const { name, material, cost_per_sqm, components } = req.body;
  
  if (!name || !components || !Array.isArray(components) || components.length === 0) {
    return res.status(400).json({ 
      message: 'Name and at least one component are required' 
    });
  }
  
  const connection = await mysql.createConnection(db.config);
  
  try {
    await connection.beginTransaction();
    
    // Create the finished product
    const [result] = await connection.query(
      'INSERT INTO products (name, category, material, cost_per_sqm) VALUES (?, ?, ?, ?)',
      [name, 'finished_product', material || 'Mixed', cost_per_sqm || 0]
    );
    
    const productId = result.insertId;
    
    // Add components
    for (const component of components) {
      await connection.query(
        'INSERT INTO finished_product_components (finished_product_id, component_product_id, quantity) VALUES (?, ?, ?)',
        [productId, component.component_product_id, component.quantity || 1]
      );
    }
    
    // Get the complete product with components
    const [products] = await connection.query('SELECT * FROM products WHERE id = ?', [productId]);
    
    if (products.length === 0) {
      await connection.rollback();
      return res.status(500).json({ message: 'Product creation failed' });
    }
    
    const product = products[0];
    
    const [componentRows] = await connection.query(`
      SELECT fpc.*, p.name as component_name 
      FROM finished_product_components fpc
      JOIN products p ON fpc.component_product_id = p.id
      WHERE fpc.finished_product_id = ?
    `, [productId]);
    
    product.components = componentRows;
    
    await connection.commit();
    res.status(201).json(product);
  } catch (error) {
    await connection.rollback();
    console.error('Error creating finished product:', error);
    res.status(500).json({ message: 'Failed to create finished product' });
  } finally {
    connection.end();
  }
});

// Update a product
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  try {
    await db.query('UPDATE products SET ? WHERE id = ?', [updates, id]);
    const [updated] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    
    if (updated.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

// Delete a product
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if product exists
    const [product] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Delete the product
    await db.query('DELETE FROM products WHERE id = ?', [id]);
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

module.exports = router; 