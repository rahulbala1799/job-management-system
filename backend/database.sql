CREATE DATABASE IF NOT EXISTS job_management;
USE job_management;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('admin', 'employee') NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(255) NOT NULL,
    size VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    status ENUM('pending', 'in_progress', 'artwork_issue', 'client_approval', 'completed', 'cancelled') DEFAULT 'pending',
    work_completed INT DEFAULT 0,
    ink_cost_per_unit DECIMAL(10,2) DEFAULT NULL,
    ink_consumption DECIMAL(10,2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    last_updated_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (last_updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    clock_in_time DATETIME NOT NULL,
    clock_out_time DATETIME,
    date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (employee_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS job_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_category VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    work_completed INT DEFAULT 0,
    is_printed BOOLEAN DEFAULT FALSE,
    width_m DECIMAL(10,2),
    height_m DECIMAL(10,2),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    ink_cost_per_unit DECIMAL(10,2),
    ink_consumption DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
); 