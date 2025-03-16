# Job Management System

A complete job management system for printing businesses, with tracking for packaging, wide format, and leaflets jobs.

## Features

- User authentication and role-based access
- Customer management
- Product management
- Job tracking with detailed item info
- Invoice generation
- Job costing with ink and material cost tracking
- Profit margin analysis

## Deployment to Railway

This project is configured for easy deployment to Railway.app.

### Prerequisites

- A Railway.app account (Hobby plan or higher)
- Git installed on your local machine

### Deployment Steps

1. **Create a new project on Railway**
   - Login to Railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"

2. **Connect your GitHub repository**
   - Follow Railway's prompts to connect your GitHub account
   - Select this repository

3. **Add a MySQL database**
   - In your Railway project, click "New"
   - Select "Database" → "MySQL"
   - Wait for the database to be provisioned

4. **Set environment variables**
   - In your Railway project, go to the Variables tab
   - Add the following variable:
     - `RAILWAY_JWT_SECRET` - A random string for JWT token encryption (e.g., generate one with `openssl rand -hex 32`)

5. **Deploy**
   - Railway will automatically deploy your application
   - It will use the configuration in `railway.json` and `Procfile`

6. **Import database schema**
   - Go to the MySQL service in your Railway project
   - Click "Connect"
   - Use the MySQL CLI or GUI to import the schema from `backend/database.sql` and `backend/create_job_costing_table.sql`

### Database Migration

After deploying, you'll need to run the migration script to set up the job_costing table:

1. Go to your project on Railway
2. Open the Shell for your app service
3. Run:
   ```
   cd backend && chmod +x migrate_job_costing.sh && ./migrate_job_costing.sh
   ```

## Local Development

### Prerequisites

- Node.js 18+
- MySQL

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm run install-all
   ```
3. Set up your environment variables in `backend/.env`
4. Start the development servers:
   ```
   npm run dev
   ```

## License

This project is proprietary and confidential.

# Dashboard

## ESLint Configuration

This project uses ESLint with strict TypeScript rules to ensure code quality and prevent common errors.

### Key Features

- Strong TypeScript integration
- React-specific rules
- Import order and validation
- Safe type assertions
- Numeric method safety (preventing `toFixed` errors)

### Setting Up

The ESLint configuration is already set up in the `.eslintrc.js` file. To use it:

1. Run linting:
   ```
   npm run lint
   ```

2. Fix linting issues automatically:
   ```
   npm run lint:fix
   ```

3. VS Code integration is configured in `.vscode/settings.json`

### Best Practices

1. **Always check types**: Use TypeScript's type system for safety
   ```typescript
   // Bad
   someValue.toFixed(2)
   
   // Good
   typeof someValue === 'number' ? someValue.toFixed(2) : '0.00'
   // or
   Number(someValue).toFixed(2)
   ```

2. **Handle optional values**: Use optional chaining and nullish coalescing
   ```typescript
   // Bad
   const name = user.profile.name;
   
   // Good
   const name = user?.profile?.name ?? 'Unknown';
   ```

3. **Avoid any**: Explicit typing prevents runtime errors
   ```typescript
   // Bad
   const data: any = fetchData();
   
   // Good
   const data: UserProfile = fetchData();
   ```

4. **Fix warnings**: Don't ignore ESLint warnings, they often indicate potential issues

### Pre-commit Hooks

For automated checks before commits, set up Husky:

```bash
npm install --save-dev husky lint-staged
npx husky install
npm pkg set scripts.prepare="husky install"
npx husky add .husky/pre-commit "npx lint-staged"
```

Then add to package.json:
```json
"lint-staged": {
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix"
  ]
}
```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
