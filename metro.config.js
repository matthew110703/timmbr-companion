const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('node:path');
const fs = require('node:fs');

const config = getDefaultConfig(__dirname);

// Local development link override via yalc (e.g. `pnpm run ds:link`)
const yalcPath = path.resolve(__dirname, '.yalc/@timmbr/native-ui');
if (fs.existsSync(yalcPath)) {
  config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    '@timmbr/native-ui': yalcPath,
  };
  config.watchFolders = [...(config.watchFolders || []), yalcPath];
}

module.exports = withNativeWind(config, { input: './global.css' });
