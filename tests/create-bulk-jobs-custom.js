import { JobCreator } from './utils/JobCreator.js';

/**
 * Example: Creating bulk jobs with a custom job template
 * This version doesn't fetch a template - it uses a predefined structure
 */

const config = {
  baseUrl: 'https://stagingv2.zuperpro.com',
  apiUrl: 'https://stagingv2.zuperpro.com/api',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHBpcmVzIjoxNzY2MzM0NjAwMjM2LCJjb21wYW55Ijp7ImNvbXBhbnlfdWlkIjoiNWE3MzMyYzgtOWQ5Zi00ZGVkLWFiMzMtNGUyNDllOWE2ZDBmIn0sInVzZXIiOnsiY29tcGFueV9pZCI6MjAwNywiZW1haWwiOiJyYW1hbmF0aGFuLm1AenVwZXIuY28iLCJ1c2VyX2lkIjoyNjIxNCwidXNlcl91aWQiOiJhN2FkZTFhMi04NjA3LTRiMTgtYmQ4Ni00MDBiZjAyYmExNWIiLCJyb2xlIjp7InJvbGVfaWQiOjEsInJvbGVfdWlkIjoiNTA0ZTRlYWMtZmY3ZC0xMWU3LThiZTUtMGVkNWY4OWY3MThiIiwicm9sZV9uYW1lIjoiQWRtaW4iLCJyb2xlX2tleSI6IkFETUlOIiwiY3JlYXRlZF9hdCI6IjIwMTgtMDEtMjJUMDA6MDA6MDAuMDAwWiIsInVwZGF0ZWRfYXQiOiIyMDE4LTAxLTIyVDAwOjAwOjAwLjAwMFoifSwiZmlyc3RfbmFtZSI6IlJhbSIsImxhc3RfbmFtZSI6Ik1hZHkiLCJidXNpbmVzc191bml0cyI6W119LCJzZXNzaW9uIjp7InVzZXJfc2Vzc2lvbl91aWQiOiJhNWI4ZjU0NC01MWUzLTRjODAtYmVhOC0yOTU4YmU4NDQyMGYiLCJ1c2VyX3Nlc3Npb25faWQiOjg0NzQzfSwiaWF0IjoxNzYzNzA2NDEwfQ.ES1Ch6XimNAn0NbzT-Mr4mf8riKJeJFZgQEAq2pmUCI',
  companyUid: '5a7332c8-9d9f-4ded-ab33-4e249e9a6d0f'
};

/**
 * Custom job template
 * Customize this object according to your job structure
 */
const customJobTemplate = {
  title: "Bulk Created Job",
  description: "This job was created using the bulk job creator script",
  status: "DRAFT",
  priority: "MEDIUM",
  company_uid: config.companyUid,
  // Add more fields as needed based on your job structure
  // You can get this structure by fetching an existing job first
};

const jobCreationSettings = {
  totalJobs: 1000,
  batchSize: 10,
  delayBetweenBatches: 1000,
  jobTitlePrefix: 'Job',
  jobCategory: 'Installation'
};

async function main() {
  try {
    console.log('🔧 Initializing Job Creator with custom template...\n');

    const jobCreator = new JobCreator(config);
    jobCreator.validateConfig();

    console.log('✓ Configuration validated\n');
    console.log('📝 Using custom job template:\n');
    console.log(JSON.stringify(customJobTemplate, null, 2));
    console.log('\n');

    // Create jobs using the custom template
    const results = await jobCreator.createMultipleJobs(
      customJobTemplate,
      jobCreationSettings.totalJobs,
      jobCreationSettings.batchSize,
      jobCreationSettings.delayBetweenBatches,
      {
        jobTitlePrefix: jobCreationSettings.jobTitlePrefix,
        jobCategory: jobCreationSettings.jobCategory
      }
    );

    // Save results
    const resultsFile = `job-creation-results-custom-${Date.now()}.json`;
    const fs = await import('fs');
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${resultsFile}`);

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

main();
