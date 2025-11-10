#!/usr/bin/env node

/**
 * Script to help set up Branch keys in Xcode project
 * This script provides instructions for manually adding Branch keys
 */

const fs = require('fs');
const path = require('path');

console.log('🔑 Branch Keys Setup Helper\n');

// Check if .env files exist
const envFiles = ['.env', '.env.local'];
let branchKey = null;
let branchKeyTest = null;

for (const file of envFiles) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const branchMatch = content.match(/BRANCH_KEY=([^\n\r]+)/);
    const branchTestMatch = content.match(/BRANCH_KEY_TEST=([^\n\r]+)/);

    if (branchMatch) branchKey = branchMatch[1];
    if (branchTestMatch) branchKeyTest = branchTestMatch[1];
  }
}

console.log('📋 Current Branch Keys:');
console.log(`   Live Key: ${branchKey ? '✅ Found' : '❌ Missing'}`);
console.log(`   Test Key: ${branchKeyTest ? '✅ Found' : '❌ Missing'}\n`);

if (!branchKey || !branchKeyTest) {
  console.log('⚠️  Missing Branch keys! Please add them to your .env file:');
  console.log('   BRANCH_KEY=your_live_branch_key_here');
  console.log('   BRANCH_KEY_TEST=your_test_branch_key_here\n');
}

console.log('🔧 Xcode Project Setup Required:\n');
console.log('1. Open ios/DinnaFindDev.xcworkspace in Xcode');
console.log('2. Select the DinnaFindDev project in the navigator');
console.log('3. Select the DinnaFindDev target');
console.log('4. Go to Build Settings tab');
console.log('5. Search for "User-Defined"');
console.log('6. Add these User-Defined settings:');
console.log('   - BRANCH_KEY = $(BRANCH_KEY)');
console.log('   - BRANCH_KEY_TEST = $(BRANCH_KEY_TEST)');
console.log('\n7. Make sure your .env file has the actual key values');
console.log('8. Clean and rebuild the project\n');

console.log('📱 After setup, test with:');
console.log('   node scripts/test-branch-deep-link.js\n');

console.log('🔍 Files that should now be configured:');
console.log('   ✅ ios/DinnaFindDev/Branch.plist');
console.log('   ✅ ios/DinnaFindDev/Info.plist (Branch config added)');
console.log('   ✅ ios/DinnaFindDev/AppDelegate.swift (Branch init added)');
console.log('   ✅ services/BranchService.ts (real Branch links)');
console.log('   ✅ hooks/useBranchDeepLink.ts (Branch integration)');
