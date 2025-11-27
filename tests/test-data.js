export const testData = {
  // Login credentials
  login: {
    companyName: 'zuper-pro',
    email: 'vignesh.s@zuper.co',
    password: 'Vicky@123'
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
    name: `UAT Organization ${Date.now()}`,
    email: `org${Date.now()}@gmail.com`,
    serviceAddress: {
      search: 'turya',
      select: 'Turyaa Chennai, Rajiv Gandhi',
      sameAsBilling: true
    },
    customFields: {
      singleLineText: 'Single line input value',
      multiLineText: 'Multi line text input value',
      date: true,
      time: true,
      dateTime: true,
      radioOption: 'option 1'
    }
  },

  // Job clone details
  jobClone: {
    searchText: 'Job 1',
    jobNumber: 'Sofy AI1926',
    assignedUser: 'ramanathan',
    loopCount: 3 // Number of times to clone the job
  }
};
