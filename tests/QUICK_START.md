# Quick Start Guide - Bulk Job Creation

## 🚀 In 5 Minutes

### Step 1: Update Configuration (2 minutes)

Open [create-bulk-jobs.js](create-bulk-jobs.js) and update these values:

```javascript
const config = {
  // ... other settings ...
  token: 'YOUR_TOKEN_HERE',           // ← Update this
  templateJobUid: 'YOUR_JOB_UID_HERE' // ← Update this
};

const jobCreationSettings = {
  totalJobs: 1000,
  batchSize: 10,
  delayBetweenBatches: 1000,

  // Jobs will be named: "Job 0001", "Job 0002", etc.
  jobTitlePrefix: 'Job',        // ← Customize if needed
  jobCategory: 'Installation'    // ← Must be a valid category
};
```

**Where to get these:**
- **Token**: Open browser DevTools → Network tab → Copy from any API request's Authorization header
- **Job UID**: Copy from the URL of any existing job (last part of the URL)

**Job Naming:**
- Jobs are automatically named with 4-digit padding: `Job 0001`, `Job 0002`, ... `Job 1000`
- Change `jobTitlePrefix` to customize (e.g., "Service Call", "Project", "Task")
- `jobCategory` is required (e.g., "Installation", "Repair", "Maintenance")

### Step 2: Run the Script (1 minute)

```bash
npm run create-jobs
```

That's it! The script will create 1000 jobs.

---

## 🧪 Test First (Recommended)

Before creating 1000 jobs, test with 10:

### Option 1: Use the Test Script
```bash
node tests/examples/simple-job-creation.js
```

### Option 2: Modify Settings Temporarily

In `create-bulk-jobs.js`, change:
```javascript
const jobCreationSettings = {
  totalJobs: 10,  // Changed from 1000
  batchSize: 5,
  delayBetweenBatches: 500
};
```

Run: `npm run create-jobs`

Change it back to 1000 when ready.

---

## 📋 Available Commands

```bash
# Create 1000 jobs from template
npm run create-jobs

# Create jobs with custom template
npm run create-jobs-custom

# Fetch and save a job template
npm run fetch-template
```

---

## ⚙️ Adjust Performance

In `create-bulk-jobs.js`:

```javascript
const jobCreationSettings = {
  totalJobs: 1000,           // How many jobs to create
  batchSize: 10,             // Jobs created simultaneously
  delayBetweenBatches: 1000  // Wait time in milliseconds
};
```

**If you see rate limit errors (429):**
- Decrease `batchSize` (try 5)
- Increase `delayBetweenBatches` (try 2000)

**To go faster (if allowed):**
- Increase `batchSize` (try 20)
- Decrease `delayBetweenBatches` (try 500)

---

## 📊 What You'll See

```
🔧 Initializing Job Creator...
✓ Configuration validated

📥 Fetching template job: 6078d15d...
✓ Template job fetched successfully

🚀 Starting bulk job creation: 1000 jobs in batches of 10

📦 Batch 1/100 (Jobs 1-10)
✓ Job 1 created successfully: abc123...
✓ Job 2 created successfully: def456...
   ✓ Success: 10/10
   ✗ Failed: 0/10

[... continues ...]

==================================================
📊 SUMMARY
==================================================
Total Jobs Requested: 1000
✓ Successful: 1000
✗ Failed: 0
⏱️  Duration: 125.30 seconds
⚡ Average: 7.98 jobs/second
==================================================

💾 Results saved to: job-creation-results-1234567890.json
🎉 All jobs created successfully!
```

---

## 🔧 Advanced Usage

### Use Your Own Job Structure

Edit [create-bulk-jobs-custom.js](create-bulk-jobs-custom.js):

```javascript
const customJobTemplate = {
  title: "My Custom Job",
  description: "Created via script",
  status: "DRAFT",
  priority: "HIGH",
  // Add your custom fields here
};
```

Run: `npm run create-jobs-custom`

### Get Job Structure First

```bash
npm run fetch-template
```

This saves the full job structure to a JSON file that you can inspect.

---

## ❓ Troubleshooting

| Error | Solution |
|-------|----------|
| `401 Unauthorized` | Token expired - get a new one |
| `404 Not Found` | Wrong job UID - verify the template job exists |
| `429 Too Many Requests` | Increase `delayBetweenBatches` or decrease `batchSize` |
| `fetch failed` | Check internet connection |

---

## 📖 Full Documentation

For detailed information, see [BULK_JOB_CREATION_GUIDE.md](../BULK_JOB_CREATION_GUIDE.md)

---

## ⏱️ Time Estimates

| Jobs | Estimated Time |
|------|---------------|
| 10 (test) | 5-10 seconds |
| 100 | 15-20 seconds |
| 500 | 60-80 seconds |
| 1000 | 120-150 seconds |

---

## 🎯 Pro Tips

1. **Always test with 10 jobs first** before running 1000
2. **Keep your token secure** - never commit it to git
3. **Check the results JSON file** to see which jobs failed
4. **Run during off-peak hours** if creating many jobs
5. **Monitor the console** for any errors during execution

---

## 📁 Project Structure

```
tests/
├── create-bulk-jobs.js          # Main script (1000 jobs)
├── create-bulk-jobs-custom.js   # Custom template version
├── utils/
│   ├── JobCreator.js            # Core class
│   ├── fetch-job-template.js    # Template fetcher
│   └── README.md                # Utils documentation
└── examples/
    └── simple-job-creation.js   # Simple 10-job example
```

---

## 🆘 Need Help?

1. Read the error message carefully
2. Check the configuration values
3. Verify your token is valid
4. Try with fewer jobs first (10-20)
5. Review the generated results JSON file

---

Happy job creating! 🎉
