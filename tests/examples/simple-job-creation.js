import { JobCreator } from '../utils/JobCreator.js';

/**
 * Simple example: Creating 10 jobs quickly
 * Perfect for testing before running the full 1000 job creation
 */

async function createTestJobs() {
  const config = {
    baseUrl: 'https://stagingv2.zuperpro.com',
    apiUrl: 'https://stagingv2.zuperpro.com/api',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHBpcmVzIjoxNzY2MzM0NjAwMjM2LCJjb21wYW55Ijp7ImNvbXBhbnlfdWlkIjoiNWE3MzMyYzgtOWQ5Zi00ZGVkLWFiMzMtNGUyNDllOWE2ZDBmIn0sInVzZXIiOnsiY29tcGFueV9pZCI6MjAwNywiZW1haWwiOiJyYW1hbmF0aGFuLm1AenVwZXIuY28iLCJ1c2VyX2lkIjoyNjIxNCwidXNlcl91aWQiOiJhN2FkZTFhMi04NjA3LTRiMTgtYmQ4Ni00MDBiZjAyYmExNWIiLCJyb2xlIjp7InJvbGVfaWQiOjEsInJvbGVfdWlkIjoiNTA0ZTRlYWMtZmY3ZC0xMWU3LThiZTUtMGVkNWY4OWY3MThiIiwicm9sZV9uYW1lIjoiQWRtaW4iLCJyb2xlX2tleSI6IkFETUlOIiwiY3JlYXRlZF9hdCI6IjIwMTgtMDEtMjJUMDA6MDA6MDAuMDAwWiIsInVwZGF0ZWRfYXQiOiIyMDE4LTAxLTIyVDAwOjAwOjAwLjAwMFoifSwiZmlyc3RfbmFtZSI6IlJhbSIsImxhc3RfbmFtZSI6Ik1hZHkiLCJidXNpbmVzc191bml0cyI6W119LCJzZXNzaW9uIjp7InVzZXJfc2Vzc2lvbl91aWQiOiJhNWI4ZjU0NC01MWUzLTRjODAtYmVhOC0yOTU4YmU4NDQyMGYiLCJ1c2VyX3Nlc3Npb25faWQiOjg0NzQzfSwiaWF0IjoxNzYzNzA2NDEwfQ.ES1Ch6XimNAn0NbzT-Mr4mf8riKJeJFZgQEAq2pmUCI',
    templateJobUid: '6078d15d-2cda-42a5-bdbf-7f53e940f461'
  };

  const jobCreator = new JobCreator(config);

  console.log('Creating 10 test jobs...\n');

  try {
    // Fetch template
    const template = await jobCreator.getJobTemplate(config.templateJobUid);
    console.log(`Using template: ${template.title}\n`);

    // Create 10 jobs (small test run)
    const results = await jobCreator.createMultipleJobs(
      template,
      10,    // Only 10 jobs
      5,     // 5 at a time
      500,   // 0.5 second delay
      {
        jobTitlePrefix: 'Job',
        jobCategory: 'Installation'
      }
    );

    console.log('\n✅ Test completed!');
    console.log(`Success: ${results.successful.length}`);
    console.log(`Failed: ${results.failed.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTestJobs();
