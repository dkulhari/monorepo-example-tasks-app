# Setup Instructions

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Docker and Docker Compose

## Quick Setup

### Automated Setup

Run the setup script:

```bash
./setup.sh
```

This will:
1. Start all Docker services
2. Install dependencies
3. Configure environment variables
4. Run database migrations

Then configure Keycloak:

```bash
./configure-keycloak.sh
```

This will automatically:
1. Create the 'contrack' realm
2. Create the 'contrackapi' client
3. Create a test user (testuser@example.com / testpass)

### Manual Setup

If you prefer to set up manually:

1. **Start Docker services:**
   ```bash
   docker compose up -d
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment:**
   ```bash
   cd apps/api
   cp .env.example .env
   ```

4. **Run migrations:**
   ```bash
   cd apps/api
   pnpm db:push
   ```

5. **Configure Keycloak manually:**
   - Open http://localhost:8080
   - Login with admin/admin
   - Create a new realm named "contrack"
   - Create a new client with:
     - Client ID: contrackapi
     - Client Protocol: openid-connect
     - Client authentication: OFF (this makes it a public client)
     - Authorization: OFF
     - Standard flow: ON
     - Direct access grants: ON (optional, for testing)
     - Valid Redirect URIs: http://localhost:5173/*
     - Valid post logout redirect URIs: http://localhost:5173/*
     - Web Origins: http://localhost:5173

## Running the Application

Start both the API and web development servers:

```bash
pnpm dev
```

- API: http://localhost:3001
- Web: http://localhost:5173

## Troubleshooting

### Docker Permission Denied

If you get permission denied errors with Docker:

```bash
sudo usermod -aG docker $USER
# Log out and log back in
```

### Port Already in Use

If ports are already in use, you can stop the services:

```bash
docker compose down
```

Or change the ports in `docker-compose.yml` and update the corresponding environment variables.

### Database Connection Issues

Make sure PostgreSQL is running:

```bash
docker compose ps
```

Check PostgreSQL logs:

```bash
docker compose logs postgres
```

### Keycloak Issues

Check Keycloak logs:

```bash
docker compose logs keycloak
```

Make sure Keycloak is accessible at http://localhost:8080

## Test Credentials

- **Keycloak Admin**: admin / admin
- **Test User**: testuser@example.com / testpass
- **PostgreSQL**: myappuser / myapppassword
- **MinIO**: adminuser / adminuser