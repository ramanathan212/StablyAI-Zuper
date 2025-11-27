# Job Format Reference

## Fixed: Job Title and Category Requirements

The bulk job creation now ensures all required fields are properly set.

## Job Naming Format

Jobs will be created with the following format:

```
Job 0001
Job 0002
Job 0003
...
Job 0999
Job 1000
```

### Configurable Options

In `create-bulk-jobs.js`, you can configure:

```javascript
const jobCreationSettings = {
  totalJobs: 1000,
  batchSize: 10,
  delayBetweenBatches: 1000,

  // Customize these:
  jobTitlePrefix: 'Job',        // Change to any prefix you want
  jobCategory: 'Installation'    // Required: Installation, Repair, Maintenance, etc.
};
```

## Examples

### Default Configuration
```javascript
jobTitlePrefix: 'Job'
jobCategory: 'Installation'
```
**Output:**
- Job 0001 (Category: Installation)
- Job 0002 (Category: Installation)
- Job 0003 (Category: Installation)

### Custom Prefix
```javascript
jobTitlePrefix: 'Service Call'
jobCategory: 'Repair'
```
**Output:**
- Service Call 0001 (Category: Repair)
- Service Call 0002 (Category: Repair)
- Service Call 0003 (Category: Repair)

### Project Jobs
```javascript
jobTitlePrefix: 'Project'
jobCategory: 'Maintenance'
```
**Output:**
- Project 0001 (Category: Maintenance)
- Project 0002 (Category: Maintenance)
- Project 0003 (Category: Maintenance)

## Required Fields

The script ensures these REQUIRED fields are always set:

1. **title** - Format: `{prefix} {####}` (e.g., "Job 0001")
2. **job_category** - Must be a valid category (default: "Installation")

## Job Number Padding

Numbers are automatically padded with leading zeros:
- 1 → 0001
- 10 → 0010
- 100 → 0100
- 1000 → 1000

This ensures proper sorting in the UI.

## Other Unique Fields

In addition to title and category, the script also modifies:

- **job_number**: `JOB-{timestamp}-{index}`
- **reference_number**: `REF-{timestamp}-{index}`
- **job_uid**: Removed (server generates)
- **uid**: Removed (server generates)
- **id**: Removed (server generates)

## Console Output

When running the script, you'll see:

```
🚀 Starting bulk job creation: 1000 jobs in batches of 10
⏱️  Delay between batches: 1000ms
📝 Job title format: "Job ####"
📂 Job category: "Installation"

📦 Batch 1/100 (Jobs 1-10)
✓ Job 1 created successfully: Job 0001
✓ Job 2 created successfully: Job 0002
...
```

## Validation

The script validates:
- ✅ Title is always set (never empty)
- ✅ Job category is always set (default: "Installation")
- ✅ All jobs have unique titles with proper numbering

## Error Handling

If the API returns a 400 error about missing title or category, the script now ensures these are ALWAYS set before making the request.

Previous error (now fixed):
```
Error creating job 119: Failed to create job 119: 400 Bad Request -
{"message":"Job Title / Job Category Missing","title":"Missing Job Title / Job Category","type":"error"}
```

This error should no longer occur as both fields are guaranteed to be set.
