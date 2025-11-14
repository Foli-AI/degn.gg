#!/bin/bash

# DEGN Arcade Deployment Helper Script
# This script checks prerequisites and prepares for deployment

set -e

echo "🚀 DEGN Arcade Deployment Helper"
echo "================================"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed."
    echo "   Install it with: npm install -g vercel"
    echo ""
    exit 1
fi

echo "✅ Vercel CLI found"

# Check if vercel is configured
if ! vercel whoami &> /dev/null; then
    echo "❌ Vercel CLI is not authenticated."
    echo "   Run: vercel login"
    echo ""
    exit 1
fi

echo "✅ Vercel CLI authenticated"
echo ""

# Run build
echo "📦 Building Next.js application..."
echo ""

if npm run build; then
    echo ""
    echo "✅ Build successful!"
    echo ""
else
    echo ""
    echo "❌ Build failed. Fix errors before deploying."
    echo ""
    exit 1
fi

# Check environment variables
echo "🔍 Checking required environment variables..."
echo ""

REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "NEXT_PUBLIC_MATCHMAKER_URL"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "⚠️  Missing environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "   These must be set in Vercel Dashboard:"
    echo "   Project Settings → Environment Variables"
    echo ""
fi

echo ""
echo "📋 Deployment Command:"
echo "   vercel --prod"
echo ""
echo "⚠️  IMPORTANT: Before deploying, ensure all environment variables are set in Vercel Dashboard:"
echo ""
echo "   Required Variables:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   - NEXT_PUBLIC_MATCHMAKER_URL (or NEXT_PUBLIC_BACKEND_URL)"
echo "   - NEXT_PUBLIC_SOLANA_RPC (optional, defaults to devnet)"
echo "   - SUPABASE_SERVICE_ROLE_KEY (server-side only)"
echo ""
echo "   See DEPLOYMENT_NOTES.md for complete list and instructions."
echo ""

