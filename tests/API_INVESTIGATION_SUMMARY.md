# API Investigation Summary

## Problem

The Zuper API is rejecting job creation requests with error:
```
{"message":"Job Title / Job Category Missing","title":"Missing Job Title / Job Category","type":"error"}
```

## What We've Tried

### 1. Different Field Formats
- ✗ `job_category`: "Installation" (string)
- ✗ `job_category_uid`: "285e6d01-1449-4f38-8cd6-091738e15e0f" (UUID)
- ✗ `job_category`: {full object} (object with category_uid, category_name, etc.)
- ✗ Both `job_category` and `jobCategory` (camelCase)

### 2. Different Payload Structures
- ✗ Flat structure: `{ title: "...", job_category_uid: "..." }`
- ✗ Wrapped structure: `{ job: { title: "...", job_category_uid: "..." } }`

### 3. Additional Required Fields
- ✗ Added `customer_uid`
- ✗ Added `scheduled_start_time` and `scheduled_end_time`
- ✗ Added `company_uid`

## Observations

1. **GET vs POST Format**: The GET `/api/jobs/{uid}` endpoint returns data wrapped in:
   ```json
   {
     "type": "success",
     "data": {
       // actual job data here
     }
   }
   ```

2. **job_category Structure in GET Response**:
   ```json
   "job_category": {
     "category_uid": "285e6d01-1449-4f38-8cd6-091738e15e0f",
     "category_name": "Installation",
     "category_color": "#7C3AED",
     "estimated_duration": {...},
     "job_timelog": {...},
     "is_deleted": false
   }
   ```

3. **Consistent 400 Error**: Every POST attempt returns the same error regardless of payload structure.

## Possible Issues

1. **Different API Version**: The curl shows `x-zuper-client-version: 3.0` but POST might require different version
2. **Missing Required Header**: There might be a specific header required for POST requests
3. **Different Endpoint**: Job creation might use a different endpoint (not `/api/jobs`)
4. **Authentication Issue**: Token might not have create permissions
5. **API Validation Logic**: The API might be checking for fields in a very specific way

## Recommended Next Steps

### Option 1: Use Browser Network Tab (RECOMMENDED)
The best way to find the correct format is to:

1. Open Zuper in your browser
2. Open DevTools → Network tab
3. Create a job manually through the UI
4. Find the POST request in the Network tab
5. Copy the exact:
   - Request URL
   - Request headers
   - Request payload

This will show the EXACT format the API expects.

### Option 2: Check API Documentation
If available, check Zuper's API documentation for the job creation endpoint.

### Option 3: Contact Zuper Support
Ask for:
- API documentation for job creation
- Example POST payload for creating a job
- List of required fields and their format

## Current Code Status

The bulk job creation scripts are ready and will work once we have the correct API format. The code handles:
- ✅ Batch processing
- ✅ Rate limiting
- ✅ Unique job naming (Job 0001, Job 0002, etc.)
- ✅ Error handling
- ✅ Progress tracking
- ✅ Results export

**Only missing**: The correct API payload format for creating jobs.

## Files to Update Once Format is Known

Once you have the correct API format from the browser:

1. Update [`tests/utils/JobCreator.js`](tests/utils/JobCreator.js):
   - Modify `makeJobDataUnique()` method to format the payload correctly
   - Update `createJob()` method if needed

2. Test with:
   ```bash
   node tests/examples/simple-job-creation.js
   ```

3. Run full bulk creation:
   ```bash
   npm run create-jobs
   ```

## How to Capture the Correct Format

### Step-by-Step Instructions:

1. **Open Browser**:
   - Navigate to https://stagingv3.zuperpro.com
   - Log in with your credentials

2. **Open DevTools**:
   - Press F12 or right-click → Inspect
   - Go to "Network" tab
   - Click the filter icon and select "Fetch/XHR"

3. **Create a Job**:
   - In the Zuper UI, click "New Job" or similar
   - Fill in ONLY the required fields:
     - Title: "Test Job"
     - Category: "Installation"
     - Any other required fields
   - Click Save/Create

4. **Find the Request**:
   - In the Network tab, look for a POST request to `/api/jobs` or similar
   - Click on it

5. **Copy the Data**:
   - Click on "Payload" or "Request" tab
   - Copy the entire JSON payload
   - Save it to a file: `correct-job-payload.json`

6. **Copy Headers**:
   - Click on "Headers" tab
   - Note any special headers besides the ones we already have

7. **Share the Format**:
   - Paste the payload here or send it to me
   - I'll update the scripts immediately

## Example of What to Look For

In the Network tab, you should see something like:

```
POST https://stagingv2.zuperpro.com/api/jobs
```

With a payload that might look like:
```json
{
  "job": {
    "title": "Test Job",
    "category_id": "...",
    "customer_id": "...",
    ...
  }
}
```

Or perhaps:
```json
{
  "title": "Test Job",
  "categoryUid": "...",
  "customerUid": "...",
  ...
}
```

The exact format is what we need!

## Temporary Workaround

If you can't capture the API format but need to create jobs NOW:
1. Use the Playwright automation you already have
2. Or use the UI directly

The bulk API creation will be MUCH faster once we have the correct format.
