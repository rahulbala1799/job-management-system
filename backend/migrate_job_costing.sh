#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Set variables
DB_USER=${DB_USER:-"root"}
DB_PASSWORD=${DB_PASSWORD:-""}
DB_NAME=${DB_NAME:-"job_management"}
DB_HOST=${DB_HOST:-"localhost"}

echo "Running job_costing table migration..."
echo "Using database: ${DB_NAME} on ${DB_HOST}"

# Execute the SQL script
mysql -h $DB_HOST -u $DB_USER ${DB_PASSWORD:+-p$DB_PASSWORD} $DB_NAME <<EOF
CREATE TABLE IF NOT EXISTS job_costing (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id INT NOT NULL,
    job_item_id INT NOT NULL,
    cost_type ENUM('ink', 'material', 'labor', 'other') NOT NULL,
    cost_amount DECIMAL(10,2) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    units VARCHAR(20) NOT NULL,
    cost_per_unit DECIMAL(10,4) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (job_item_id) REFERENCES job_items(id) ON DELETE CASCADE
);

# Migrate existing data from jobs and job_items tables
INSERT INTO job_costing (job_id, job_item_id, cost_type, cost_amount, quantity, units, cost_per_unit)
SELECT 
    ji.job_id,
    ji.id as job_item_id,
    'ink' as cost_type,
    IFNULL(ji.ink_cost_per_unit * ji.quantity, 0) as cost_amount,
    ji.quantity,
    'units' as units,
    IFNULL(ji.ink_cost_per_unit, 0) as cost_per_unit
FROM 
    job_items ji
WHERE 
    ji.product_category = 'packaging' 
    AND ji.ink_cost_per_unit IS NOT NULL 
    AND ji.ink_cost_per_unit > 0;

INSERT INTO job_costing (job_id, job_item_id, cost_type, cost_amount, quantity, units, cost_per_unit)
SELECT 
    ji.job_id,
    ji.id as job_item_id,
    'ink' as cost_type,
    IFNULL(ji.ink_consumption * 0.05, 0) as cost_amount,
    IFNULL(ji.ink_consumption, 0) as quantity,
    'ml' as units,
    0.05 as cost_per_unit
FROM 
    job_items ji
WHERE 
    ji.product_category = 'wide_format' 
    AND ji.ink_consumption IS NOT NULL 
    AND ji.ink_consumption > 0;
EOF

# Check if the migration was successful
if [ $? -eq 0 ]; then
    echo "Migration completed successfully!"
else
    echo "Migration failed."
    exit 1
fi

echo "Done."
