#!/bin/bash

echo "🏢 Setting up Multi-tenant SaaS Application..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Generate and apply database migrations
echo "🗄️ Setting up database..."
cd apps/api
pnpm db:push
cd ../..

# Create sample tenant data
echo "🏢 Creating sample tenant data..."
cat << 'EOF' > create-sample-data.sql
-- Insert sample tenants
INSERT INTO tenants (id, name, slug, plan, is_active) VALUES 
  (gen_random_uuid(), 'Acme Corp', 'acme', 'pro', true),
  (gen_random_uuid(), 'TechStart Inc', 'techstart', 'free', true),
  (gen_random_uuid(), 'Enterprise Solutions', 'enterprise', 'enterprise', true);

-- Note: You'll need to add tenant users manually after creating users in Keycloak
EOF

# Apply sample data
docker exec -i $(docker-compose ps -q postgres) psql -U myappuser -d myappdb < create-sample-data.sql

# Clean up
rm create-sample-data.sql

echo "✅ Multi-tenant setup complete!"
echo ""
echo "🚀 Next steps:"
echo "1. Run 'pnpm dev' to start the development servers"
echo "2. Visit http://localhost:8080 to configure Keycloak"
echo "3. Create users and assign them to tenants via the API"
echo "4. Test tenant isolation by switching between tenants"
echo ""
echo "📚 API Documentation: http://localhost:4001/api/reference"
echo "🔐 Keycloak Admin: http://localhost:8080 (admin/admin)"
echo "🗄️ Database Admin: http://localhost:5050 (admin@admin.com/admin)" 