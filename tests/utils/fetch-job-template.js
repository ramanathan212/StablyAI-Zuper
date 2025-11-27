import { JobCreator } from './JobCreator.js';
import fs from 'fs';

/**
 * Utility script to fetch and save a job template
 * This helps you understand the job structure before creating bulk jobs
 */

const config = {
  baseUrl: 'https://stagingv2.zuperpro.com',
  apiUrl: 'https://stagingv2.zuperpro.com/api',

  // UPDATE THESE
  token: 'YOUR_TOKEN_HERE',
  templateJobUid: 'YOUR_JOB_UID_HERE'
};

async function fetchAndSaveTemplate() {
  try {
    console.log('🔍 Fetching job template...\n');

    const jobCreator = new JobCreator(config);
    const template = await jobCreator.getJobTemplate(config.templateJobUid);

    console.log('✓ Template fetched successfully!\n');
    console.log('Job Details:');
    console.log('─'.repeat(50));
    console.log(`Title: ${template.title || 'N/A'}`);
    console.log(`Job Number: ${template.job_number || 'N/A'}`);
    console.log(`Status: ${template.status || 'N/A'}`);
    console.log(`Priority: ${template.priority || 'N/A'}`);
    console.log('─'.repeat(50));

    // Save to file
    const filename = `job-template-${config.templateJobUid}-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(template, null, 2));

    console.log(`\n💾 Template saved to: ${filename}`);
    console.log('\nYou can now use this template structure in your bulk creation scripts!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fetchAndSaveTemplate();
