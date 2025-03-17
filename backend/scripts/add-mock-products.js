// Script to populate the database with mock products
require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// Sample product data
const packagingProducts = [
  {
    name: 'Standard Business Card Box',
    description: 'Box of 500 standard business cards, 85x55mm',
    category: 'packaging',
    material: 'Cardstock',
    unit_price: 45.99,
    unit_type: 'boxed',
    units_per_box: 500,
    box_cost: 45.99
  },
  {
    name: 'Premium Card Box',
    description: 'Box of 250 premium business cards, 85x55mm',
    category: 'packaging',
    material: 'Luxury Cardstock',
    unit_price: 65.99,
    unit_type: 'boxed',
    units_per_box: 250,
    box_cost: 65.99
  },
  {
    name: 'Custom Product Box',
    description: 'Customizable product packaging box',
    category: 'packaging',
    material: 'Cardboard',
    unit_price: 2.50,
    unit_type: 'units',
    units_per_box: null,
    box_cost: null
  },
  {
    name: 'Luxury Gift Box',
    description: 'Premium gift boxes with magnetic closure',
    category: 'packaging',
    material: 'Rigid cardboard with soft-touch lamination',
    unit_price: 7.95,
    unit_type: 'units',
    units_per_box: null,
    box_cost: null
  },
  {
    name: 'Shipping Mailer Box',
    description: 'Corrugated mailer boxes for e-commerce',
    category: 'packaging',
    material: 'Corrugated cardboard',
    unit_price: 1.75,
    unit_type: 'units',
    units_per_box: null,
    box_cost: null
  }
];

const wideFormatProducts = [
  {
    name: 'Vinyl Banner',
    description: 'Durable outdoor vinyl banner',
    category: 'wide_format',
    material: 'Heavy-duty vinyl',
    width_m: 1.5,
    length_m: 50,
    roll_cost: 225,
    cost_per_sqm: 3
  },
  {
    name: 'Backlit Film',
    description: 'Film for illuminated displays',
    category: 'wide_format',
    material: 'Translucent polyester film',
    width_m: 1.2,
    length_m: 30,
    roll_cost: 216,
    cost_per_sqm: 6
  },
  {
    name: 'Canvas Print',
    description: 'Fine art canvas for high-quality prints',
    category: 'wide_format',
    material: 'Poly-cotton canvas',
    width_m: 1.1,
    length_m: 20,
    roll_cost: 275,
    cost_per_sqm: 12.5
  },
  {
    name: 'Window Graphics',
    description: 'Perforated film for window advertising',
    category: 'wide_format',
    material: 'Perforated vinyl',
    width_m: 1.37,
    length_m: 25,
    roll_cost: 205,
    cost_per_sqm: 6
  },
  {
    name: 'Floor Graphics',
    description: 'Anti-slip floor advertising material',
    category: 'wide_format',
    material: 'Textured vinyl with anti-slip coating',
    width_m: 1.3,
    length_m: 15,
    roll_cost: 195,
    cost_per_sqm: 10
  }
];

const leafletsProducts = [
  {
    name: 'A5 Flyer - 170gsm',
    description: 'Standard A5 full-color flyers',
    category: 'leaflets',
    material: 'Gloss paper',
    thickness: '170gsm',
    cost_per_unit: 0.18
  },
  {
    name: 'A4 Brochure - Folded',
    description: 'Tri-fold A4 brochures',
    category: 'leaflets',
    material: 'Silk paper',
    thickness: '150gsm',
    cost_per_unit: 0.42
  },
  {
    name: 'DL Leaflet',
    description: 'Standard DL size leaflets',
    category: 'leaflets',
    material: 'Uncoated paper',
    thickness: '120gsm',
    cost_per_unit: 0.12
  },
  {
    name: 'Premium Booklet',
    description: '8-page saddle-stitched booklet',
    category: 'leaflets',
    material: 'Silk paper',
    thickness: '200gsm cover/130gsm inside',
    cost_per_unit: 1.85
  },
  {
    name: 'A6 Postcard',
    description: 'Double-sided postcards',
    category: 'leaflets',
    material: 'Silk art paper',
    thickness: '350gsm',
    cost_per_unit: 0.25
  }
];

// Combined products array
const allProducts = [
  ...packagingProducts,
  ...wideFormatProducts,
  ...leafletsProducts
];

async function main() {
  let connection;
  
  try {
    // Try to use environment variables if available
    const dbConfig = {
      host: process.env.DB_HOST || 'mysql.railway.internal',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
      database: process.env.DB_NAME || 'railway',
      port: process.env.DB_PORT || 3306
    };
    
    console.log('Connecting to database with config:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port
    });
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    
    // Check connection
    const [result] = await connection.query('SELECT 1 as test');
    console.log('Database connection test:', result);
    
    // Check if products table exists
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'products'
    `);
    
    if (tables.length === 0) {
      console.error('Error: Products table does not exist. Please run the setup script first.');
      return;
    }
    
    // Check if category column exists in products table
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'products' 
      AND COLUMN_NAME = 'category'
    `);
    
    if (columns.length === 0) {
      console.log('Adding category column to products table');
      await connection.query(`ALTER TABLE products ADD COLUMN category VARCHAR(100) DEFAULT 'general'`);
      console.log('Category column added successfully');
    }
    
    // Add any missing columns needed for our product types
    const columnChecks = [
      { name: 'unit_type', type: 'VARCHAR(50)' },
      { name: 'units_per_box', type: 'INT' },
      { name: 'box_cost', type: 'DECIMAL(10,2)' },
      { name: 'width_m', type: 'DECIMAL(10,2)' },
      { name: 'length_m', type: 'DECIMAL(10,2)' },
      { name: 'roll_cost', type: 'DECIMAL(10,2)' },
      { name: 'cost_per_sqm', type: 'DECIMAL(10,2)' },
      { name: 'thickness', type: 'VARCHAR(100)' },
      { name: 'cost_per_unit', type: 'DECIMAL(10,2)' }
    ];
    
    for (const column of columnChecks) {
      const [colCheck] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'products' 
        AND COLUMN_NAME = ?
      `, [column.name]);
      
      if (colCheck.length === 0) {
        console.log(`Adding ${column.name} column to products table`);
        await connection.query(`ALTER TABLE products ADD COLUMN ${column.name} ${column.type}`);
      }
    }
    
    // Insert products
    let inserted = 0;
    let skipped = 0;
    
    for (const product of allProducts) {
      // Check if product with same name already exists
      const [existing] = await connection.query(
        'SELECT * FROM products WHERE name = ?', 
        [product.name]
      );
      
      if (existing.length > 0) {
        console.log(`Skipping existing product: ${product.name}`);
        skipped++;
        continue;
      }
      
      // Prepare the columns and values dynamically based on product category
      let columns = ['name', 'description', 'category', 'material', 'unit_price'];
      let placeholders = ['?', '?', '?', '?', '?'];
      let values = [product.name, product.description, product.category, product.material, product.unit_price];
      
      // Add category-specific fields
      if (product.category === 'packaging') {
        columns = [...columns, 'unit_type', 'units_per_box', 'box_cost'];
        placeholders = [...placeholders, '?', '?', '?'];
        values = [...values, product.unit_type, product.units_per_box, product.box_cost];
      } 
      else if (product.category === 'wide_format') {
        columns = [...columns, 'width_m', 'length_m', 'roll_cost', 'cost_per_sqm'];
        placeholders = [...placeholders, '?', '?', '?', '?'];
        values = [...values, product.width_m, product.length_m, product.roll_cost, product.cost_per_sqm];
      } 
      else if (product.category === 'leaflets') {
        columns = [...columns, 'thickness', 'cost_per_unit'];
        placeholders = [...placeholders, '?', '?'];
        values = [...values, product.thickness, product.cost_per_unit];
      }
      
      // Build the query
      const query = `
        INSERT INTO products (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
      `;
      
      // Insert the product
      const [result] = await connection.query(query, values);
      console.log(`Inserted product: ${product.name} (ID: ${result.insertId})`);
      inserted++;
    }
    
    console.log('='.repeat(50));
    console.log(`Successfully added ${inserted} products (${skipped} skipped)`);
    console.log('Products by category:');
    console.log(`- Packaging: ${packagingProducts.length}`);
    console.log(`- Wide Format: ${wideFormatProducts.length}`);
    console.log(`- Leaflets: ${leafletsProducts.length}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('Error adding products:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

main(); 