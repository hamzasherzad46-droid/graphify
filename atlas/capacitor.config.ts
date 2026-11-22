import type { CapacitorConfig } from '@capacitor/cli'

// Native wrappers: `npx cap add ios` / `npx cap add android` once (needs Xcode / Android Studio),
// then `npm run cap:sync` after every web build.
const config: CapacitorConfig = {
  appId: 'app.atlas.anatomy',
  appName: 'Atlas',
  webDir: 'dist',
  backgroundColor: '#06080a',
}

export default config
