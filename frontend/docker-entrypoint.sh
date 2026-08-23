#!/bin/sh
# Retry wrapper for npm install on unreliable networks
set -e

npm config set fetch-timeout 300000
npm config set fetch-retries 5
npm config set fetch-retry-mintimeout 60000
npm config set fetch-retry-maxtimeout 300000

# Try npm ci first, fall back to npm install
if npm ci; then
  echo "✅ npm ci succeeded"
else
  echo "⚠️ npm ci failed, trying npm install..."
  npm install
fi
