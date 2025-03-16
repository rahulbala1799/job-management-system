# Job Costing Implementation

This implementation addresses the issue where ink costs were not being properly saved and factored into margin calculations.

## Problem

1. For wide format jobs, the `inkConsumption` field was being saved but not properly used in cost calculations
2. For packaging jobs, the `inkCostPerUnit` field was being saved but not consistently calculated into margins

## Solution

We created a new `job_costing` table to properly track various costs associated with jobs and job items. This provides several advantages:

1. Support for multiple cost types (ink, material, labor, other)
2. More accurate calculation of margins
3. Better historical tracking of costs
4. Improved reporting capabilities

## Implementation Details

### Database Changes

A new `job_costing` table has been added with the following structure:

```sql
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
```

### Backend Changes

1. Added a new route `/api/job-costing` with CRUD operations
2. Created migration script to transfer existing ink cost data to the new table

### Frontend Changes

1. Created a new API service `jobCostingApi.ts` to interface with the job costing endpoints
2. Updated the JobDetail page to save ink costs to the new table
3. Updated the Overview page to include job costs from the job_costing table in margin calculations

## How to Use

### For Packaging Jobs

When updating a packaging job item, enter the ink cost per unit. This will be saved to the job_costing table and used in margin calculations.

### For Wide Format Jobs

When updating a wide format job item, enter the ink consumption in ml. The system uses a standard cost per ml (currently set to €0.05/ml) and calculates the total ink cost.

## Migration

To migrate existing data to the new table, run:

```
cd dashboard/backend
./migrate_job_costing.sh
```

This will create the new table and transfer existing ink cost data from the jobs and job_items tables. 