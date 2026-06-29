import { test, expect } from '@stablyai/playwright-test';
import type { APIRequestContext } from '@playwright/test';

/**
 * User Prompt:
 * - Create Playwright API tests in TypeScript for the Zuper Pro Jobs REST API.
 * - Pure HTTP API tests using Playwright's request fixture / APIRequestContext.
 * - Support two environments (Staging & UAT) selected via env vars.
 * - Smoke tests (read-only) + Full CRUD E2E (serial, creates/cleans own data).
 * - Endpoints: GET /jobs, GET /jobs/{uid}, POST /jobs, PUT /jobs, PUT /jobs/{uid}/status, DELETE /jobs/{uid}/delete.
 */

// ─── Environment Configuration ───────────────────────────────────────────────

/**
 * Normalize BASE_URL for Playwright's baseURL resolution.
 * Playwright resolves relative paths against baseURL using standard URL resolution:
 * - Paths starting with '/' are absolute from domain root (drops path from baseURL!)
 * - Paths without leading '/' are relative to baseURL (requires trailing slash)
 * So we ensure baseURL always ends with '/' and use paths without leading '/'.
 */
function normalizeBaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  let normalized = url.trim();
  // Ensure it ends with /api
  if (!normalized.endsWith('/api') && !normalized.endsWith('/api/')) {
    normalized = normalized.replace(/\/+$/, '') + '/api';
  }
  // Ensure trailing slash for proper relative URL resolution
  if (!normalized.endsWith('/')) {
    normalized += '/';
  }
  return normalized;
}

const BASE_URL = normalizeBaseUrl(process.env.BASE_URL);
const X_API_KEY = process.env.X_API_KEY;
const CATEGORY_UID = process.env.CATEGORY_UID;
const STATUS_UID = process.env.STATUS_UID;
const STATUS_NAME = process.env.STATUS_NAME;

// Fail fast if required env vars are missing
test.beforeAll(() => {
  const missing: string[] = [];
  if (!BASE_URL) missing.push('BASE_URL');
  if (!X_API_KEY) missing.push('X_API_KEY');
  if (!CATEGORY_UID) missing.push('CATEGORY_UID');
  if (!STATUS_UID) missing.push('STATUS_UID');
  if (!STATUS_NAME) missing.push('STATUS_NAME');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        `Set them in your environment or Stably Environments page.`
    );
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a future date string in YYYY-MM-DD HH:mm:ss format (UTC) */
function futureDate(daysFromNow: number, hours: number, minutes = 0, seconds = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(hours, minutes, seconds, 0);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

/** Assert response content-type is JSON (catches misconfigured base URL returning HTML) */
function assertJsonContentType(contentType: string | null, endpoint: string): void {
  expect(
    contentType,
    `Expected JSON content-type from ${endpoint}, got: ${contentType}`
  ).toContain('json');
}

/** Unique run identifier for test isolation */
const RUN_ID = Date.now();

// ─── Smoke Tests (Read-Only, safe on any environment) ────────────────────────

test.describe('Jobs API - Smoke Tests', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: BASE_URL!,
      extraHTTPHeaders: {
        'x-api-key': X_API_KEY!,
        'Content-Type': 'application/json',
      },
    });
  });

  test.afterAll(async () => {
    await apiContext?.dispose();
  });

  test('List jobs - GET /jobs returns success with array data', async () => {
    const startTime = Date.now();
    const response = await apiContext.get('jobs?page=1&count=10&sort=DESC');
    const elapsed = Date.now() - startTime;

    expect(response.status(), 'List jobs should return 200').toBe(200);
    assertJsonContentType(response.headers()['content-type'], 'GET /jobs');

    const body = await response.json();
    expect(body.type, 'Response type should be "success"').toBe('success');
    expect(Array.isArray(body.data), 'Response data should be an array').toBe(true);
    expect(elapsed, 'Response time should be under 5 seconds').toBeLessThan(5000);
  });

  test('Job details - GET /jobs/{job_uid} returns matching job', async () => {
    // First, get a job UID from the list
    const listResponse = await apiContext.get('jobs?page=1&count=10&sort=DESC');
    const listBody = await listResponse.json();

    if (!listBody.data || listBody.data.length === 0) {
      test.skip(true, 'No jobs in account - skipping job details test');
      return;
    }

    const jobUid = listBody.data[0].job_uid;
    expect(jobUid, 'First job should have a job_uid').toBeTruthy();

    const response = await apiContext.get(`jobs/${jobUid}`);
    expect(response.status(), 'Job details should return 200').toBe(200);
    assertJsonContentType(response.headers()['content-type'], `GET /jobs/${jobUid}`);

    const body = await response.json();
    expect(body.type, 'Response type should be "success"').toBe('success');
    expect(body.data.job_uid, 'Returned job_uid should match requested UID').toBe(jobUid);
  });

  test('Negative - Invalid job UID returns error', async () => {
    const invalidUid = '00000000-0000-0000-0000-000000000000';
    const response = await apiContext.get(`jobs/${invalidUid}`);

    // Some APIs return 200 with error body, others return 4xx
    const body = await response.json();
    const isHttpError = response.status() >= 400 && response.status() < 500;
    const isBodyError = body.type === 'error';
    expect(
      isHttpError || isBodyError,
      `Expected 4xx status or error type for invalid UID. Got status=${response.status()}, type=${body.type}`
    ).toBe(true);
  });

  test('Negative - Invalid API key returns 401 or 403', async ({ playwright }) => {
    const unauthorizedContext = await playwright.request.newContext({
      baseURL: BASE_URL!,
      extraHTTPHeaders: {
        'x-api-key': 'invalid-key-12345',
        'Content-Type': 'application/json',
      },
    });

    const response = await unauthorizedContext.get('jobs?page=1&count=10&sort=DESC');

    expect(
      [401, 403].includes(response.status()),
      `Expected 401 or 403 for invalid API key, got ${response.status()}`
    ).toBe(true);

    await unauthorizedContext.dispose();
  });
});

// ─── Full CRUD E2E Tests (Serial, creates and cleans own data) ───────────────

test.describe.serial('Jobs API - CRUD E2E Flow', () => {
  let apiContext: APIRequestContext;
  let createdJobUid: string | null = null;
  let deletedJobUid: string | null = null; // Preserved for verify-deletion step

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: BASE_URL!,
      extraHTTPHeaders: {
        'x-api-key': X_API_KEY!,
        'Content-Type': 'application/json',
      },
    });
  });

  test.afterAll(async () => {
    // Safety cleanup: delete the job if it was created but not cleaned up
    if (createdJobUid) {
      try {
        await apiContext.delete(`jobs/${createdJobUid}/delete`);
      } catch {
        // Best effort cleanup - ignore errors
      }
    }
    await apiContext?.dispose();
  });

  test('Create Job - POST /jobs returns success with job_uid', async () => {
    const jobTitle = `E2E Test Job ${RUN_ID}`;
    const createBody = {
      job: {
        job_title: jobTitle,
        job_category: CATEGORY_UID,
        job_priority: 'LOW',
        job_type: 'NEW',
        job_description: 'Created by automated E2E suite. Safe to delete.',
        scheduled_start_time: futureDate(1, 9, 0, 0),
        scheduled_end_time: futureDate(1, 10, 0, 0),
        due_date: futureDate(3, 18, 0, 0),
        work_mins_required: 60,
        customer: {
          customer_first_name: 'E2E',
          customer_last_name: 'Automation',
        },
      },
    };

    const response = await apiContext.post('jobs', { data: createBody });
    expect(response.status(), 'Create job should return 200').toBe(200);
    assertJsonContentType(response.headers()['content-type'], 'POST /jobs');

    const body = await response.json();
    expect(body.type, 'Create job response type should be "success"').toBe('success');
    expect(body.job_uid, 'Create job response should contain job_uid').toBeTruthy();

    createdJobUid = body.job_uid;
  });

  test('Get created job - GET /jobs/{job_uid} returns correct details', async () => {
    expect(createdJobUid, 'job_uid should be available from Create step').toBeTruthy();

    const response = await apiContext.get(`jobs/${createdJobUid}`);
    expect(response.status(), 'Get created job should return 200').toBe(200);
    assertJsonContentType(response.headers()['content-type'], `GET /jobs/${createdJobUid}`);

    const body = await response.json();
    expect(body.type, 'Response type should be "success"').toBe('success');
    expect(body.data.job_uid, 'Returned job_uid should match created job').toBe(createdJobUid);
    expect(body.data.job_title, 'Job title should contain "E2E Test Job"').toContain(
      'E2E Test Job'
    );
  });

  test('Update Job - PUT /jobs updates title and priority', async () => {
    expect(createdJobUid, 'job_uid should be available from Create step').toBeTruthy();

    const updatedTitle = `E2E Test Job ${RUN_ID} (updated)`;
    const updateBody = {
      job: {
        job_uid: createdJobUid,
        job_title: updatedTitle,
        job_priority: 'HIGH',
      },
    };

    const response = await apiContext.put('jobs', { data: updateBody });
    expect(response.status(), 'Update job should return 200').toBe(200);
    assertJsonContentType(response.headers()['content-type'], 'PUT /jobs');

    const body = await response.json();
    expect(body.type, 'Update job response type should be "success"').toBe('success');
  });

  test('Update Status - PUT /jobs/{job_uid}/status changes job status', async () => {
    expect(createdJobUid, 'job_uid should be available from Create step').toBeTruthy();

    const statusBody = {
      job_uid: createdJobUid,
      status_uid: STATUS_UID,
      status_name: STATUS_NAME,
      remarks_free_text: 'E2E automated status update',
    };

    const response = await apiContext.put(`jobs/${createdJobUid}/status`, {
      data: statusBody,
    });
    expect(response.status(), 'Update status should return 200').toBe(200);
  });

  test('Verify update - GET /jobs/{job_uid} reflects changes', async () => {
    expect(createdJobUid, 'job_uid should be available from Create step').toBeTruthy();

    const response = await apiContext.get(`jobs/${createdJobUid}`);
    expect(response.status(), 'Get updated job should return 200').toBe(200);
    assertJsonContentType(response.headers()['content-type'], `GET /jobs/${createdJobUid}`);

    const body = await response.json();
    expect(body.type, 'Response type should be "success"').toBe('success');
    expect(
      body.data.job_title,
      'Job title should reflect the update with "(updated)"'
    ).toContain('(updated)');
  });

  test('Delete Job - DELETE /jobs/{job_uid}/delete removes the job', async () => {
    expect(createdJobUid, 'job_uid should be available from Create step').toBeTruthy();

    // Save UID for the verify-deletion step before we null it
    deletedJobUid = createdJobUid;

    const response = await apiContext.delete(`jobs/${createdJobUid}/delete`);
    expect(response.status(), 'Delete job should return 200').toBe(200);
    assertJsonContentType(
      response.headers()['content-type'],
      `DELETE /jobs/${createdJobUid}/delete`
    );

    const body = await response.json();
    expect(body.type, 'Delete response type should be "success"').toBe('success');
    expect(
      body.message?.toLowerCase(),
      'Delete response message should mention "delete"'
    ).toContain('delete');

    // Clear the UID so afterAll doesn't attempt double-delete
    createdJobUid = null;
  });

  test('Verify deletion - GET /jobs/{job_uid} confirms job is gone', async () => {
    expect(deletedJobUid, 'deletedJobUid should be preserved from Delete step').toBeTruthy();

    const response = await apiContext.get(`jobs/${deletedJobUid}`);
    const body = await response.json();

    // The job should either return a non-200 status/error type, OR show is_deleted flag
    const isGone =
      response.status() !== 200 ||
      body.type === 'error' ||
      body.data?.is_deleted === true;

    expect(
      isGone,
      `Expected deleted job to be gone. Got status=${response.status()}, type=${body.type}, is_deleted=${body.data?.is_deleted}`
    ).toBe(true);
  });
});
