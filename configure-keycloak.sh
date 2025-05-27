#!/bin/bash

echo "🔐 Configuring Keycloak..."
echo "========================"

# Wait for Keycloak to be ready
until curl -sf http://localhost:8080/health > /dev/null 2>&1 || curl -sf http://localhost:8080/ > /dev/null 2>&1; do
    echo "⏳ Waiting for Keycloak to be ready..."
    sleep 2
done

# Get admin token
echo "🔑 Getting admin token..."
TOKEN_RESPONSE=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin" \
    -d "password=admin" \
    -d "grant_type=password" \
    -d "client_id=admin-cli")

# Extract token using grep and sed (works without jq)
TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Failed to get admin token. Make sure Keycloak is running and accessible."
    exit 1
fi

# Check if realm already exists
REALM_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "http://localhost:8080/admin/realms/contrack")

if [ "$REALM_EXISTS" = "200" ]; then
    echo "✅ Realm 'contrack' already exists"
else
    # Import realm configuration
    echo "📤 Creating realm and client..."
    curl -s -X POST "http://localhost:8080/admin/realms" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d @keycloak-config.json

    if [ $? -eq 0 ]; then
        echo "✅ Realm 'contrack' created successfully"
        echo "✅ Client 'contrackapi' created successfully"
        echo "✅ Test user created: testuser@example.com / testpass"
    else
        echo "❌ Failed to create realm"
        exit 1
    fi
fi

echo ""
echo "✨ Keycloak configuration complete!"
echo ""
echo "You can now:"
echo "1. Login to Keycloak admin console: http://localhost:8080 (admin/admin)"
echo "2. Login to the app with: testuser@example.com / testpass"