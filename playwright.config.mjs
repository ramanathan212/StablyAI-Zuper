import { defineConfig, devices, stablyReporter } from '@stablyai/playwright-test';

// Environment configuration
const ENV = process.env.TEST_ENV || 'uat'; // default to uat
const BASE_URLS = {
  development: 'https://developmentv3.zuperpro.com/v2',
  staging: 'https://staging.zuperpro.com',
  uat: 'https://uat.zuperpro.com'
};

export default defineConfig({
  testDir: './tests',
  timeout: 180000, // Increased to 3 minutes for slow-loading pages
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html'],
    ['list'],
    ...(process.env.STABLY_API_KEY
      ? [stablyReporter({
          apiKey: process.env.STABLY_API_KEY,
          projectId: process.env.STABLY_PROJECT_ID,
        })]
      : []),
  ],
  // globalSetup: './tests/global-setup.js', // Disabled - use test-level auth
  use: {
    baseURL: BASE_URLS[ENV],
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 60000, // Increased to 60 seconds for slow page loads
    // storageState: 'tests/.auth/user.json', // Disabled - test handles its own login

    // Cache and state management options
    launchOptions: {
      // Start with a clean browser profile each time
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-cache',
        '--disable-application-cache',
        '--disable-offline-load-stale-cache',
        '--disk-cache-size=0'
      ]
    },

    // Clear browser context state between tests
    contextOptions: {
      // Disable service workers that might cache data
      serviceWorkers: 'block'
    }
  },

  projects: [
    {
      name: 'mcp-isolated',
      grep: /(Quick Create Deployment Check - March 4 Create new job with quick create organization, contact, and property)$/i,
      testMatch: ['navigate-to-quotes.spec.js', 'quick-create-deployment-check.spec.js'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined, // Don't use stored auth - test handles its own login
      },
    },
    {
      name: 'chromium-default',
      grep: /(Complete Vendor, MR, and PO Flow should complete full vendor, material request, and purchase order workflow|Asset Management Create new asset with organization and contact|Customer Management Create new customer with complete details|Complete Job, MR, PO, and Quote Workflow should create job, request materials, process PO, and create quote|Job Creation with Quick Create Organization and Customer Create new job with quick create organization and customer|Organization Management Create new organization with complete details|Settings Search Functionality Verify search results for different categories)$/i,
      testMatch: [
        'complete-vendor-mr-po-flow-refactored.spec.js',
        'create-asset.spec.js',
        'create-customer.spec.js',
        'create-job-mr-po-workflow.spec.js',
        'create-job-with-quick-create-org-customer.spec.js',
        'create-org.spec.js',
        'settings-search-functions.spec.js',
      ],
      stably: {
        notifications: {
          slack: {
            channelName: 'qa-automation-stably-report',
            notifyOnResult: 'all',
          },
        },
      },
      use: {
        ...devices['Desktop Chrome'],
        // Override base config to avoid aggressive cache/service worker blocking
        // which prevents API data (like job categories) from loading
        launchOptions: {
          args: [
            '--disable-blink-features=AutomationControlled',
          ]
        },
        contextOptions: {
          serviceWorkers: 'allow',
        },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'browser.cache.disk.enable': false,
            'browser.cache.memory.enable': false,
            'browser.cache.offline.enable': false,
            'network.http.use-cache': false,
          }
        },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        launchOptions: {
          args: [
            '--disable-cache',
            '--disable-application-cache',
          ]
        },
      },
    },
    {
      name: 'chrome',
      grep: /.^/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'Chrome_Sense',
      grep: /(Sense AI - Layer 3: Semantic Evaluation Tests EVAL: Count query returns numeric data with correct time context|Sense AI - Layer 3: Semantic Evaluation Tests EVAL: Ranking query returns table with entities and values|Sense AI - Layer 3: Semantic Evaluation Tests EVAL: Ambiguous prompt triggers clarifying question|Sense AI - Layer 3: Semantic Evaluation Tests EVAL: Multi-turn context retention across follow-up messages|Sense AI - Layer 3: Semantic Evaluation Tests EVAL: Visual response quality with proper formatting hierarchy|Sense AI - Layer 4: Prompt Engineering & Guardrails GUARDRAIL: Out-of-domain prompt is handled gracefully|Sense AI - Layer 4: Prompt Engineering & Guardrails GUARDRAIL: Prompt injection attempt is resisted|Sense AI - Layer 4: Prompt Engineering & Guardrails PROMPT: Specific constrained prompt produces grounded data response|Sense AI - Layer 4: Prompt Engineering & Guardrails GUARDRAIL: AI disclaimer is always visible in thread view|Sense AI - Layer 4: Prompt Engineering & Guardrails PROMPT: Comparison query produces analytical multi-dimension response|Sense AI - Layer 2: Response Structure Tests Data query produces response with thinking indicator and action buttons|Sense AI - Layer 2: Response Structure Tests Ranking query produces a table with sortable columns|Sense AI - Layer 2: Response Structure Tests Multi-turn conversation maintains thread structure|Sense AI - Layer 2: Response Structure Tests Refresh button regenerates the response|Sense AI - Layer 1: UI Shell Tests Sense home page renders all core UI elements|Sense AI - Layer 1: UI Shell Tests Prompt area has dynamic suggestion and submitting creates a thread|Sense AI - Layer 1: UI Shell Tests Sense sidebar link is active when on Sense page|Sense AI - Layer 1: UI Shell Tests Clicking a suggested prompt creates a chat thread with proper UI)$/i,
      testMatch: ['sense-ai-evaluation.spec.ts', 'sense-prompt-engineering.spec.ts', 'sense-response-structure.spec.ts', 'sense-ui-shell.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'PO',
      grep: /(Edit PO Lifecycle Tests should allow Edit PO at Draft status with all editable fields|Edit PO Lifecycle Tests should allow Edit PO at Submitted status|Edit PO Lifecycle Tests should allow Edit PO at Approved status and verify email API triggered|Edit PO Lifecycle Tests should allow Edit PO at Sent to Vendor with Associations restricted and send email|Edit PO Lifecycle Tests should allow Edit PO at Sent to Vendor with Associations restricted|Edit PO Lifecycle Tests should allow Edit PO at Vendor Accepted with Associations restricted|Edit PO Lifecycle Tests should allow Edit PO at Vendor Rejected with Associations restricted|Edit PO Lifecycle Tests should NOT allow Edit PO at Partially Fulfilled status|Edit PO Lifecycle Tests should NOT allow Edit PO at Fulfilled status|Edit PO Lifecycle Tests should NOT allow Edit PO at Invoiced status|Edit PO Lifecycle Tests should NOT allow Edit PO at Paid status|Edit PO Lifecycle Tests should show only Delete \(no Edit, no Cancel\) for Closed PO|Edit PO Lifecycle Tests should show edit history and status changes in Activity tab|Edit PO Lifecycle Tests should allow job completion when associated PO is in Draft status|QA-6611: Cloned PO vendor change retains line items & delivery address should retain line items and delivery address when vendor is changed in cloned PO)$/i,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'Jobs',
      grep: /(Jobs Bulk Update Fields should bulk update all specified fields for selected jobs|Jobs Filter Operator Workflow should filter jobs by multiple filters with all available operators and print row counts)$/i,
      testMatch: ['jobs-bulk-update-fields.spec.ts','jobs-filter-operators.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'JobNotes',
      grep: /(Job Notes Image Upload should upload an image in job notes and verify it appears)$/i,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'UAT-notes',
      grep: /(Job Notes - Create Note with Attachments should create a note with text, add image\/video\/PDF attachments, and verify persistence|Job Notes Image Upload should upload an image in job notes and verify it appears|Job Notes - Pin and Unpin Note should pin a note and verify it appears in Pinned Notes section, then unpin and verify removal|Job Notes Section Verification should navigate to an existing job and verify the Notes section is visible|Job Notes - Sorting should sort notes by newest first \(descending\) and oldest first \(ascending\))$/i,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'UAT-Gallery',
      grep: /(Gallery Album CRUD should create, rename, and delete an album in the Gallery Albums section|Job Gallery Album Isolation should isolate job-level album changes and propagate master settings only to new jobs|Job Gallery - Before & After Comparison should create and save a Before & After comparison from two gallery images|Job Gallery Default Albums should verify default albums on a new job match Gallery Settings configuration|Job Gallery - Filter Functionality should filter gallery images by type and verify results update|Job Gallery - Tags and Description should add tags and description to a gallery image)$/i,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'UAT- Maps',
      grep: /(Maps Module - Tab Filter Interactions should verify filter interactions across all map tabs|Maps Module Verification should load Maps module, display location data, and switch tabs successfully)$/i,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'UAT- Photo feed',
      grep: /(Photo Feed Details Panel should verify photo details panel actions including redirections, visibility, tags, description, download, and copy link|Photo Feed Editor should open editor, perform edit, save, and verify changes persist with metadata intact|Photo Feed to Job Gallery Consistency should verify a photo from Photo Feed appears consistently in the associated Job Gallery and persists after refresh|Photo Feed Listing, Filters, and Customize should verify listing page, date range, filters, and customize functionality)$/i,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'UAT-Calendar',
      grep: /(Calendar - Create Job from Calendar View should create a job from calendar with Repair category and one-hour duration|Calendar - Drag and Drop Reschedule Job should drag and drop a calendar job to reschedule it by at least one hour)$/i,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
