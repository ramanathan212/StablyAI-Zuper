import { Page, expect } from '@playwright/test';
import { dismissPopups } from './auth.helper';

/**
 * Navigates to the Jobs list page via the sidebar.
 * Clicks the Jobs group icon (#job_group) to expand the submenu,
 * then clicks the "Jobs" link.
 */
export async function navigateToJobs({
  page,
}: {
  page: Page;
}): Promise<void> {
  await dismissPopups({ page });

  const jobGroupIcon = page.locator('#job_group');
  await jobGroupIcon.waitFor({ state: 'visible', timeout: 15000 });
  await jobGroupIcon.click();

  const jobsLink = page.getByRole('link', { name: 'Jobs', exact: true });
  await jobsLink.waitFor({ state: 'visible', timeout: 10000 });
  await jobsLink.click();

  await expect(page).toHaveURL(/\/jobs/, { timeout: 15000 });
}

/**
 * Navigates to the Organizations list page via the sidebar.
 * Clicks the Customer/Organization group to expand the submenu,
 * then clicks the "Organizations" link.
 */
export async function navigateToOrganizations({
  page,
}: {
  page: Page;
}): Promise<void> {
  await dismissPopups({ page });

  // The sidebar group containing Contacts, Organizations, and Properties
  const orgNavButton = page
    .locator('div')
    .filter({ hasText: 'Customers, Organizations and' })
    .nth(3);
  await orgNavButton.waitFor({ state: 'visible', timeout: 20000 });
  await orgNavButton.click();

  const orgsLink = page.getByRole('link', { name: 'Organizations' });
  await orgsLink.waitFor({ state: 'visible', timeout: 10000 });
  await orgsLink.click();

  await expect(page).toHaveURL(/\/organizations/, { timeout: 15000 });
}

/**
 * From the Organizations list page, clicks "New Organization"
 * and waits for the form to load.
 */
export async function openNewOrganizationForm({
  page,
}: {
  page: Page;
}): Promise<void> {
  await dismissPopups({ page });

  const newOrgButton = page.getByRole('link', { name: ' New Organization' });
  await newOrgButton.waitFor({ state: 'visible', timeout: 10000 });
  await newOrgButton.click();

  await expect(page).toHaveURL(/\/organizations\/new/, { timeout: 15000 });

  // Wait for the form to be ready
  await page
    .getByRole('textbox', { name: 'Organization Name*' })
    .waitFor({ state: 'visible', timeout: 15000 });
}

/**
 * Fills the organization form and saves it.
 *
 * @param orgName       - Organization name to fill
 * @param orgEmail      - Organization email to fill
 * @param streetSearch  - Text to type into the street address field (triggers autocomplete)
 */
export async function fillAndSaveOrganization({
  page,
  orgName,
  orgEmail,
  streetSearch,
}: {
  page: Page;
  orgName: string;
  orgEmail: string;
  streetSearch: string;
}): Promise<void> {
  // Fill primary details
  await page.getByRole('textbox', { name: 'Organization Name*' }).fill(orgName);
  await page.getByRole('textbox', { name: 'Organization Email' }).fill(orgEmail);

  // Fill street address — type slowly to trigger Google Maps autocomplete
  const streetInput = page
    .getByRole('textbox', { name: 'Flat / House No, Street / Locality' })
    .first();
  await streetInput.click();
  await streetInput.pressSequentially(streetSearch, { delay: 60 });

  // Wait for autocomplete suggestions and select the first matching address
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const allBtns = Array.from(document.querySelectorAll('button[title]'));
    const addressBtns = allBtns.filter(
      (b) => b.title && b.title.length > 15 && b.title.includes(',')
    );
    if (addressBtns[0]) addressBtns[0].click();
  });
  await page.waitForTimeout(800);

  // Check "Same As Service Address" for billing (JS click to bypass overlay)
  await page
    .getByRole('checkbox', { name: 'Same As Service Address' })
    .evaluate((el: HTMLInputElement) => {
      if (!el.checked) el.click();
    });
  await page.waitForTimeout(500);

  // Dismiss notification dialog if present before save
  await dismissPopups({ page });

  // Click Save Organization anchor via JS (banner overlay intercepts normal clicks)
  await page.evaluate(() => {
    const link = Array.from(document.querySelectorAll('a')).find((a) =>
      a.textContent?.trim().includes('Save Organization')
    );
    if (link) link.click();
  });

  // Wait for the Create confirmation dialog and click Create via JS
  const createButton = page.getByRole('button', { name: 'Create' });
  await createButton.waitFor({ state: 'visible', timeout: 10000 });

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.innerText && b.innerText.trim() === 'Create'
    );
    if (btn) btn.click();
  });

  // Wait for navigation to the organization details page
  await page.waitForURL(
    (url) => !url.toString().includes('/organizations/new'),
    { timeout: 30000 }
  );
}
