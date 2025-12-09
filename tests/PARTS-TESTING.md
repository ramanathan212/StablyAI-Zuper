# Parts & Services Testing Guide

This guide explains how to run parts creation tests across different environments.

## 📂 File Structure

```
tests/
├── config/
│   ├── test-data-config.js      # UAT/Production environment data
│   └── dev-staging-data.js      # Development/Staging environment data
├── pages/
│   ├── PartsPage.js             # Parts page object
│   └── LoginPage.js             # Login page object
├── utils/
│   ├── parts-helper.js          # Helper for UAT/Production
│   └── dev-staging-helper.js    # Helper for Dev/Staging
├── create-parts.spec.js         # UAT/Production tests
└── create-parts-dev.spec.js     # Development/Staging tests
```

## 🔐 Environment Credentials

### UAT/Production Environment
- **File**: `create-parts.spec.js`
- **Config**: `test-data-config.js`
- **Company**: zuper-pro
- **Email**: vignesh.s@zuper.co
- **Password**: Vicky@123
- **URL**: https://uat.zuperpro.com

### Development/Staging Environment
- **File**: `create-parts-dev.spec.js`
- **Config**: `dev-staging-data.js`
- **Company**: sofyaizuper
- **Email**: ramanathan.m@zuper.co
- **Password**: Test@123
- **URL**: https://developmentv3.zuperpro.com/v7

## 🚀 Running Tests

### Run UAT/Production Tests

```bash
# Run all UAT tests
npx playwright test create-parts.spec.js

# Run specific test
npx playwright test create-parts.spec.js -g "random part from catalog"

# Run with headed browser
npx playwright test create-parts.spec.js --headed
```

### Run Development/Staging Tests

```bash
# Run all dev/staging tests
npx playwright test create-parts-dev.spec.js

# Run specific test
npx playwright test create-parts-dev.spec.js -g "random pipe part"

# Run with headed browser
npx playwright test create-parts-dev.spec.js --headed
```

### Run Both Environments

```bash
# Run all parts tests (both environments)
npx playwright test create-parts*.spec.js
```

## 📊 Available Test Scenarios

### UAT/Production Tests (`create-parts.spec.js`)
1. ✅ Create random part from catalog
2. ✅ Create random pipe part
3. ✅ Create random valve part
4. ✅ Create multiple random parts (3 unique)
5. ✅ Create mixed set (2 pipes + 1 valve + 2 fittings)
6. ✅ Create part with global auth
7. ✅ Create multiple fixtures with global auth

### Development/Staging Tests (`create-parts-dev.spec.js`)
1. ✅ Create random part from catalog
2. ✅ Create random pipe part
3. ✅ Create random valve part
4. ✅ Create random fitting part
5. ✅ Create random fixture part
6. ✅ Create random drainage part
7. ✅ Create multiple random parts (3 unique)
8. ✅ Create mixed set (2 pipes + 1 valve + 2 fittings)
9. ✅ Create one part from each category

## 🗂️ Parts Catalog

Both environments have access to **55+ plumbing parts** across 5 categories:

### Pipes (12 types)
- PVC Pipe Schedule 40, Schedule 80
- CPVC Pipe
- Copper Pipe (Type M, L, K)
- PEX Pipe (Red, Blue, White)
- Galvanized Steel Pipe
- Cast Iron Pipe
- Flex Hoses

### Fittings (17 types)
- Elbows (45°, 90°)
- T-Fittings, Reducing Tees
- Couplings (PVC, CPVC, PEX, Copper)
- Unions, Adapters, Bushings
- Caps, Plugs, Wye Fittings
- PEX Crimp Rings, Compression Fittings

### Valves (8 types)
- Ball Valves (1/2", 3/4")
- Gate Valve, Check Valve
- Pressure Relief Valve
- Angle Stop Valve
- Globe Valve
- Thermostatic Mixing Valve

### Fixtures (10 types)
- Kitchen & Bathroom Faucets
- Shower Valves & Heads
- Toilet Tanks & Bowls
- Bidets, Utility Sinks
- Laundry Tubs, Floor Drains

### Drainage (8 types)
- P-Traps, S-Traps
- Drum Traps
- Air Admittance Valves
- Cleanout Plugs
- Roof Vents
- Drain Covers, Strainers

## 💡 How Dynamic Selection Works

Every time you run a test, it will:
1. **Randomly select** a part from the catalog
2. **Generate unique** part number with timestamp
3. **Use realistic** prices and quantities
4. **Log** which part is being created

Example console output:
```
[DEV] Creating pipe: PVC Pipe Schedule 40 (PVC-40-1733058234567)
[DEV] Creating valve: Ball Valve 1/2 inch (BV-12-1733058235123)
```

## 🔧 Customization

### Add New Parts to Catalog

Edit `dev-staging-data.js` or `test-data-config.js`:

```javascript
pipes: [
  { name: 'New Pipe Type', prefix: 'NPT', price: '300', minQty: '10', availableQty: '50' }
]
```

### Create Custom Test Mix

```javascript
const customMix = getDevPartsMix({
  pipes: 3,
  valves: 2,
  fittings: 5
});
```

### Run Specific Category Only

```javascript
const pipesOnly = getDevTestReadyParts(5, 'pipes');
```

## 🐛 Troubleshooting

### Tests failing with login errors
- Verify credentials in config files
- Check if URL is correct for environment
- Ensure network connectivity

### Parts not being created
- Check browser console for JavaScript errors
- Verify selectors in `PartsPage.js`
- Increase timeout if network is slow

### Random selection not working
- Ensure helper functions are imported correctly
- Check console logs for error messages

## 📝 Best Practices

1. **Use the correct test file** for your environment
2. **Don't modify** existing test-data-config.js for dev/staging tests
3. **Review console logs** to see which parts are being created
4. **Run tests in headed mode** initially to debug issues
5. **Use unique part numbers** to avoid conflicts

## 🔄 CI/CD Integration

### Development Environment
```yaml
- name: Run Dev Parts Tests
  run: npx playwright test create-parts-dev.spec.js
```

### Production Environment
```yaml
- name: Run UAT Parts Tests
  run: npx playwright test create-parts.spec.js
```

## 📞 Support

For issues or questions:
- Check test logs for detailed error messages
- Review browser screenshots in `test-results/`
- Verify environment credentials are correct
