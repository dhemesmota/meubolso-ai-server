#!/bin/bash

echo "🚀 Deploying MeuBolso.AI to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "🔐 Logging in to Railway..."
railway login

# Deploy
echo "📦 Deploying to Railway..."
railway up

echo "✅ Deploy completed!"
echo "🌐 Your app is now live on Railway!"
