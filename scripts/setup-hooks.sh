#!/bin/bash

# Setup script to install git hooks for DinnaFind
# Run this after cloning the repository

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOOKS_SOURCE="$SCRIPT_DIR/hooks"
HOOKS_DEST="$PROJECT_ROOT/.git/hooks"

echo "🔧 Setting up git hooks for DinnaFind..."
echo ""

# Check if we're in a git repository
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo "❌ Error: Not a git repository. Run this from the project root."
    exit 1
fi

# Install each hook from scripts/hooks/
for hook in "$HOOKS_SOURCE"/*; do
    if [ -f "$hook" ]; then
        hook_name=$(basename "$hook")
        dest="$HOOKS_DEST/$hook_name"

        # Copy hook to .git/hooks/
        cp "$hook" "$dest"
        chmod +x "$dest"

        echo "✅ Installed: $hook_name"
    fi
done

echo ""
echo "📋 Installed hooks:"
ls -la "$HOOKS_DEST" | grep -v "\.sample$" | grep -v "^total" | grep -v "^\."
echo ""

# Check for Supabase CLI
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI found"
else
    echo "⚠️  Supabase CLI not found. Install with:"
    echo "   brew install supabase/tap/supabase"
fi

# Remind about environment variable
echo ""
echo "📝 Don't forget to set your Supabase project ID:"
echo "   export SUPABASE_PROJECT_ID=your-project-id"
echo ""
echo "   Add this to your ~/.zshrc or ~/.bashrc to persist it."
echo ""
echo "🎉 Git hooks setup complete!"
