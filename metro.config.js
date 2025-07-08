const path = require('path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// Ensure proper module resolution
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// Add extra node modules and configure @ alias
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@': path.resolve(__dirname),
  querystring: require.resolve('querystring-es3'),
};

// Configure resolver for @ alias
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    return {
      filePath: path.resolve(__dirname, moduleName.substring(2)),
      type: 'sourceFile',
    };
  }
  // Let Metro handle other modules normally
  return context.resolveRequest(context, moduleName, platform);
};

// Configure Expo Updates to reduce unnecessary rebuilds
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  // This helps with build caching
  drop_console: true,
  keep_fnames: true,
};

// Reset cache when restarting the bundler
config.resetCache = true;

module.exports = config;
