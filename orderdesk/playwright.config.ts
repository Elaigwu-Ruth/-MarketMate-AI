import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const chromium=process.env.CHROMIUM_PATH||['/usr/bin/chromium','/snap/bin/chromium','/usr/bin/google-chrome'].find(existsSync)||'/usr/bin/chromium';
export default defineConfig({
 testDir:'./tests/browser',fullyParallel:false,workers:1,timeout:60000,
 use:{baseURL:'http://127.0.0.1:3100',headless:true,viewport:{width:1440,height:1000},launchOptions:{executablePath:chromium,args:['--no-sandbox','--disable-dev-shm-usage']}},
 webServer:{command:'npm run start -- --port 3100',url:'http://127.0.0.1:3100',reuseExistingServer:false,timeout:60000,env:{AI_API_KEY:'',ORDERDESK_DB:`/tmp/orderdesk-browser-${process.pid}.sqlite`}},
 reporter:'list',outputDir:'/tmp/orderdesk-browser-results'
});
