#!/bin/bash
# Apply Socket.IO Integration Patches
# Run this script to create branches, add files, commit, and prepare PRs

set -e

echo "🚀 Applying Socket.IO integration patches..."

# Check if we're in the right directory
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Ensure we're on main branch
git checkout main
git pull origin main

# ============================================
# Branch 1: socket-server
# ============================================
echo ""
echo "📦 Creating socket-server branch..."

# Check if branch exists
if git show-ref --verify --quiet refs/heads/socket-server; then
    echo "⚠️  Branch socket-server already exists, checking out..."
    git checkout socket-server
    git pull origin socket-server || true
else
    git checkout -b socket-server
fi

# Add socket-server files
git add socket-server/
git add deploy/README_DEPLOY.md
git add summary.md security.md next-steps.md verification.md

# Commit if there are changes
if ! git diff --cached --quiet; then
    git commit -m "socket-server: add socket.io matchmaker server"
    echo "✅ Committed socket-server changes"
else
    echo "ℹ️  No changes to commit for socket-server"
fi

# Push (may need to pull first)
git push origin socket-server || {
    echo "⚠️  Push failed, you may need to:"
    echo "   git pull origin socket-server --rebase"
    echo "   git push origin socket-server"
}

# ============================================
# Branch 2: socket-nextjs-stubs
# ============================================
echo ""
echo "📦 Creating socket-nextjs-stubs branch..."

git checkout main

if git show-ref --verify --quiet refs/heads/socket-nextjs-stubs; then
    echo "⚠️  Branch socket-nextjs-stubs already exists, checking out..."
    git checkout socket-nextjs-stubs
    git pull origin socket-nextjs-stubs || true
else
    git checkout -b socket-nextjs-stubs
fi

# Add Next.js API files
git add degn-arcade/src/app/api/socket/
git add degn-arcade/src/app/api/match/
git add degn-arcade/src/app/api/README_SOCKET_IO.md

# Commit if there are changes
if ! git diff --cached --quiet; then
    git commit -m "socket-nextjs-stubs: add socket auth & match-complete stubs"
    echo "✅ Committed socket-nextjs-stubs changes"
else
    echo "ℹ️  No changes to commit for socket-nextjs-stubs"
fi

# Push
git push origin socket-nextjs-stubs || {
    echo "⚠️  Push failed, you may need to:"
    echo "   git pull origin socket-nextjs-stubs --rebase"
    echo "   git push origin socket-nextjs-stubs"
}

# ============================================
# Branch 3: socket-client-patches
# ============================================
echo ""
echo "📦 Creating socket-client-patches branch..."

git checkout main

if git show-ref --verify --quiet refs/heads/socket-client-patches; then
    echo "⚠️  Branch socket-client-patches already exists, checking out..."
    git checkout socket-client-patches
    git pull origin socket-client-patches || true
else
    git checkout -b socket-client-patches
fi

# Add client patch files
git add client-patches/

# Commit if there are changes
if ! git diff --cached --quiet; then
    git commit -m "socket-client-patches: add Network.js replacement and patch instructions"
    echo "✅ Committed socket-client-patches changes"
else
    echo "ℹ️  No changes to commit for socket-client-patches"
fi

# Push
git push origin socket-client-patches || {
    echo "⚠️  Push failed, you may need to:"
    echo "   git pull origin socket-client-patches --rebase"
    echo "   git push origin socket-client-patches"
}

# ============================================
# Summary
# ============================================
echo ""
echo "✅ All patches applied!"
echo ""
echo "📋 Next steps:"
echo "1. Create Pull Requests on GitHub:"
echo "   - socket-server → main"
echo "   - socket-nextjs-stubs → main"
echo "   - socket-client-patches → main"
echo ""
echo "2. See PR_TEMPLATES.md for PR descriptions"
echo ""
echo "3. After PRs are merged, follow next-steps.md for deployment"

git checkout main

