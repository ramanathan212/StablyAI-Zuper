import { devStagingData } from '../config/dev-staging-data.js';

/**
 * Dev/Staging Helper Utility
 * Helper functions for dev/staging test data
 */

/**
 * Get a random item from an array
 */
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get all parts from dev/staging catalog
 */
export function getAllDevParts() {
  const catalog = devStagingData.partsCatalog;
  return [
    ...catalog.pipes,
    ...catalog.fittings,
    ...catalog.valves,
    ...catalog.fixtures,
    ...catalog.drainage
  ];
}

/**
 * Get a random part from dev/staging catalog
 */
export function getRandomDevPart() {
  const allParts = getAllDevParts();
  return getRandomItem(allParts);
}

/**
 * Get a random part from a specific category in dev/staging
 */
export function getRandomDevPartFromCategory(category) {
  const catalog = devStagingData.partsCatalog;
  if (!catalog[category]) {
    throw new Error(`Invalid category: ${category}`);
  }
  return getRandomItem(catalog[category]);
}

/**
 * Format part data for dev/staging test execution
 */
export function formatDevPartForTest(part) {
  const timestamp = Date.now();
  return {
    name: part.name,
    partNumber: `${part.prefix}-${timestamp}`,
    price: part.price,
    businessUnit: 'Primary',
    verifyBusinessUnit: 'Plumbing',
    availableQty: part.availableQty,
    minimumQty: part.minQty
  };
}

/**
 * Get a test-ready random part for dev/staging
 */
export function getDevTestReadyPart(category = null) {
  const part = category
    ? getRandomDevPartFromCategory(category)
    : getRandomDevPart();
  return formatDevPartForTest(part);
}

/**
 * Get multiple test-ready parts for dev/staging
 */
export function getDevTestReadyParts(count, category = null) {
  const allParts = category
    ? devStagingData.partsCatalog[category]
    : getAllDevParts();

  if (count > allParts.length) {
    throw new Error(`Cannot get ${count} unique parts. Only ${allParts.length} parts available.`);
  }

  const shuffled = [...allParts].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(formatDevPartForTest);
}

/**
 * Get parts mix for dev/staging
 */
export function getDevPartsMix(mix) {
  const parts = [];
  const catalog = devStagingData.partsCatalog;

  Object.keys(mix).forEach(category => {
    const count = mix[category];
    if (count > 0 && catalog[category]) {
      const categoryParts = [...catalog[category]]
        .sort(() => 0.5 - Math.random())
        .slice(0, count);
      parts.push(...categoryParts);
    }
  });

  return parts.map(formatDevPartForTest);
}
