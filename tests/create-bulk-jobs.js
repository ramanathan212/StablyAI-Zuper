import { JobCreator } from './utils/JobCreator.js';

/**
 * Configuration for bulk job creation
 * Update these values before running the script
 */
const config = {
  // API Configuration
  baseUrl: 'https://stagingv2.zuperpro.com',
  apiUrl: 'https://stagingv2.zuperpro.com/api',

  // Authentication - UPDATE THIS TOKEN
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHBpcmVzIjoxNzY2MzM0NjAwMjM2LCJjb21wYW55Ijp7ImNvbXBhbnlfdWlkIjoiNWE3MzMyYzgtOWQ5Zi00ZGVkLWFiMzMtNGUyNDllOWE2ZDBmIn0sInVzZXIiOnsiY29tcGFueV9pZCI6MjAwNywiZW1haWwiOiJyYW1hbmF0aGFuLm1AenVwZXIuY28iLCJ1c2VyX2lkIjoyNjIxNCwidXNlcl91aWQiOiJhN2FkZTFhMi04NjA3LTRiMTgtYmQ4Ni00MDBiZjAyYmExNWIiLCJyb2xlIjp7InJvbGVfaWQiOjEsInJvbGVfdWlkIjoiNTA0ZTRlYWMtZmY3ZC0xMWU3LThiZTUtMGVkNWY4OWY3MThiIiwicm9sZV9uYW1lIjoiQWRtaW4iLCJyb2xlX2tleSI6IkFETUlOIiwiY3JlYXRlZF9hdCI6IjIwMTgtMDEtMjJUMDA6MDA6MDAuMDAwWiIsInVwZGF0ZWRfYXQiOiIyMDE4LTAxLTIyVDAwOjAwOjAwLjAwMFoifSwiZmlyc3RfbmFtZSI6IlJhbSIsImxhc3RfbmFtZSI6Ik1hZHkiLCJidXNpbmVzc191bml0cyI6W119LCJzZXNzaW9uIjp7InVzZXJfc2Vzc2lvbl91aWQiOiJhNWI4ZjU0NC01MWUzLTRjODAtYmVhOC0yOTU4YmU4NDQyMGYiLCJ1c2VyX3Nlc3Npb25faWQiOjg0NzQzfSwiaWF0IjoxNzYzNzA2NDEwfQ.ES1Ch6XimNAn0NbzT-Mr4mf8riKJeJFZgQEAq2pmUCI',

  // Company UID
  companyUid: '5a7332c8-9d9f-4ded-ab33-4e249e9a6d0f',

  // Template Job UID (existing job to copy from)
  templateJobUid: 'b34e2318-0a95-41cc-95b9-54fdbae0bbce'
};

/**
 * Job creation settings
 */
const jobCreationSettings = {
  totalJobs: 30,        // Total number of jobs to create
  batchSize: 10,          // Number of jobs to create in parallel
  delayBetweenBatches: 1000,  // Delay in milliseconds between batches (1 second)

  // Job naming configuration
  jobTitlePrefix: 'Job',  // Title will be "Job 0001", "Job 0002", etc.
  jobCategory: 'Installation',  // Required: Job category (e.g., "Installation", "Repair", "Maintenance")

  // Assignment configuration
  assignToUserUid: 'a7ade1a2-8607-4b18-bd86-400bf02ba15b'  // User UID to assign all jobs to
};

/**
 * Main function to create bulk jobs
 */
async function main() {
  try {
    console.log('🔧 Initializing Job Creator...\n');

    // Initialize JobCreator
    const jobCreator = new JobCreator(config);

    // Validate configuration
    jobCreator.validateConfig();
    console.log('✓ Configuration validated\n');

    // Fetch template job
    console.log(`📥 Fetching template job: ${config.templateJobUid}\n`);
    const templateJob = await jobCreator.getJobTemplate(config.templateJobUid);
    console.log('✓ Template job fetched successfully\n');
    console.log(`Template Job Info:`);
    console.log(`  - Title: ${templateJob.title || 'N/A'}`);
    console.log(`  - Job Number: ${templateJob.job_number || 'N/A'}`);
    console.log(`  - Status: ${templateJob.status || 'N/A'}\n`);

    // Create multiple jobs
    const results = await jobCreator.createMultipleJobs(
      templateJob,
      jobCreationSettings.totalJobs,
      jobCreationSettings.batchSize,
      jobCreationSettings.delayBetweenBatches,
      {
        jobTitlePrefix: jobCreationSettings.jobTitlePrefix,
        jobCategory: jobCreationSettings.jobCategory,
        assignToUserUid: jobCreationSettings.assignToUserUid
      }
    );

    // Save results to file
    const resultsFile = `job-creation-results-${Date.now()}.json`;
    const fs = await import('fs');
    fs.writeFileSync(
      resultsFile,
      JSON.stringify(results, null, 2)
    );
    console.log(`\n💾 Results saved to: ${resultsFile}`);

    // Exit with appropriate code
    if (results.failed.length > 0) {
      console.log('\n⚠️  Some jobs failed to create. Check the results file for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 All jobs created successfully!');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
