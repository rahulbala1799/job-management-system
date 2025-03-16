# Job Management System Deployment Guide

This directory contains the deployment-ready files for the Job Management System application.

## Directory Structure

- `frontend/` - Contains the compiled React frontend application
- `backend/` - Contains the Node.js Express backend application
- `sql/` - Contains SQL scripts for database setup

## Deployment to SiteGround

### Prerequisites

- SiteGround hosting account with:
  - Node.js support
  - MySQL database
  - SSH access (recommended)

### Database Setup

1. Create a MySQL database in SiteGround's cPanel
2. Import the SQL scripts from the `sql/` directory in this order:
   - `database.sql` (Creates the basic tables)
   - `create_job_costing_table.sql` (Creates the job costing table)
   - Other SQL scripts as needed

### Backend Deployment

1. Upload the contents of the `backend/` directory to your desired location on SiteGround
2. Update the `.env` file with your SiteGround database credentials:
   ```
   DB_USER=your_siteground_db_user
   DB_PASSWORD=your_siteground_db_password
   DB_NAME=your_siteground_db_name
   DB_HOST=your_siteground_db_host
   ```
3. Install Node.js dependencies:
   ```
   cd /path/to/backend
   npm install
   ```
4. Set up the Node.js application in SiteGround:
   - In cPanel, go to "Node.js" manager
   - Create a new application pointing to your backend directory
   - Set the application's entry point to `server.js`
   - Set the application's domain or subdomain
   - Configure the `CLIENT_ORIGIN` environment variable to point to your frontend URL

### Frontend Deployment

1. Upload the contents of the `frontend/` directory to your web root or subdirectory
2. If you're deploying to a subdirectory, you may need to update the `homepage` field in the `package.json` before building

### Integration

1. Make sure the `CLIENT_ORIGIN` environment variable in the backend matches your frontend URL
2. Update the API base URL in the frontend if needed (this is typically set in `src/services/api.js`)

### Running the Migration Script

After deploying and setting up the database, you may need to run the migration script:

```
cd /path/to/backend
chmod +x migrate_job_costing.sh
./migrate_job_costing.sh
```

## Troubleshooting

- If you see CORS errors, make sure the `CLIENT_ORIGIN` environment variable in the backend is set correctly
- If database connections fail, verify your database credentials in the `.env` file
- Check SiteGround's Node.js logs for backend errors

## Production Mode

To run the backend in production mode, set the `NODE_ENV` environment variable to `production`. This will:
- Serve the frontend static files from the backend
- Enable other production optimizations

```
NODE_ENV=production node server.js
``` 