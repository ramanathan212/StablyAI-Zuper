/**
 * JobCreator class - Creates jobs via API using the Zuper platform
 * This class handles authentication and job creation through HTTP requests
 */
export class JobCreator {
  constructor(config) {
    this.baseUrl = config.baseUrl || 'https://stagingv2.zuperpro.com';
    this.apiUrl = config.apiUrl || 'https://stagingv2.zuperpro.com/api';
    this.token = config.token;
    this.companyUid = config.companyUid;
    this.headers = {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-GB,en;q=0.8',
      'authorization': `Bearer ${this.token}`,
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      'origin': 'https://stagingv3.zuperpro.com',
      'pragma': 'no-cache',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      'x-zuper-client': 'WEB_APP',
      'x-zuper-client-version': '3.0'
    };
  }

  /**
   * Fetches an existing job to use as a template
   * @param {string} jobUid - The UID of the job to fetch
   * @returns {Promise<Object>} - The job data
   */
  async getJobTemplate(jobUid) {
    try {
      const response = await fetch(`${this.apiUrl}/jobs/${jobUid}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch job template: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();

      // The API returns data wrapped in a response object with type and data fields
      // Extract the actual job data from the data field
      if (responseData.type === 'success' && responseData.data) {
        return responseData.data;
      }

      return responseData;
    } catch (error) {
      console.error('Error fetching job template:', error);
      throw error;
    }
  }

  /**
   * Creates a single job using the provided job data
   * @param {Object} jobData - The job data to create
   * @param {number} index - The index number for the job (for unique naming)
   * @param {Object} options - Optional settings for job creation
   * @returns {Promise<Object>} - The created job response
   */
  async createJob(jobData, index, options = {}) {
    try {
      // Modify job data to make it unique
      const uniqueJobData = this.makeJobDataUnique(jobData, index, options);

      // Debug: Log first job to verify structure
      if (index === 1) {
        console.log('📋 First job payload (for debugging):');
        console.log(`   Title: ${uniqueJobData.title}`);
        console.log(`   Job Category: ${uniqueJobData.job_category}`);
        console.log(`   Sample fields:`, JSON.stringify({
          title: uniqueJobData.title,
          job_category: uniqueJobData.job_category,
          // Show a few more fields to verify structure
          ...Object.keys(uniqueJobData).slice(0, 5).reduce((obj, key) => {
            obj[key] = uniqueJobData[key];
            return obj;
          }, {})
        }, null, 2));
      }

      const response = await fetch(`${this.apiUrl}/jobs`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(uniqueJobData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Log the problematic payload for debugging
        if (index <= 35) {
          console.log(`❌ Job ${index} payload:`, JSON.stringify({
            title: uniqueJobData.title,
            job_category: uniqueJobData.job_category
          }));
        }
        throw new Error(`Failed to create job ${index}: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✓ Job ${index} created successfully: ${data.job_uid || 'ID not available'}`);
      return data;
    } catch (error) {
      console.error(`✗ Error creating job ${index}:`, error.message);
      throw error;
    }
  }

  /**
   * Makes job data unique by modifying title and reference numbers
   * @param {Object} jobData - Original job data
   * @param {number} index - Index for uniqueness
   * @param {Object} options - Optional settings (jobTitlePrefix, jobCategory)
   * @returns {Object} - Modified unique job data
   */
  makeJobDataUnique(jobData, index, options = {}) {
    const templateData = JSON.parse(JSON.stringify(jobData)); // Deep clone

    // Get settings from options or use defaults
    const titlePrefix = options.jobTitlePrefix || 'Job';

    // Format index with leading zeros (e.g., Job 0001, Job 0002, etc.)
    const paddedIndex = String(index).padStart(4, '0');
    const jobTitle = `${titlePrefix} ${paddedIndex}`;

    // Extract the category_uid from the template
    let categoryUid = null;
    if (templateData.job_category && typeof templateData.job_category === 'object' && templateData.job_category.category_uid) {
      categoryUid = templateData.job_category.category_uid;
    }

    // Build the payload in the EXACT format the API expects
    // Based on the curl command, the API expects a wrapper with "job" key
    const payload = {
      job: {
        // Customer information (required)
        customer_uid: templateData.customer?.customer_uid || null,
        customer: templateData.customer || null,
        customer_address: templateData.customer?.customer_address || null,
        customer_billing_address: templateData.customer?.customer_billing_address || templateData.organization?.organization_billing_address || null,

        // Job details (required)
        job_title: jobTitle,  // Note: API uses "job_title" not "title"
        job_category: categoryUid,  // API expects UUID string, not object
        job_description: templateData.job_description || '',
        job_priority: templateData.job_priority || 'LOW',
        job_type: templateData.job_type || 'NEW',
        job_tags: templateData.job_tags || [],

        // Organization
        organization: templateData.organization?.organization_uid || null,

        // Prefix
        prefix: templateData.prefix || 'FE_JOB_NO_',

        // Scheduling
        scheduled_start_time: templateData.scheduled_start_time || null,
        scheduled_end_time: templateData.scheduled_end_time || null,

        // Assignment
        // Assign to specific user if provided in options
        // Only include assignment if we have a valid team_uid from the template
        assigned_to: options.assignToUserUid && templateData.assigned_to_team?.[0]?.team?.team_uid ? [{
          team_uid: templateData.assigned_to_team[0].team.team_uid,
          user_uid: options.assignToUserUid,
          is_primary: true
        }] : [],

        // Products/Line items
        products: templateData.products || templateData.line_items || [],

        // Service tasks
        service_task: templateData.service_task || null,

        // Custom fields
        custom_fields: templateData.custom_fields || []
      }
    };

    return payload;
  }

  /**
   * Creates multiple jobs in batches
   * @param {Object} templateJobData - Template job data to use
   * @param {number} count - Number of jobs to create
   * @param {number} batchSize - Number of jobs to create in parallel
   * @param {number} delayBetweenBatches - Delay in ms between batches
   * @param {Object} options - Optional settings (jobTitlePrefix, jobCategory)
   * @returns {Promise<Object>} - Summary of created jobs
   */
  async createMultipleJobs(templateJobData, count = 1000, batchSize = 10, delayBetweenBatches = 1000, options = {}) {
    console.log(`\n🚀 Starting bulk job creation: ${count} jobs in batches of ${batchSize}`);
    console.log(`⏱️  Delay between batches: ${delayBetweenBatches}ms`);
    console.log(`📝 Job title format: "${options.jobTitlePrefix || 'Job'} ####"`);
    console.log(`📂 Job category: "${options.jobCategory || 'Installation'}"`);
    console.log(`👤 Assigned to: ${options.assignToUserUid || 'None (Unassigned)'}\n`);

    const results = {
      total: count,
      successful: [],
      failed: [],
      startTime: new Date(),
      endTime: null
    };

    for (let i = 0; i < count; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(count / batchSize);
      const currentBatchSize = Math.min(batchSize, count - i);

      console.log(`\n📦 Batch ${batchNumber}/${totalBatches} (Jobs ${i + 1}-${i + currentBatchSize})`);

      // Create batch of promises
      const batchPromises = [];
      for (let j = 0; j < currentBatchSize; j++) {
        const jobIndex = i + j + 1;
        batchPromises.push(
          this.createJob(templateJobData, jobIndex, options)
            .then(response => ({ success: true, index: jobIndex, data: response }))
            .catch(error => ({ success: false, index: jobIndex, error: error.message }))
        );
      }

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);

      // Process results
      batchResults.forEach(result => {
        if (result.success) {
          results.successful.push(result);
        } else {
          results.failed.push(result);
        }
      });

      console.log(`   ✓ Success: ${batchResults.filter(r => r.success).length}/${currentBatchSize}`);
      console.log(`   ✗ Failed: ${batchResults.filter(r => !r.success).length}/${currentBatchSize}`);

      // Delay before next batch (except for last batch)
      if (i + batchSize < count) {
        await this.delay(delayBetweenBatches);
      }
    }

    results.endTime = new Date();
    const duration = (results.endTime - results.startTime) / 1000;

    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Jobs Requested: ${results.total}`);
    console.log(`✓ Successful: ${results.successful.length}`);
    console.log(`✗ Failed: ${results.failed.length}`);
    console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
    console.log(`⚡ Average: ${(results.total / duration).toFixed(2)} jobs/second`);
    console.log('='.repeat(50));

    return results;
  }

  /**
   * Helper function to add delay
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validates the configuration
   * @returns {boolean} - True if config is valid
   */
  validateConfig() {
    if (!this.token) {
      throw new Error('Authorization token is required');
    }
    if (!this.baseUrl) {
      throw new Error('Base URL is required');
    }
    return true;
  }
}
