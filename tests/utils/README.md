# Job Creation Utilities

This folder contains utilities for bulk job creation via the Zuper API.

## Files

### JobCreator.js
The main class that handles API communication and job creation logic.

**Features:**
- Fetch existing jobs as templates
- Create single jobs
- Create multiple jobs in batches
- Automatic unique naming
- Error handling and retry logic
- Progress tracking

### fetch-job-template.js
A utility script to fetch and save an existing job's structure.

**Usage:**
```bash
# Update the config in the file first
node tests/utils/fetch-job-template.js
```

This will:
1. Fetch the specified job from the API
2. Display job details in the console
3. Save the full job structure to a JSON file

Use this to understand the job structure before creating bulk jobs.

## Quick Start

1. **Get a Job Template:**
   ```bash
   node tests/utils/fetch-job-template.js
   ```

2. **Review the Template:**
   Open the generated `job-template-*.json` file

3. **Create Bulk Jobs:**
   ```bash
   node tests/create-bulk-jobs.js
   ```

## Example Usage in Code

```javascript
import { JobCreator } from './tests/utils/JobCreator.js';

// Initialize
const creator = new JobCreator({
  baseUrl: 'https://stagingv2.zuperpro.com',
  apiUrl: 'https://stagingv2.zuperpro.com/api',
  token: 'your-token'
});

// Fetch template
const template = await creator.getJobTemplate('job-uid');

// Create 100 jobs
const results = await creator.createMultipleJobs(
  template,
  100,   // total jobs
  10,    // batch size
  1000   // delay in ms
);

console.log(`Created: ${results.successful.length} jobs`);
console.log(`Failed: ${results.failed.length} jobs`);
```

## Configuration

All scripts require:
- Valid authentication token
- API endpoint URLs
- Company UID (for job creation)
- Template job UID (for fetching templates)

## See Also

- [BULK_JOB_CREATION_GUIDE.md](/BULK_JOB_CREATION_GUIDE.md) - Complete documentation
- [create-bulk-jobs.js](/tests/create-bulk-jobs.js) - Main bulk creation script
- [create-bulk-jobs-custom.js](/tests/create-bulk-jobs-custom.js) - Custom template example
