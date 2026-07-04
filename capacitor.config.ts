import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.doctor8.app',
  appName: 'Doctor8',
  webDir: 'public',
  server: {
    url: 'https://app.doctor8.org',
    cleartext: false
  }
};

export default config;