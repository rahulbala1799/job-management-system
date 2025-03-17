// Export products from local database
const fs = require('fs');
const mysql = require('mysql2/promise');

async function exportProducts() {
  console.log('Starting product export from local database...');
  
  // Prompt user for database credentials if needed
  const dbConfig = {
    host: 'localhost',     // Update with your local MySQL host
    user: 'root',          // Update with your local MySQL username
    password: '',          // Update with your local MySQL password
    database: 'job_management'  // Update with your local database name
  };
  
  console.log('Using database config:', JSON.stringify({
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database
  }));

  try {
    // Create connection
    console.log('Connecting to local database...');
    const connection = await mysql.createConnection(dbConfig);
    
    // Test connection
    console.log('Testing connection...');
    await connection.query('SELECT 1');
    console.log('Connection successful!');
    
    // List tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Available tables:', tables.map(t => Object.values(t)[0]).join(', '));
    
    // Get all products from local database
    console.log('Fetching products...');
    const [products] = await connection.query('SELECT * FROM products');
    console.log(`Found ${products.length} products to export`);
    
    // Format the data as a JSON file
    const productData = JSON.stringify(products, null, 2);
    
    // Write to a file
    const outputFile = 'exported-products.json';
    fs.writeFileSync(outputFile, productData);
    
    console.log(`Products exported successfully to ${outputFile}`);
    console.log('First few products:', products.slice(0, 2));
    
    // Close connection
    await connection.end();
    return products;
  } catch (error) {
    console.error('Error exporting products:', error);
    throw error;
  }
}

exportProducts()
  .then(products => {
    console.log('Export completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Export failed:', err);
    process.exit(1);
  });
