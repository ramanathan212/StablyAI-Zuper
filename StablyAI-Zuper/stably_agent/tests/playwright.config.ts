import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'UAT_Purchasing',
      grep: /.^/,
    },
  ],
});
