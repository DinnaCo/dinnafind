#!/usr/bin/env node

/**
 * Simulate Deferred Deep Link Script
 *
 * This script simulates what happens when a user clicks a Branch link and installs the app.
 * It stores a deferred deep link in the iOS Simulator's AsyncStorage.
 *
 * Usage:
 *   # Simulate a deferred link
 *   node scripts/simulate-deferred-deep-link.js --venueId=test-123 --autoSave=true
 *
 *   # Clear the simulated link
 *   node scripts/simulate-deferred-deep-link.js --clear
 *
 *   # Check what's stored
 *   node scripts/simulate-deferred-deep-link.js --check
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value === undefined ? true : value;
  return acc;
}, {});

console.log('🧪 Deferred Deep Link Simulator\n');

// Get iOS Simulator data directory
function getSimulatorDataDir() {
  try {
    const simulatorDir = path.join(
      os.homedir(),
      'Library/Developer/CoreSimulator/Devices'
    );

    // Get the booted simulator
    const bootedSimulator = execSync(
      'xcrun simctl list devices | grep Booted',
      { encoding: 'utf-8' }
    ).trim();

    if (!bootedSimulator) {
      console.error('❌ No booted simulator found. Please start the iOS Simulator first.');
      process.exit(1);
    }

    // Extract UUID from the output
    const uuidMatch = bootedSimulator.match(/\(([A-F0-9-]+)\)/);
    if (!uuidMatch) {
      console.error('❌ Could not find simulator UUID');
      process.exit(1);
    }

    const uuid = uuidMatch[1];
    console.log(`📱 Found booted simulator: ${uuid}`);

    // Find the app's data directory
    const deviceDir = path.join(simulatorDir, uuid, 'data/Containers/Data/Application');

    if (!fs.existsSync(deviceDir)) {
      console.error('❌ Could not find simulator data directory');
      process.exit(1);
    }

    // Look for the DinnaFind app
    const apps = fs.readdirSync(deviceDir);
    for (const app of apps) {
      const appPath = path.join(deviceDir, app);
      const metadataPath = path.join(appPath, '.com.apple.mobile_container_manager.metadata.plist');

      if (fs.existsSync(metadataPath)) {
        const metadata = fs.readFileSync(metadataPath, 'utf-8');
        if (metadata.includes('dinnafind') || metadata.includes('DinnaFind')) {
          const asyncStorageDir = path.join(appPath, 'Library/Application Support/RCTAsyncLocalStorage');

          if (!fs.existsSync(asyncStorageDir)) {
            fs.mkdirSync(asyncStorageDir, { recursive: true });
          }

          return asyncStorageDir;
        }
      }
    }

    console.error('❌ Could not find DinnaFind app in simulator');
    console.log('💡 Make sure the app is installed and has been run at least once');
    process.exit(1);
  } catch (error) {
    console.error('❌ Error finding simulator data:', error.message);
    process.exit(1);
  }
}

// Create a deferred deep link
function createDeferredLink(venueId, autoSave = true) {
  const params = new URLSearchParams();
  if (autoSave) {
    params.append('autoSave', 'true');
  }

  const url = `dinnafind://restaurant/${venueId}?${params.toString()}`;

  const deferredLinkData = {
    url,
    timestamp: Date.now(),
    processed: false,
    source: 'branch',
  };

  return deferredLinkData;
}

// Store the deferred link in AsyncStorage
function storeDeferredLink(data) {
  try {
    const asyncStorageDir = getSimulatorDataDir();
    const manifestPath = path.join(asyncStorageDir, 'manifest.json');

    // Read or create manifest
    let manifest = {};
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    }

    // Add our key to the manifest
    const key = 'dinnafind_branch_deferred_link';
    const filename = `${key}.json`;
    manifest[key] = filename;

    // Write the data file
    const dataPath = path.join(asyncStorageDir, filename);
    fs.writeFileSync(dataPath, JSON.stringify(data));

    // Update manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log('✅ Deferred deep link stored successfully!');
    console.log(`📦 Data:`, JSON.stringify(data, null, 2));
    console.log('\n📱 Next steps:');
    console.log('   1. Force quit the app (swipe up in app switcher)');
    console.log('   2. Relaunch the app from the home screen');
    console.log('   3. The app should open to the venue detail screen');
    console.log('   4. The venue should be auto-saved to your bucket list\n');
  } catch (error) {
    console.error('❌ Error storing deferred link:', error.message);
    process.exit(1);
  }
}

// Clear the deferred link
function clearDeferredLink() {
  try {
    const asyncStorageDir = getSimulatorDataDir();
    const manifestPath = path.join(asyncStorageDir, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      console.log('✅ No deferred link to clear');
      return;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const key = 'dinnafind_branch_deferred_link';

    if (manifest[key]) {
      const filename = manifest[key];
      const dataPath = path.join(asyncStorageDir, filename);

      if (fs.existsSync(dataPath)) {
        fs.unlinkSync(dataPath);
      }

      delete manifest[key];
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      console.log('✅ Deferred deep link cleared');
    } else {
      console.log('✅ No deferred link found');
    }
  } catch (error) {
    console.error('❌ Error clearing deferred link:', error.message);
    process.exit(1);
  }
}

// Check what's stored
function checkDeferredLink() {
  try {
    const asyncStorageDir = getSimulatorDataDir();
    const manifestPath = path.join(asyncStorageDir, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      console.log('📭 No AsyncStorage data found');
      return;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const key = 'dinnafind_branch_deferred_link';

    if (manifest[key]) {
      const filename = manifest[key];
      const dataPath = path.join(asyncStorageDir, filename);

      if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        console.log('📦 Stored deferred link:');
        console.log(JSON.stringify(data, null, 2));

        const age = Date.now() - data.timestamp;
        const ageMinutes = Math.floor(age / 1000 / 60);
        console.log(`\n⏰ Age: ${ageMinutes} minutes`);

        if (age > 60 * 60 * 1000) {
          console.log('⚠️  Link is older than 1 hour and will be ignored');
        } else {
          console.log('✅ Link is fresh and will be processed');
        }

        if (data.processed) {
          console.log('✅ Link has been processed');
        } else {
          console.log('⏳ Link is pending processing');
        }
      } else {
        console.log('📭 No deferred link stored');
      }
    } else {
      console.log('📭 No deferred link stored');
    }
  } catch (error) {
    console.error('❌ Error checking deferred link:', error.message);
    process.exit(1);
  }
}

// Main execution
if (args.help) {
  console.log('Usage:');
  console.log('  # Create a simulated deferred link');
  console.log('  node scripts/simulate-deferred-deep-link.js --venueId=test-123 --autoSave=true');
  console.log('');
  console.log('  # Clear the simulated link');
  console.log('  node scripts/simulate-deferred-deep-link.js --clear');
  console.log('');
  console.log('  # Check what\'s stored');
  console.log('  node scripts/simulate-deferred-deep-link.js --check');
  console.log('');
  console.log('Options:');
  console.log('  --venueId      Venue ID to link to (required for creating links)');
  console.log('  --autoSave     Whether to auto-save the venue (default: true)');
  console.log('  --clear        Clear the stored deferred link');
  console.log('  --check        Check what\'s currently stored');
  console.log('  --help         Show this help message');
  process.exit(0);
}

if (args.clear) {
  clearDeferredLink();
} else if (args.check) {
  checkDeferredLink();
} else if (args.venueId) {
  const autoSave = args.autoSave !== 'false';
  const data = createDeferredLink(args.venueId, autoSave);
  storeDeferredLink(data);
} else {
  console.error('❌ Missing required argument: --venueId');
  console.log('💡 Run with --help for usage information');
  process.exit(1);
}
