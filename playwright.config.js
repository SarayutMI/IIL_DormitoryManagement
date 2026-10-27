import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',
  fullyParallel:false,
  workers:1,
  reporter:'list',
  use:{baseURL:'http://127.0.0.1:4173',headless:true,viewport:{width:1440,height:1000},launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}},
  webServer:{command:'npm run dev',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI,timeout:15000}
});
