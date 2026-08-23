#!/bin/bash
# Run this on the server to add swap space (needed for 1GB RAM)
set -e

echo "🔧 Adding 2GB swap space..."

# Create swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
echo "✅ Swap status:"
free -h

echo ""
echo "✅ Swap added! Now retry the deploy from GitHub Actions."
