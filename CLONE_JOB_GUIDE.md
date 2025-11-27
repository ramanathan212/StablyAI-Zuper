# Clone Job Test - Complete Guide

## Overview
The clone job test allows you to clone a job multiple times in a loop, with support for different environments (UAT/Staging).

## Quick Start

### 1. Clone job once on UAT (default)
```bash
npx playwright test tests/clone-job.spec.js
```

### 2. Clone job 5 times on UAT
```bash
CLONE_LOOP_COUNT=5 npx playwright test tests/clone-job.spec.js
```

### 3. Clone job 10 times on Staging
```bash
TEST_ENV=staging CLONE_LOOP_COUNT=10 npx playwright test tests/clone-job.spec.js
```

### 4. Clone job with headed mode (see browser)
```bash
CLONE_LOOP_COUNT=3 npx playwright test tests/clone-job.spec.js --headed
```

## Configuration Options

### Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `TEST_ENV` | `uat`, `staging` | `uat` | Which environment to run tests on |
| `CLONE_LOOP_COUNT` | Any number | `3` (from test-data.js) | Number of times to clone the job |

### Test Data Configuration

Edit `tests/test-data.js` to change default settings:

```javascript
jobClone: {
  searchText: 'Testing -> job 2',      // Job search text
  jobNumber: 'Sofy AI1875',            // Job number/ID to clone
  assignedUser: 'ramanathan',          // User to assign to cloned job
  loopCount: 3                         // Default loop count
}
```

## Environment Credentials

### UAT Environment
- **URL**: https://uat.zuperpro.com
- **Company**: zuper-pro
- **Email**: vignesh.s@zuper.co
- **Password**: Vicky@123

### Staging Environment
- **URL**: https://stagingv3.zuperpro.com
- **Company**: sofyaizuper
- **Email**: ramanathan.m@zuper.co
- **Password**: Test@123

## Test Flow

The test follows this workflow:

1. **Login** (once)
   - Navigate to login page
   - Enter credentials based on environment
   - Dismiss onboarding popup

2. **Navigate to Jobs** (once)
   - Open navigation menu
   - Click on Jobs link

3. **Clone Loop** (repeated N times)
   - Search for the job
   - Open job details
   - Click "More Actions" → "Clone Job"
   - Assign user to the cloned job
   - Create the cloned job
   - Navigate back to jobs list (except last iteration)

4. **Verification**
   - Each cloned job is verified to be created successfully
   - Test results are logged with pass/fail status

## Test Results

The test provides detailed output including:
- ✓ Step-by-step execution status
- ⏱️ Duration for each step
- 📊 Summary with passed/failed counts
- 🔁 Iteration progress (e.g., `[1/5]`, `[2/5]`, etc.)

### Example Output
```
🌍 Running tests on: UAT environment
   Base URL: https://uat.zuperpro.com

🔄 Running job clone in loop mode: 3 iteration(s)

✓ Login to application - PASSED
✓ Navigate to Jobs - PASSED

================================================================================
🔁 CLONE ITERATION 1 of 3
================================================================================

✓ [1/3] Search for job - PASSED
✓ [1/3] Open job details - PASSED
✓ [1/3] Clone the job - PASSED
✓ [1/3] Assign user to cloned job - PASSED
✓ [1/3] Create cloned job - PASSED
✓ [1/3] Navigate back to Jobs list - PASSED

✓ Clone iteration 1 completed successfully!

... (repeat for iteration 2 and 3)

================================================================================
✓ Successfully cloned job 3 time(s)!
================================================================================
```

## Advanced Usage

### Run with specific browser
```bash
CLONE_LOOP_COUNT=5 npx playwright test tests/clone-job.spec.js --project=chromium
```

### Run with debug mode
```bash
CLONE_LOOP_COUNT=2 npx playwright test tests/clone-job.spec.js --debug
```

### Generate HTML report
```bash
CLONE_LOOP_COUNT=5 npx playwright test tests/clone-job.spec.js
npx playwright show-report
```

## Troubleshooting

### Issue: Test times out
**Solution**: Increase timeout in `playwright.config.js`:
```javascript
timeout: 300000, // 5 minutes
```

### Issue: Job not found
**Solution**: Update the job search text and number in `tests/test-data.js`:
```javascript
jobClone: {
  searchText: 'Your Job Search Text',
  jobNumber: 'Your Job Number',
  ...
}
```

### Issue: User not found
**Solution**: Update the assigned user name in `tests/test-data.js`:
```javascript
jobClone: {
  ...
  assignedUser: 'username',
}
```

## Files Structure

```
tests/
├── clone-job.spec.js           # Main test file with loop logic
├── pages/
│   ├── LoginPage.js            # Login page object
│   └── JobPage.js              # Job page object with clone methods
├── config/
│   ├── environments.js         # Environment configurations
│   └── README.md               # Configuration documentation
└── test-data.js                # Test data including loop count
```

## Tips

1. **Start small**: Test with 1-2 iterations first to ensure everything works
2. **Use headed mode**: Run with `--headed` flag to see what's happening
3. **Check credentials**: Make sure you have access to the environment you're testing
4. **Monitor performance**: Large loop counts may take significant time
5. **Clean up**: Consider deleting cloned jobs periodically to avoid clutter
