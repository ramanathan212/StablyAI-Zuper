// Environment-based test data configuration
// This allows using environment variables in CI while keeping local defaults

export const getTestData = () => ({
  // Login credentials - use env vars in CI, fallback to local values
  login: {
    companyName: process.env.COMPANY_NAME || 'zuper-pro',
    email: process.env.LOGIN_EMAIL || 'vignesh.s@zuper.co',
    password: process.env.LOGIN_PASSWORD || 'Vicky@123'
  },

  // Vendor details
  vendor: {
    name: `Test Vendor ${Date.now()}`,
    contactName: 'Test Contact',
    email: `vendor${Date.now()}@test.com`,
    workNumber: '123456789098',
    leadTime: '3',
    products: [
      { name: '#TS - 001', sku: 'SKU127' },
      { name: '#T2 - 002', sku: 'SKU234' },
      { name: '#T3 - 003', sku: 'SKU567' }
    ],
    billingAddress: {
      search: 'turya',
      select: 'Turyaa Chennai, Rajiv Gandhi Salai, Elango Nagar, Perungudi'
    },
    bankDetails: {
      accountName: 'Test Vendor Account',
      accountNumber: '2345678987654',
      bankName: 'HSBC',
      branchIdentifier: 'hsbc46365',
      remarks: 'test remark'
    }
  },

  // Material Request details
  materialRequest: {
    title: `MR Test ${Date.now()}`,
    remarks: 'test MR remark',
    jobSearch: 'Validation UAT -15/10',
    jobNumber: '5275',
    products: ['#004 - Mobile', '#001 - Monitor', '#002 - Keyboard']
  },

  // Purchase Order details
  purchaseOrder: {
    vendor: 'Zuper Pro',
    receivedQuantities: [
      { product: '#001 - Monitor', quantity: '1', remarks: 'P1' },
      { product: '#002 - Keyboard', quantity: '1', remarks: 'P2' },
      { product: '#004 - Mobile', quantity: '1', remarks: 'P3' }
    ]
  },

  // Organization details
  organization: {
    name: `UAT Validation ${Date.now()}`,
    email: `uatvalidation${Date.now()}@gmail.com`,
    serviceAddress: {
      search: 'turya',
      select: 'Turyaa Chennai, Rajiv Gandhi',
      sameAsBilling: true
    },
    customFields: {
      singleLineText: 'single',
      multiLineText: 'mutliple',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  },

  // Customer/Contact details
  customer: {
    firstName: `UAT Customer ${Date.now()}`,
    lastName: 'Testing',
    organization: 'ACME Corporation',
    email: `UATcustomertesting${Date.now()}@gmail.com`,
    serviceAddress: {
      search: 'walmart',
      select: 'Walmart Park, Avenida Manuel',
      sameAsBilling: true
    }
  },

  // Asset details
  asset: {
    code: `Test#${Date.now()}`,
    name: `GPU ${Date.now()}`,
    organization: 'ACME Corporation',
    contact: 'John Smith'
  },

  // Job clone details
  jobClone: {
    searchText: 'Job 1',
    jobNumber: 'Sofy AI1926',
    assignedUser: 'ramanathan',
    loopCount: 3 // Number of times to clone the job
  },

  // Parts & Services details
  part: {
    name: `Part ${Date.now()}`,
    partNumber: `PN-${Date.now()}`,
    price: '1500',
    businessUnit: 'Primary',
    verifyBusinessUnit: 'Plumbing',
    availableQty: '150',
    minimumQty: '10'
  },

  // Parts Catalog - Comprehensive list of plumbing parts
  partsCatalog: {
    pipes: [
      { name: 'PVC Pipe Schedule 40', prefix: 'PVC-40', price: '250', minQty: '20', availableQty: '100' },
      { name: 'PVC Pipe Schedule 80', prefix: 'PVC-80', price: '350', minQty: '15', availableQty: '80' },
      { name: 'CPVC Pipe', prefix: 'CPVC', price: '400', minQty: '15', availableQty: '75' },
      { name: 'Copper Pipe Type M', prefix: 'CU-M', price: '800', minQty: '10', availableQty: '50' },
      { name: 'Copper Pipe Type L', prefix: 'CU-L', price: '900', minQty: '10', availableQty: '45' },
      { name: 'Copper Pipe Type K', prefix: 'CU-K', price: '1000', minQty: '8', availableQty: '40' },
      { name: 'PEX Pipe Red', prefix: 'PEX-R', price: '450', minQty: '20', availableQty: '100' },
      { name: 'PEX Pipe Blue', prefix: 'PEX-B', price: '450', minQty: '20', availableQty: '100' },
      { name: 'PEX Pipe White', prefix: 'PEX-W', price: '450', minQty: '20', availableQty: '100' },
      { name: 'Galvanized Steel Pipe', prefix: 'GSP', price: '600', minQty: '12', availableQty: '60' },
      { name: 'Cast Iron Pipe', prefix: 'CIP', price: '750', minQty: '10', availableQty: '50' },
      { name: 'Flex Hoses', prefix: 'FH', price: '150', minQty: '30', availableQty: '150' }
    ],
    fittings: [
      { name: 'Elbow 45 Degree', prefix: 'ELB-45', price: '85', minQty: '50', availableQty: '200' },
      { name: 'Elbow 90 Degree', prefix: 'ELB-90', price: '95', minQty: '50', availableQty: '200' },
      { name: 'T-Fitting Standard', prefix: 'TEE-STD', price: '120', minQty: '40', availableQty: '180' },
      { name: 'Reducing Tee', prefix: 'TEE-RED', price: '140', minQty: '30', availableQty: '150' },
      { name: 'Coupling PVC', prefix: 'CPL-PVC', price: '65', minQty: '60', availableQty: '250' },
      { name: 'Coupling CPVC', prefix: 'CPL-CPVC', price: '75', minQty: '50', availableQty: '220' },
      { name: 'Coupling PEX', prefix: 'CPL-PEX', price: '80', minQty: '50', availableQty: '200' },
      { name: 'Coupling Copper', prefix: 'CPL-CU', price: '180', minQty: '30', availableQty: '120' },
      { name: 'Union Standard', prefix: 'UNI', price: '220', minQty: '25', availableQty: '100' },
      { name: 'Adapter Male', prefix: 'ADP-M', price: '55', minQty: '70', availableQty: '300' },
      { name: 'Adapter Female', prefix: 'ADP-F', price: '55', minQty: '70', availableQty: '300' },
      { name: 'Bushing Standard', prefix: 'BSH', price: '45', minQty: '80', availableQty: '350' },
      { name: 'Cap Standard', prefix: 'CAP', price: '35', minQty: '100', availableQty: '400' },
      { name: 'Plug Standard', prefix: 'PLG', price: '30', minQty: '100', availableQty: '400' },
      { name: 'Wye Fitting', prefix: 'WYE', price: '150', minQty: '25', availableQty: '100' },
      { name: 'PEX Crimp Rings', prefix: 'PEX-CR', price: '25', minQty: '200', availableQty: '1000' },
      { name: 'Compression Fitting', prefix: 'CMP-FIT', price: '120', minQty: '40', availableQty: '180' }
    ],
    valves: [
      { name: 'Ball Valve 1/2 inch', prefix: 'BV-12', price: '280', minQty: '20', availableQty: '100' },
      { name: 'Ball Valve 3/4 inch', prefix: 'BV-34', price: '320', minQty: '18', availableQty: '90' },
      { name: 'Gate Valve Standard', prefix: 'GV-STD', price: '450', minQty: '15', availableQty: '75' },
      { name: 'Check Valve', prefix: 'CHK-V', price: '380', minQty: '15', availableQty: '80' },
      { name: 'Pressure Relief Valve', prefix: 'PRV', price: '550', minQty: '10', availableQty: '50' },
      { name: 'Angle Stop Valve', prefix: 'ASV', price: '190', minQty: '25', availableQty: '120' },
      { name: 'Globe Valve', prefix: 'GLB-V', price: '520', minQty: '12', availableQty: '60' },
      { name: 'Thermostatic Mixing Valve', prefix: 'TMV', price: '850', minQty: '8', availableQty: '40' }
    ],
    fixtures: [
      { name: 'Kitchen Faucet', prefix: 'FAU-K', price: '1200', minQty: '5', availableQty: '30' },
      { name: 'Bathroom Faucet', prefix: 'FAU-B', price: '950', minQty: '8', availableQty: '40' },
      { name: 'Shower Valve', prefix: 'SHW-V', price: '1100', minQty: '6', availableQty: '35' },
      { name: 'Shower Head Standard', prefix: 'SHW-H', price: '450', minQty: '12', availableQty: '60' },
      { name: 'Toilet Tank', prefix: 'TOI-T', price: '650', minQty: '8', availableQty: '40' },
      { name: 'Toilet Bowl', prefix: 'TOI-B', price: '800', minQty: '8', availableQty: '40' },
      { name: 'Bidet Standard', prefix: 'BID', price: '1500', minQty: '4', availableQty: '20' },
      { name: 'Utility Sink', prefix: 'UTL-SNK', price: '850', minQty: '6', availableQty: '30' },
      { name: 'Laundry Tub', prefix: 'LAU-TUB', price: '950', minQty: '5', availableQty: '25' },
      { name: 'Floor Drain', prefix: 'FLR-DR', price: '280', minQty: '15', availableQty: '75' }
    ],
    drainage: [
      { name: 'P-Trap Standard', prefix: 'P-TRP', price: '120', minQty: '30', availableQty: '150' },
      { name: 'S-Trap Standard', prefix: 'S-TRP', price: '130', minQty: '25', availableQty: '120' },
      { name: 'Drum Trap', prefix: 'DRM-TRP', price: '180', minQty: '20', availableQty: '100' },
      { name: 'Air Admittance Valve', prefix: 'AAV', price: '220', minQty: '15', availableQty: '80' },
      { name: 'Cleanout Plug', prefix: 'CLN-PLG', price: '65', minQty: '50', availableQty: '250' },
      { name: 'Roof Vent', prefix: 'RF-VNT', price: '350', minQty: '12', availableQty: '60' },
      { name: 'Drain Cover', prefix: 'DRN-CVR', price: '45', minQty: '60', availableQty: '300' },
      { name: 'Strainer Standard', prefix: 'STR', price: '85', minQty: '40', availableQty: '200' }
    ]
  }
});

// Export singleton instance
export const testData = getTestData();
