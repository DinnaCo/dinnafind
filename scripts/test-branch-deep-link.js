#!/usr/bin/env node

/**
 * Test script for Branch deep links
 * Run with: node scripts/test-branch-deep-link.js
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('🧪 Branch Deep Link Tester\n');

// Test deep links
const testLinks = [
  'dinnafind://restaurant/test-venue-123?autoSave=true',
  'dinnafind://bucket-list',
  'dinnafind://auth-callback',
];

async function testDeepLink(link) {
  try {
    console.log(`🔗 Testing: ${link}`);

    // Test on iOS Simulator
    if (process.platform === 'darwin') {
      try {
        execSync(`xcrun simctl openurl booted "${link}"`, { stdio: 'pipe' });
        console.log('✅ iOS Simulator: Link sent successfully');
      } catch (error) {
        console.log('❌ iOS Simulator: Failed to send link');
      }
    }

    // Test on Android Emulator (if available)
    try {
      execSync(
        `adb shell am start -W -a android.intent.action.VIEW -d "${link}"`,
        { stdio: 'pipe' },
      );
      console.log('✅ Android Emulator: Link sent successfully');
    } catch (error) {
      console.log(
        '❌ Android Emulator: Failed to send link (emulator may not be running)',
      );
    }
  } catch (error) {
    console.log(`❌ Error testing link: ${error.message}`);
  }

  console.log('');
}

async function runTests() {
  console.log('🚀 Starting deep link tests...\n');

  for (const link of testLinks) {
    await testDeepLink(link);
    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('✨ Deep link testing complete!');
  console.log('\n📱 Check your app for:');
  console.log('   - Console logs showing link processing');
  console.log('   - Navigation to the correct screens');
  console.log('   - Deferred link handling if app was closed');

  rl.close();
}

runTests().catch(console.error);
