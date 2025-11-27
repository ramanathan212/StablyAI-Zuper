# How to Capture the Correct API Format

## Quick Steps

### 1. Open Browser DevTools
1. Go to https://stagingv3.zuperpro.com
2. Press **F12** (or right-click → Inspect)
3. Click on **Network** tab
4. Click the **Filter** icon and check **Fetch/XHR**
5. **Keep DevTools open!**

### 2. Create a Job Manually
1. In the Zuper UI, click "**New Job**" or "**Create Job**"
2. Fill in **ONLY** the minimum required fields:
   - **Title**: Type "Test API Job"
   - **Category**: Select "Installation"
   - **Customer**: Select any customer
   - Fill any other required fields (marked with *)
3. Click **Save** or **Create**

### 3. Find the API Request
1. In the Network tab, you should see a **RED** line (if it worked) or find a **POST** request
2. Look for a request to `/api/jobs` or similar
3. **Click on that request**

### 4. Copy the Payload
1. In the request details, click the **"Payload"** or **"Request"** tab
2. You should see the JSON data that was sent
3. **Select all the JSON and copy it**

### 5. Save It
Create a file: `correct-job-payload.json`

Paste the JSON you copied.

### 6. Share It
Send me that JSON and I'll update the script immediately!

## What the Payload Should Look Like

It might look something like this (example):

```json
{
  "title": "Test API Job",
  "job_category_uid": "285e6d01-1449-4f38-8cd6-091738e15e0f",
  "customer_uid": "0711961e-954f-4e41-9f42-b769965e40b5",
  "scheduled_start_time": "2025-11-21T10:00:00.000Z",
  "scheduled_end_time": "2025-11-23T10:00:00.000Z"
}
```

Or it might have different fields. That's what we need to find out!

## Troubleshooting

### Can't find the Network tab?
- Press F12 or Cmd+Option+I (Mac)
- Make sure you're in the "Network" section
- Refresh the page if needed

### Don't see any requests?
- Make sure Network tab is open BEFORE creating the job
- Try creating the job again
- Look for requests with "jobs" in the name

### Request shows as failed?
- That's actually helpful! We can still see what was sent
- Copy the payload anyway

### Not sure which request is the right one?
- Look for POST requests (not GET)
- Look for URLs containing "/api/jobs"
- Look for requests with "jobs" or "create" in the name
- The payload should contain the job title you entered

## Alternative: Use cURL Export

If you can find the request in Network tab:

1. **Right-click** on the POST request
2. Click "**Copy**" → "**Copy as cURL**"
3. Paste it into a file: `create-job-curl.txt`
4. Send me that file

I can extract the payload from the cURL command!

## Why We Need This

The Zuper API is very particular about the format. We've tried:
- ❌ Sending the full job object from GET (too much data)
- ❌ Sending minimal fields (missing something)
- ❌ Different field names and structures

The ONLY way to know for sure is to see what the actual UI sends when it creates a job successfully.

Once we have this, your bulk creation will work perfectly! 🚀
