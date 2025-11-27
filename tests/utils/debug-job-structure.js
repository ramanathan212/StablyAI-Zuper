import { JobCreator } from './JobCreator.js';

/**
 * Debug script to examine job structure and test single job creation
 */

const config = {
  baseUrl: 'https://stagingv2.zuperpro.com',
  apiUrl: 'https://stagingv2.zuperpro.com/api',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHBpcmVzIjoxNzY2MzM0NjAwMjM2LCJjb21wYW55Ijp7ImNvbXBhbnlfdWlkIjoiNWE3MzMyYzgtOWQ5Zi00ZGVkLWFiMzMtNGUyNDllOWE2ZDBmIn0sInVzZXIiOnsiY29tcGFueV9pZCI6MjAwNywiZW1haWwiOiJyYW1hbmF0aGFuLm1AenVwZXIuY28iLCJ1c2VyX2lkIjoyNjIxNCwidXNlcl91aWQiOiJhN2FkZTFhMi04NjA3LTRiMTgtYmQ4Ni00MDBiZjAyYmExNWIiLCJyb2xlIjp7InJvbGVfaWQiOjEsInJvbGVfdWlkIjoiNTA0ZTRlYWMtZmY3ZC0xMWU3LThiZTUtMGVkNWY4OWY3MThiIiwicm9sZV9uYW1lIjoiQWRtaW4iLCJyb2xlX2tleSI6IkFETUlOIiwiY3JlYXRlZF9hdCI6IjIwMTgtMDEtMjJUMDA6MDA6MDAuMDAwWiIsInVwZGF0ZWRfYXQiOiIyMDE4LTAxLTIyVDAwOjAwOjAwLjAwMFoifSwiZmlyc3RfbmFtZSI6IlJhbSIsImxhc3RfbmFtZSI6Ik1hZHkiLCJidXNpbmVzc191bml0cyI6W119LCJzZXNzaW9uIjp7InVzZXJfc2Vzc2lvbl91aWQiOiJhNWI4ZjU0NC01MWUzLTRjODAtYmVhOC0yOTU4YmU4NDQyMGYiLCJ1c2VyX3Nlc3Npb25faWQiOjg0NzQzfSwiaWF0IjoxNzYzNzA2NDEwfQ.ES1Ch6XimNAn0NbzT-Mr4mf8riKJeJFZgQEAq2pmUCI',
  templateJobUid: '6078d15d-2cda-42a5-bdbf-7f53e940f461'
};

async function debugJobStructure() {
  try {
    console.log('🔍 Fetching template job to examine structure...\n');

    const jobCreator = new JobCreator(config);
    const template = await jobCreator.getJobTemplate(config.templateJobUid);

    console.log('✓ Template fetched successfully\n');
    console.log('=' .repeat(80));
    console.log('FULL JOB STRUCTURE:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(template, null, 2));
    console.log('='.repeat(80));

    console.log('\n📊 Key Fields:');
    console.log('─'.repeat(80));
    console.log(`Title field: ${template.title ? '✓ EXISTS' : '✗ MISSING'} - Value: "${template.title}"`);
    console.log(`job_category field: ${template.job_category ? '✓ EXISTS' : '✗ MISSING'} - Value: "${template.job_category}"`);
    console.log(`jobCategory field: ${template.jobCategory ? '✓ EXISTS' : '✗ MISSING'} - Value: "${template.jobCategory}"`);
    console.log('─'.repeat(80));

    console.log('\n📝 Top-level fields:');
    Object.keys(template).forEach(key => {
      const value = template[key];
      const type = Array.isArray(value) ? 'array' : typeof value;
      console.log(`  - ${key}: ${type}`);
    });

    // Check if there's a nested job object
    if (template.job) {
      console.log('\n🔍 Found nested "job" object:');
      console.log(JSON.stringify(template.job, null, 2));
    }

    console.log('\n\n🧪 Testing single job creation...\n');

    try {
      const result = await jobCreator.createJob(template, 1, {
        jobTitlePrefix: 'Job',
        jobCategory: 'Installation'
      });
      console.log('✅ SUCCESS! Job created:', result.job_uid);
    } catch (error) {
      console.log('❌ FAILED:', error.message);

      // Try to create with minimal fields using category_uid
      console.log('\n🔄 Trying with category_uid...');
      const withCategoryUid = {
        title: 'Test Job 0001',
        job_category_uid: '285e6d01-1449-4f38-8cd6-091738e15e0f', // From template
        company_uid: config.companyUid || '5a7332c8-9d9f-4ded-ab33-4e249e9a6d0f'
      };

      console.log('Payload with category_uid:', JSON.stringify(withCategoryUid, null, 2));

      try {
        const categoryUidResult = await fetch(`${config.apiUrl}/jobs`, {
          method: 'POST',
          headers: jobCreator.headers,
          body: JSON.stringify(withCategoryUid)
        });

        if (categoryUidResult.ok) {
          const data = await categoryUidResult.json();
          console.log('✅ Job with category_uid created!', data.job_uid || data);
        } else {
          const errorText = await categoryUidResult.text();
          console.log('❌ category_uid job failed:', errorText);
        }
      } catch (catError) {
        console.log('❌ category_uid error:', catError.message);
      }

      // Try with minimal string value
      console.log('\n🔄 Trying with minimal fields...');
      const minimal = {
        title: 'Test Job 0001',
        job_category: 'Installation',
        company_uid: config.companyUid || '5a7332c8-9d9f-4ded-ab33-4e249e9a6d0f'
      };

      console.log('Minimal payload:', JSON.stringify(minimal, null, 2));

      try {
        const minimalResult = await fetch(`${config.apiUrl}/jobs`, {
          method: 'POST',
          headers: jobCreator.headers,
          body: JSON.stringify(minimal)
        });

        if (minimalResult.ok) {
          const data = await minimalResult.json();
          console.log('✅ Minimal job created!', data.job_uid);
        } else {
          const errorText = await minimalResult.text();
          console.log('❌ Minimal job failed:', errorText);
        }
      } catch (minError) {
        console.log('❌ Minimal job error:', minError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

debugJobStructure();
