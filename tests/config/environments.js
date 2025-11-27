export const environments = {
  uat: {
    baseURL: 'https://uat.zuperpro.com',
    login: {
      companyName: 'zuper-pro',
      email: 'vignesh.s@zuper.co',
      password: 'Vicky@123'
    }
  },
  staging: {
    baseURL: 'https://stagingv3.zuperpro.com',
    login: {
      companyName: 'sofyaizuper',
      email: 'ramanathan.m@zuper.co',
      password: 'Test@123'
    }
  }
};

// Get environment from command line argument or default to UAT
export function getEnvironment() {
  const envArg = process.env.TEST_ENV || 'uat';
  const environment = environments[envArg.toLowerCase()];

  if (!environment) {
    console.log(`⚠️  Unknown environment: ${envArg}. Falling back to UAT.`);
    return environments.uat;
  }

  console.log(`\n🌍 Running tests on: ${envArg.toUpperCase()} environment`);
  console.log(`   Base URL: ${environment.baseURL}\n`);

  return environment;
}
