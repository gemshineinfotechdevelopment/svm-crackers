#!/usr/bin/env bash
# ==============================================================================
# Apsara Crackers VPS Deployment / Update Script
# Subdomain: apsara-crackers.gemshine.tech
# Backend Port: 5015
# Usage on VPS: bash deploy.sh
# ==============================================================================

set -e

echo "🚀 [1/5] Pulling latest changes from Git..."
git pull origin main

echo "📦 [2/5] Installing root & frontend dependencies..."
npm install

echo "📦 [3/5] Installing backend dependencies..."
npm --prefix server install

echo "🔨 [4/5] Building frontend & backend (TypeScript)..."
npm run build:all

echo "🔄 [5/5] Reloading PM2 backend service (Port 5015: apsara-crackers-api)..."
pm2 reload ecosystem.config.cjs || pm2 start ecosystem.config.cjs

echo "=========================================================="
echo "✅ Apsara Crackers deployed successfully on Port 5015!"
echo "🌐 URL: https://apsara-crackers.gemshine.tech"
echo "=========================================================="
