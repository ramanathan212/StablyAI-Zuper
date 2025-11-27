# Environment Configuration

This configuration allows you to run tests on different environments (UAT or Staging) with their respective login credentials.

## Usage

### Run tests on UAT (default):
```bash
npx playwright test tests/clone-job.spec.js
```

or explicitly:
```bash
TEST_ENV=uat npx playwright test tests/clone-job.spec.js
```

### Run tests on Staging:
```bash
TEST_ENV=staging npx playwright test tests/clone-job.spec.js
```

## Clone Job in Loop Mode

You can clone a job multiple times by specifying the loop count:

### Using test-data.js (default: 3 times):
Edit `tests/test-data.js` and change the `loopCount` value:
```javascript
jobClone: {
  searchText: 'Testing -> job 2',
  jobNumber: 'Sofy AI1875',
  assignedUser: 'ramanathan',
  loopCount: 5 // Clone 5 times
}
```

### Using environment variable (override):
```bash
CLONE_LOOP_COUNT=10 npx playwright test tests/clone-job.spec.js
```

### Combine environment and loop count:
```bash
TEST_ENV=staging CLONE_LOOP_COUNT=5 npx playwright test tests/clone-job.spec.js
```

This will:
1. Login once
2. Navigate to Jobs once
3. Clone the job 5 times in a loop
4. Each iteration includes: search → open → clone → assign user → create

## Environment Details

### UAT Environment
- **Base URL**: https://uat.zuperpro.com
- **Company**: zuper-pro
- **Email**: vignesh.s@zuper.co
- **Password**: Vicky@123

### Staging Environment
- **Base URL**: https://stagingv3.zuperpro.com
- **Company**: sofyaizuper
- **Email**: ramanathan.m@zuper.co
- **Password**: Test@123

## How It Works

1. The `environments.js` file contains configuration for both environments
2. The `getEnvironment()` function reads the `TEST_ENV` environment variable
3. If no environment is specified, it defaults to UAT
4. The LoginPage class accepts a baseURL parameter to override the default configuration
5. Tests import and use the environment configuration in their beforeEach hook

## Adding New Environments

To add a new environment, edit `environments.js`:

```javascript
export const environments = {
  uat: { ... },
  staging: { ... },
  production: {
    baseURL: 'https://app.zuperpro.com',
    login: {
      companyName: 'your-company',
      email: 'user@example.com',
      password: 'YourPassword123'
    }
  }
};
```

Then run:
```bash
TEST_ENV=production npx playwright test tests/clone-job.spec.js
```
