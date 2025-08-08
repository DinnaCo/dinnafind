#!/bin/bash

# Deep Link Testing Script for DinnaFind
# Run this to test various deep link scenarios

echo "🔗 DinnaFind Deep Link Tester"
echo "=============================="
echo ""

# Function to run a deep link test
test_link() {
    local description=$1
    local url=$2
    echo "📱 Testing: $description"
    echo "   URL: $url"
    xcrun simctl openurl booted "$url"
    echo "   ✓ Sent to simulator"
    echo ""
    sleep 2
}

echo "Make sure your app is running in the iOS Simulator first!"
echo "Press Enter to start testing..."
read

echo "Test 1: Restaurant Link (while app is open)"
test_link "Restaurant without params" "dinnafind://restaurant/574074c1498ec610c4e112d0"

echo "Test 2: Restaurant with Auto-Save"
test_link "Restaurant with autoSave=true" "dinnafind://restaurant/574074c1498ec610c4e112d0?autoSave=true"

echo "Test 3: Bucket List"
test_link "Navigate to bucket list" "dinnafind://bucket-list"

echo "Test 4: Different Restaurant"
test_link "Another restaurant" "dinnafind://restaurant/123456789"

echo "Test 5: Auth Callback (shouldn't require login)"
test_link "Auth callback" "dinnafind://auth-callback"

echo ""
echo "✅ All tests sent!"
echo ""
echo "Expected behavior:"
echo "- Each link should navigate immediately to the correct screen"
echo "- No duplicate navigations"
echo "- No return to explore screen"
echo "- Auth required only for restaurant links when not logged in"
echo ""
echo "Check the console logs for:"
echo "[DeepLink] New URL event while app is open: ..."
echo "[DeepLink] Processing new deep link: ..."
echo "[DeepLink] Navigating to restaurant: ..."