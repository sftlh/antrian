#!/bin/bash

# Test database connection and API endpoints
echo "🧪 Testing database connection and API endpoints..."
echo "=================================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

echo "✅ .env file found"

# Extract DATABASE_URL from .env
DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | sed 's/^"//' | sed 's/"$//')

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in .env"
    exit 1
fi

echo "✅ DATABASE_URL configured"

# Test health endpoint
echo ""
echo "🏥 Testing health endpoint..."
curl -s http://localhost:3003/api/health | head -20

echo ""
echo "📊 Testing public queues endpoint..."
curl -s http://localhost:3003/api/public/queues | head -20

echo ""
echo "🎯 Test completed!"
echo "=================================================="
echo "If you see JSON responses above, the database connection is working!"
echo "If you see errors, check your DATABASE_URL and database server."