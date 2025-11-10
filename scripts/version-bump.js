#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const packageJsonPath = path.join(__dirname, '..', 'package.json');

const bumpType = process.argv[2] || 'patch';

function incrementVersion(version, type) {
  const parts = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
    default:
      parts[2]++;
      break;
  }
  
  return parts.join('.');
}

function updateVersion() {
  try {
    // Read current files
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Get current version
    const currentVersion = appJson.expo.version;
    const newVersion = incrementVersion(currentVersion, bumpType);
    
    // Update version in app.json
    appJson.expo.version = newVersion;
    
    // Increment build numbers
    if (appJson.expo.ios) {
      appJson.expo.ios.buildNumber = String(parseInt(appJson.expo.ios.buildNumber || '1') + 1);
    }
    
    if (appJson.expo.android) {
      appJson.expo.android.versionCode = (appJson.expo.android.versionCode || 1) + 1;
    }
    
    // Update version in package.json
    packageJson.version = newVersion;
    
    // Write updated files
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    
    console.log(`✅ Version bumped from ${currentVersion} to ${newVersion}`);
    console.log(`📱 iOS Build Number: ${appJson.expo.ios?.buildNumber || 'N/A'}`);
    console.log(`🤖 Android Version Code: ${appJson.expo.android?.versionCode || 'N/A'}`);
    
    // Create git tag
    console.log(`\n📌 To create a release tag, run:`);
    console.log(`   git add -A`);
    console.log(`   git commit -m "chore: bump version to ${newVersion}"`);
    console.log(`   git tag -a v${newVersion} -m "Release version ${newVersion}"`);
    console.log(`   git push origin main --tags`);
    
  } catch (error) {
    console.error('❌ Error updating version:', error.message);
    process.exit(1);
  }
}

updateVersion();