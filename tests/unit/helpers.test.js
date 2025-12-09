import { test, expect } from '@playwright/test';
import { getTestData } from '../config/test-data-config.js';

// Unit tests don't require browser automation - they test utility functions and logic

test.describe('Test Data Configuration', () => {
  test('should load test data configuration', () => {
    const testData = getTestData();

    expect(testData).toBeDefined();
    expect(testData.login).toBeDefined();
    expect(testData.login.companyName).toBeTruthy();
    expect(testData.login.email).toBeTruthy();
  });

  test('should respect environment variables for credentials', () => {
    // Save original env vars
    const originalCompany = process.env.COMPANY_NAME;
    const originalEmail = process.env.LOGIN_EMAIL;

    // Set test env vars
    process.env.COMPANY_NAME = 'test-company';
    process.env.LOGIN_EMAIL = 'test@example.com';

    const testData = getTestData();

    expect(testData.login.companyName).toBe('test-company');
    expect(testData.login.email).toBe('test@example.com');

    // Restore original env vars
    if (originalCompany) process.env.COMPANY_NAME = originalCompany;
    else delete process.env.COMPANY_NAME;
    if (originalEmail) process.env.LOGIN_EMAIL = originalEmail;
    else delete process.env.LOGIN_EMAIL;
  });

  test('should use default values when env vars are not set', () => {
    // Ensure env vars are not set
    delete process.env.COMPANY_NAME;
    delete process.env.LOGIN_EMAIL;
    delete process.env.LOGIN_PASSWORD;

    const testData = getTestData();

    expect(testData.login.companyName).toBe('zuper-pro');
    expect(testData.login.email).toBe('vignesh.s@zuper.co');
    expect(testData.login.password).toBe('Vicky@123');
  });

  test('should generate vendor names with timestamp format', () => {
    const testData = getTestData();

    // Verify vendor name contains "Test Vendor" and a timestamp
    expect(testData.vendor.name).toContain('Test Vendor');
    expect(testData.vendor.name).toMatch(/Test Vendor \d+/);

    // Verify timestamp is recent (within last minute)
    const timestampMatch = testData.vendor.name.match(/Test Vendor (\d+)/);
    expect(timestampMatch).not.toBeNull();
    const timestamp = parseInt(timestampMatch[1]);
    const now = Date.now();
    expect(timestamp).toBeGreaterThan(now - 60000); // Within last minute
    expect(timestamp).toBeLessThanOrEqual(now);
  });

  test('should have valid vendor product structure', () => {
    const testData = getTestData();

    expect(testData.vendor.products).toHaveLength(3);
    expect(testData.vendor.products[0]).toHaveProperty('name');
    expect(testData.vendor.products[0]).toHaveProperty('sku');
  });
});

test.describe('Data Validation', () => {
  test('organization data should have required fields', () => {
    const testData = getTestData();

    expect(testData.organization.name).toBeTruthy();
    expect(testData.organization.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(testData.organization.serviceAddress).toBeDefined();
  });

  test('customer data should have required fields', () => {
    const testData = getTestData();

    expect(testData.customer.firstName).toBeTruthy();
    expect(testData.customer.lastName).toBeTruthy();
    expect(testData.customer.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  test('purchase order should have valid quantities', () => {
    const testData = getTestData();

    testData.purchaseOrder.receivedQuantities.forEach(item => {
      expect(item.product).toBeTruthy();
      expect(item.quantity).toBeTruthy();
      expect(parseInt(item.quantity)).toBeGreaterThan(0);
    });
  });
});
