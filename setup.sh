#!/bin/bash

echo "🚀 Setting up Tasks App with PostgreSQL and Keycloak"
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and run this script again."
    echo "   You may need to run: sudo systemctl start docker"
    echo "   Or if permission denied: sudo usermod -aG docker $USER"
    exit 1
fi

# Start Docker services
echo "📦 Starting Docker services..."
docker compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if PostgreSQL is ready
echo "🔍 Checking PostgreSQL..."
until docker compose exec -T postgres pg_isready -U myappuser -d myappdb > /dev/null 2>&1; do
    echo "   Waiting for PostgreSQL to be ready..."
    sleep 2
done
echo "✅ PostgreSQL is ready!"

# Check if Keycloak is ready
echo "🔍 Checking Keycloak..."
until curl -sf http://localhost:8080/health > /dev/null 2>&1 || curl -sf http://localhost:8080/ > /dev/null 2>&1; do
    echo "   Waiting for Keycloak to be ready..."
    sleep 2
done
echo "✅ Keycloak is ready!"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Set up environment
echo "🔧 Setting up environment variables..."
if [ ! -f apps/api/.env ]; then
    cp apps/api/.env.example apps/api/.env
    echo "✅ Created .env file from example"
else
    echo "✅ .env file already exists"
fi

# Run database migrations
echo "🗄️  Running database migrations..."
cd apps/api
pnpm db:push
cd ../..

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure Keycloak:"
echo "   - Open http://localhost:8080"
echo "   - Login with admin/admin"
echo "   - Create realm 'contrack'"
echo "   - Create client 'contrackapi' with:"
echo "     • Client Protocol: openid-connect"
echo "     • Access Type: public"
echo "     • Valid Redirect URIs: http://localhost:5173/*"
echo "     • Web Origins: http://localhost:5173"
echo ""
echo "2. Start the development servers:"
echo "   pnpm dev"
echo ""
echo "3. Open http://localhost:5173 in your browser"