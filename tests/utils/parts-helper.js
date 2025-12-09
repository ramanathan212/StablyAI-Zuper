import { testData } from '../test-data.js';

/**
 * Parts Helper Utility
 * Provides helper functions for dynamically selecting and managing parts data
 */

/**
 * Get a random item from an array
 * @param {Array} array - The array to pick from
 * @returns {*} Random item from the array
 */
export function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get all parts from all categories as a flat array
 * @returns {Array} All parts from the catalog
 */
export function getAllParts() {
  const catalog = testData.partsCatalog;
  return [
    ...catalog.pipes,
    ...catalog.fittings,
    ...catalog.valves,
    ...catalog.fixtures,
    ...catalog.drainage
  ];
}

/**
 * Get a random part from the entire catalog
 * @returns {Object} Random part with name, prefix, price, minQty, availableQty
 */
export function getRandomPart() {
  const allParts = getAllParts();
  return getRandomItem(allParts);
}

/**
 * Get a random part from a specific category
 * @param {string} category - Category name ('pipes', 'fittings', 'valves', 'fixtures', 'drainage')
 * @returns {Object} Random part from the specified category
 */
export function getRandomPartFromCategory(category) {
  const catalog = testData.partsCatalog;
  if (!catalog[category]) {
    throw new Error(`Invalid category: ${category}. Valid categories are: pipes, fittings, valves, fixtures, drainage`);
  }
  return getRandomItem(catalog[category]);
}

/**
 * Get multiple random parts from the catalog
 * @param {number} count - Number of parts to retrieve
 * @param {boolean} unique - If true, ensures no duplicates
 * @returns {Array} Array of random parts
 */
export function getRandomParts(count, unique = true) {
  const allParts = getAllParts();

  if (unique && count > allParts.length) {
    throw new Error(`Cannot get ${count} unique parts. Only ${allParts.length} parts available.`);
  }

  if (!unique) {
    return Array.from({ length: count }, () => getRandomPart());
  }

  // Get unique parts
  const shuffled = [...allParts].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Get parts from specific categories
 * @param {Object} options - Selection options
 * @param {number} options.pipes - Number of pipe parts
 * @param {number} options.fittings - Number of fitting parts
 * @param {number} options.valves - Number of valve parts
 * @param {number} options.fixtures - Number of fixture parts
 * @param {number} options.drainage - Number of drainage parts
 * @returns {Array} Array of selected parts
 */
export function getPartsByCategory(options = {}) {
  const parts = [];
  const catalog = testData.partsCatalog;

  Object.keys(options).forEach(category => {
    const count = options[category];
    if (count > 0 && catalog[category]) {
      const categoryParts = [...catalog[category]]
        .sort(() => 0.5 - Math.random())
        .slice(0, count);
      parts.push(...categoryParts);
    }
  });

  return parts;
}

/**
 * Format part data for test execution with timestamp to ensure uniqueness
 * @param {Object} part - Part object from catalog
 * @returns {Object} Formatted part data ready for test
 */
export function formatPartForTest(part) {
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
 * Get a ready-to-use random part for testing
 * @param {string} category - Optional category to pick from
 * @returns {Object} Formatted part data ready for test
 */
export function getTestReadyPart(category = null) {
  const part = category
    ? getRandomPartFromCategory(category)
    : getRandomPart();
  return formatPartForTest(part);
}

/**
 * Get multiple test-ready parts
 * @param {number} count - Number of parts to get
 * @param {string} category - Optional category to filter by
 * @returns {Array} Array of formatted parts ready for testing
 */
export function getTestReadyParts(count, category = null) {
  const parts = category
    ? getPartsByCategory({ [category]: count })
    : getRandomParts(count, true);

  return parts.map(formatPartForTest);
}

/**
 * Get parts by category mix
 * @param {Object} mix - Mix specification, e.g., { pipes: 2, valves: 1 }
 * @returns {Array} Array of formatted parts ready for testing
 */
export function getPartsMix(mix) {
  const parts = getPartsByCategory(mix);
  return parts.map(formatPartForTest);
}
