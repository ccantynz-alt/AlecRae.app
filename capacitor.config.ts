import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.alecrae.voice',
  appName: 'AlecRae Voice',
  webDir: 'out',
  server: {
    url: 'https://alecrae.app',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#111920',
    },
  },
};

export default config;
