USE job_management;

-- Add 'finished_product' to the category enum in the products table
ALTER TABLE products 
MODIFY COLUMN category ENUM('packaging', 'wide_format', 'leaflets', 'finished_product') NOT NULL;

-- Create a table for finished product components
CREATE TABLE IF NOT EXISTS finished_product_components (
  id INT PRIMARY KEY AUTO_INCREMENT,
  finished_product_id INT NOT NULL,
  component_product_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  area_sqm DECIMAL(10,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (finished_product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Example: Create a sample finished product (Corriboard sign with laminate)
INSERT INTO products (
  name,
  category,
  material,
  cost_per_sqm  -- Will be calculated based on components
) VALUES (
  'Corriboard Sign with Laminate',
  'finished_product',
  'Mixed',
  0  -- Placeholder, will update after adding components
);

-- Get the ID of the just-inserted finished product
SET @finished_product_id = LAST_INSERT_ID();

-- Add Corriboard as component
INSERT INTO finished_product_components (
  finished_product_id,
  component_product_id,
  quantity
) 
SELECT 
  @finished_product_id,
  id,
  1
FROM products
WHERE name = 'Corriboard 5mm';

-- Add Laminate as component
INSERT INTO finished_product_components (
  finished_product_id,
  component_product_id,
  quantity
) 
SELECT 
  @finished_product_id,
  id,
  1
FROM products
WHERE name = 'Laminate Matte';

-- Calculate the sum of component costs and store in a variable
SET @total_cost = (
  SELECT SUM(p.cost_per_sqm * fpc.quantity)
  FROM finished_product_components fpc
  JOIN products p ON fpc.component_product_id = p.id
  WHERE fpc.finished_product_id = @finished_product_id
);

-- Update the finished product with the calculated cost
UPDATE products 
SET cost_per_sqm = @total_cost
WHERE id = @finished_product_id;

-- Example: Create another sample finished product (Foamex sign with vinyl and laminate)
INSERT INTO products (
  name,
  category,
  material,
  cost_per_sqm  -- Will be calculated based on components
) VALUES (
  'Foamex Sign with Vinyl and Laminate',
  'finished_product',
  'Mixed',
  0  -- Placeholder, will update after adding components
);

-- Get the ID of the just-inserted finished product
SET @finished_product_id = LAST_INSERT_ID();

-- Add Foamex as component
INSERT INTO finished_product_components (
  finished_product_id,
  component_product_id,
  quantity
) 
SELECT 
  @finished_product_id,
  id,
  1
FROM products
WHERE name = 'Foamex 5mm';

-- Add Vinyl as component
INSERT INTO finished_product_components (
  finished_product_id,
  component_product_id,
  quantity
) 
SELECT 
  @finished_product_id,
  id,
  1
FROM products
WHERE name = 'Avery Dennison Vinyl';

-- Add Laminate as component
INSERT INTO finished_product_components (
  finished_product_id,
  component_product_id,
  quantity
) 
SELECT 
  @finished_product_id,
  id,
  1
FROM products
WHERE name = 'Laminate Matte';

-- Calculate the sum of component costs and store in a variable
SET @total_cost = (
  SELECT SUM(p.cost_per_sqm * fpc.quantity)
  FROM finished_product_components fpc
  JOIN products p ON fpc.component_product_id = p.id
  WHERE fpc.finished_product_id = @finished_product_id
);

-- Update the finished product with the calculated cost
UPDATE products 
SET cost_per_sqm = @total_cost
WHERE id = @finished_product_id; 