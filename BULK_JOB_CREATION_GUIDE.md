# Bulk Job Creation Guide

This guide explains how to use the JobCreator class to create multiple jobs in bulk using the Zuper API.

## Overview

The bulk job creation system consists of two main files:

1. **JobCreator.js** - A reusable class that handles API communication and job creation
2. **create-bulk-jobs.js** - The main script that uses the JobCreator class to create 1000 jobs

## Features

- ✅ Creates jobs in configurable batches
- ✅ Rate limiting with delays between batches
- ✅ Automatic unique job naming with timestamps
- ✅ Progress tracking and detailed logging
- ✅ Error handling and retry logic
- ✅ Summary report with success/failure statistics
- ✅ Exports results to JSON file

## Prerequisites

1. Node.js installed (version 14 or higher)
2. Valid Zuper API authentication token
3. Access to an existing job that will be used as a template

## Getting Started

### Step 1: Get Your Authentication Token

You need a valid Bearer token from the Zuper platform. You can obtain this by:

1. Open your browser's Developer Tools (F12)
2. Go to the Network tab
3. Log in to Zuper staging/production
4. Look for API requests and copy the Authorization header value
5. The token looks like: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 2: Find a Template Job

You need the UID of an existing job to use as a template:

1. Navigate to a job in the Zuper interface
2. Copy the job UID from the URL
3. Example: `https://stagingv2.zuperpro.com/jobs/6078d15d-2cda-42a5-bdbf-7f53e940f461`
4. The UID is: `6078d15d-2cda-42a5-bdbf-7f53e940f461`

### Step 3: Configure the Script

Open `tests/create-bulk-jobs.js` and update the configuration:

```javascript
const config = {
  baseUrl: 'https://stagingv2.zuperpro.com',
  apiUrl: 'https://stagingv2.zuperpro.com/api',
  token: 'YOUR_TOKEN_HERE',  // Update with your token
  companyUid: 'YOUR_COMPANY_UID',
  templateJobUid: 'YOUR_TEMPLATE_JOB_UID'  // Update with template job UID
};

const jobCreationSettings = {
  totalJobs: 1000,           // Number of jobs to create
  batchSize: 10,             // Jobs per batch
  delayBetweenBatches: 1000  // Delay in milliseconds
};
```

### Step 4: Run the Script

```bash
# Make sure you're in the project directory
cd /Users/zuper/Playwrite-Automation

# Run the script
node tests/create-bulk-jobs.js
```

## Configuration Options

### API Configuration

- **baseUrl**: The base URL of the Zuper platform
- **apiUrl**: The API endpoint URL
- **token**: Your authentication Bearer token
- **companyUid**: Your company's unique identifier
- **templateJobUid**: The UID of the job to use as a template

### Job Creation Settings

- **totalJobs**: Total number of jobs to create (default: 1000)
- **batchSize**: Number of jobs to create simultaneously (default: 10)
  - Smaller batches = slower but more stable
  - Larger batches = faster but may hit rate limits
- **delayBetweenBatches**: Milliseconds to wait between batches (default: 1000)
  - Increase if you encounter rate limiting errors
  - Decrease for faster execution (if allowed by API)

## How It Works

### Job Creation Process

1. **Fetch Template**: The script fetches the template job data
2. **Batch Processing**: Jobs are created in batches to avoid overwhelming the API
3. **Unique Naming**: Each job gets a unique title with timestamp and index
4. **Error Handling**: Failed jobs are tracked and reported
5. **Results Export**: All results are saved to a JSON file

### Unique Job Fields

The script automatically makes each job unique by modifying:

- **Title**: Appends `- Batch {index} - {timestamp}`
- **Job Number**: Generates `JOB-{timestamp}-{index}`
- **Reference Number**: Generates `REF-{timestamp}-{index}`
- **IDs**: Removes existing UIDs to allow server generation

## Output

### Console Output

```
🔧 Initializing Job Creator...
✓ Configuration validated

📥 Fetching template job: 6078d15d-2cda-42a5-bdbf-7f53e940f461
✓ Template job fetched successfully

🚀 Starting bulk job creation: 1000 jobs in batches of 10
⏱️  Delay between batches: 1000ms

📦 Batch 1/100 (Jobs 1-10)
✓ Job 1 created successfully: abc123...
✓ Job 2 created successfully: def456...
...
   ✓ Success: 10/10
   ✗ Failed: 0/10

==================================================
📊 SUMMARY
==================================================
Total Jobs Requested: 1000
✓ Successful: 998
✗ Failed: 2
⏱️  Duration: 120.45 seconds
⚡ Average: 8.30 jobs/second
==================================================

💾 Results saved to: job-creation-results-1234567890.json
🎉 All jobs created successfully!
```

### Results File

A JSON file is created with detailed results:

```json
{
  "total": 1000,
  "successful": [
    {
      "success": true,
      "index": 1,
      "data": { "job_uid": "...", "title": "..." }
    }
  ],
  "failed": [
    {
      "success": false,
      "index": 999,
      "error": "Rate limit exceeded"
    }
  ],
  "startTime": "2024-01-15T10:00:00.000Z",
  "endTime": "2024-01-15T10:02:00.000Z"
}
```

## Using the JobCreator Class

You can also use the JobCreator class in your own scripts:

```javascript
import { JobCreator } from './tests/utils/JobCreator.js';

const jobCreator = new JobCreator({
  baseUrl: 'https://stagingv2.zuperpro.com',
  apiUrl: 'https://stagingv2.zuperpro.com/api',
  token: 'your-token-here'
});

// Fetch a template job
const template = await jobCreator.getJobTemplate('job-uid-here');

// Create a single job
const result = await jobCreator.createJob(template, 1);

// Create multiple jobs
const results = await jobCreator.createMultipleJobs(
  template,
  100,    // total jobs
  5,      // batch size
  2000    // delay between batches
);
```

## Methods

### JobCreator Class Methods

#### `constructor(config)`
Initialize a new JobCreator instance.

```javascript
const jobCreator = new JobCreator({
  baseUrl: 'https://stagingv2.zuperpro.com',
  apiUrl: 'https://stagingv2.zuperpro.com/api',
  token: 'your-bearer-token'
});
```

#### `getJobTemplate(jobUid)`
Fetches an existing job to use as a template.

```javascript
const template = await jobCreator.getJobTemplate('6078d15d-2cda-42a5-bdbf-7f53e940f461');
```

#### `createJob(jobData, index)`
Creates a single job with unique identifiers.

```javascript
const job = await jobCreator.createJob(templateData, 1);
```

#### `createMultipleJobs(templateJobData, count, batchSize, delayBetweenBatches)`
Creates multiple jobs in batches.

```javascript
const results = await jobCreator.createMultipleJobs(
  templateData,
  1000,  // total jobs
  10,    // batch size
  1000   // delay in ms
);
```

#### `validateConfig()`
Validates that required configuration is present.

```javascript
jobCreator.validateConfig(); // Throws error if invalid
```

## Troubleshooting

### Common Issues

#### 1. Authentication Error (401)

```
Error: Failed to fetch job template: 401 Unauthorized
```

**Solution**: Your token has expired. Get a fresh token from the browser.

#### 2. Rate Limit Error (429)

```
Error: Failed to create job: 429 Too Many Requests
```

**Solution**: Increase `delayBetweenBatches` or decrease `batchSize`.

#### 3. Template Job Not Found (404)

```
Error: Failed to fetch job template: 404 Not Found
```

**Solution**: Verify the `templateJobUid` is correct and you have access to it.

#### 4. Network Timeout

```
Error: fetch failed
```

**Solution**: Check your internet connection and API URL.

## Performance Tips

1. **Optimal Batch Size**: Start with 10 and adjust based on results
2. **Rate Limiting**: Monitor for 429 errors and increase delays if needed
3. **Token Expiry**: Tokens expire - use a fresh one for long-running operations
4. **Network Stability**: Run from a stable connection for large batches

## Estimated Timing

With default settings (10 jobs/batch, 1 second delay):
- **100 jobs**: ~15-20 seconds
- **500 jobs**: ~60-80 seconds
- **1000 jobs**: ~120-150 seconds

## Security Considerations

⚠️ **Important**: Never commit your authentication token to version control!

- Keep tokens in environment variables or secure configuration files
- Add `.env` files to `.gitignore`
- Rotate tokens regularly
- Use different tokens for staging and production

## Example: Environment Variables

Create a `.env` file (add to `.gitignore`):

```env
ZUPER_API_TOKEN=your-token-here
ZUPER_COMPANY_UID=your-company-uid
ZUPER_TEMPLATE_JOB_UID=template-job-uid
```

Update the script to use environment variables:

```javascript
import dotenv from 'dotenv';
dotenv.config();

const config = {
  token: process.env.ZUPER_API_TOKEN,
  companyUid: process.env.ZUPER_COMPANY_UID,
  templateJobUid: process.env.ZUPER_TEMPLATE_JOB_UID
};
```

## Support

For issues or questions:
1. Check the error messages in the console
2. Review the generated results JSON file
3. Verify your configuration settings
4. Ensure your token is valid and not expired

## License

This tool is part of the Playwright Automation project.
