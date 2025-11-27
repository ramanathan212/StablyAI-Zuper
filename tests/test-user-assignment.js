import { JobCreator } from './utils/JobCreator.js';

/**
 * Test script to create a single job with user assignment
 */

async function testUserAssignment() {
  const config = {
    baseUrl: 'https://stagingv2.zuperpro.com',
    apiUrl: 'https://stagingv2.zuperpro.com/api',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHBpcmVzIjoxNzY2MzM0NjAwMjM2LCJjb21wYW55Ijp7ImNvbXBhbnlfdWlkIjoiNWE3MzMyYzgtOWQ5Zi00ZGVkLWFiMzMtNGUyNDllOWE2ZDBmIn0sInVzZXIiOnsiY29tcGFueV9pZCI6MjAwNywiZW1haWwiOiJyYW1hbmF0aGFuLm1AenVwZXIuY28iLCJ1c2VyX2lkIjoyNjIxNCwidXNlcl91aWQiOiJhN2FkZTFhMi04NjA3LTRiMTgtYmQ4Ni00MDBiZjAyYmExNWIiLCJyb2xlIjp7InJvbGVfaWQiOjEsInJvbGVfdWlkIjoiNTA0ZTRlYWMtZmY3ZC0xMWU3LThiZTUtMGVkNWY4OWY3MThiIiwicm9sZV9uYW1lIjoiQWRtaW4iLCJyb2xlX2tleSI6IkFETUlOIiwiY3JlYXRlZF9hdCI6IjIwMTgtMDEtMjJUMDA6MDA6MDAuMDAwWiIsInVwZGF0ZWRfYXQiOiIyMDE4LTAxLTIyVDAwOjAwOjAwLjAwMFoifSwiZmlyc3RfbmFtZSI6IlJhbSIsImxhc3RfbmFtZSI6Ik1hZHkiLCJidXNpbmVzc191bml0cyI6W119LCJzZXNzaW9uIjp7InVzZXJfc2Vzc2lvbl91aWQiOiJhNWI4ZjU0NC01MWUzLTRjODAtYmVhOC0yOTU4YmU4NDQyMGYiLCJ1c2VyX3Nlc3Npb25faWQiOjg0NzQzfSwiaWF0IjoxNzYzNzA2NDEwfQ.ES1Ch6XimNAn0NbzT-Mr4mf8riKJeJFZgQEAq2pmUCI',
    templateJobUid: '6078d15d-2cda-42a5-bdbf-7f53e940f461'
  };

  const jobCreator = new JobCreator(config);

  console.log('Testing job creation with user assignment...\n');

  try {
    // Fetch template
    const template = await jobCreator.getJobTemplate(config.templateJobUid);
    console.log(`✓ Template fetched\n`);

    // Create 1 job with user assignment
    const results = await jobCreator.createMultipleJobs(
      template,
      1,    // Only 1 job for testing
      1,    // 1 at a time
      0,    // No delay
      {
        jobTitlePrefix: 'Test Assignment Job',
        jobCategory: 'Installation',
        assignToUserUid: 'a7ade1a2-8607-4b18-bd86-400bf02ba15b'  // Ram Mady
      }
    );

    if (results.successful.length > 0) {
      const jobUid = results.successful[0].data.job_uid;
      console.log(`\n✅ SUCCESS! Job created with assignment!`);
      console.log(`Job UID: ${jobUid}`);
      console.log(`Assigned to: a7ade1a2-8607-4b18-bd86-400bf02ba15b`);
      console.log(`\nVerify in Zuper UI that the job is assigned to Ram Mady.`);
    } else {
      console.log(`\n❌ Job creation failed`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testUserAssignment();
