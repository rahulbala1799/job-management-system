USE job_management;

CREATE TABLE IF NOT EXISTS job_costing (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id INT NOT NULL,
    job_item_id INT NOT NULL,
    cost_type ENUM('ink', 'material', 'labor', 'other') NOT NULL,
    cost_amount DECIMAL(10,2) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    units VARCHAR(20) NOT NULL,  -- ml, sheets, hours, etc.
    cost_per_unit DECIMAL(10,4) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (job_item_id) REFERENCES job_items(id) ON DELETE CASCADE
); 