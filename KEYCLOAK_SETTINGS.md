# Keycloak Client Settings for React SPA

## Login Settings

### General Settings
- **Client ID**: `contrackapi`
- **Name**: `Contrack API Client`
- **Description**: `Public client for Contrack React application`
- **Always display in UI**: OFF

### Access Settings
- **Root URL**: `http://localhost:5173`
- **Home URL**: `http://localhost:5173`
- **Valid redirect URIs**: 
  - `http://localhost:5173/*`
  - For production: `https://yourdomain.com/*`
- **Valid post logout redirect URIs**:
  - `http://localhost:5173/*`
  - For production: `https://yourdomain.com/*`
- **Base URL**: `/`
- **Admin URL**: (leave empty)
- **Web origins**: 
  - `http://localhost:5173`
  - `+` (to allow all Valid Redirect URIs origins)

### Capability Config
- **Client authentication**: OFF (Required for public clients)
- **Authorization**: OFF
- **Standard flow**: ON (Required for browser login)
- **Direct access grants**: ON (Optional - for testing with username/password)
- **Implicit flow**: OFF (Deprecated, use Standard flow)
- **Service account roles**: OFF
- **OAuth 2.0 Device Authorization Grant**: OFF
- **OIDC CIBA Grant**: OFF

## Logout Settings

### Logout Configuration
1. **Front-channel logout**: ON
   - **Front-channel logout URL**: `http://localhost:5173/logout`
   
2. **Backchannel logout**: OFF (not needed for SPAs)

3. **Logout Settings in Advanced Tab**:
   - **Frontchannel logout session required**: ON
   - **Backchannel logout session required**: OFF
   - **Backchannel logout revoke offline sessions**: OFF

## Advanced Settings

### Authentication Flow Overrides
- Leave all as default (browser, direct grant, etc.)

### PKCE (Proof Key for Code Exchange)
- **Proof Key for Code Exchange Code Challenge Method**: `S256` (Recommended for SPAs)

### Token Settings (Fine Tuning)
- **Access Token Lifespan**: 5 minutes (default)
- **Client Session Idle**: 30 minutes
- **Client Session Max**: 10 hours

## React Application Configuration

Update your React Keycloak configuration to handle logout properly:

```typescript
// src/lib/keycloak.ts
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'contrack',
  clientId: 'contrackapi',
});

// Logout function
export const logout = () => {
  keycloak.logout({
    redirectUri: 'http://localhost:5173',
  });
};

export default keycloak;
```

## Session Management

### In Realm Settings > Sessions
- **SSO Session Idle**: 30 minutes
- **SSO Session Max**: 10 hours
- **SSO Session Idle Remember Me**: 0 (disabled)
- **SSO Session Max Remember Me**: 0 (disabled)

### Client Specific Overrides (in your client's Advanced Settings)
- You can override realm defaults if needed

## Testing the Configuration

1. **Login Flow**:
   - Navigate to your React app
   - Click "Sign In"
   - Should redirect to Keycloak login page
   - After login, redirects back to `http://localhost:5173`

2. **Logout Flow**:
   - Click "Sign Out" in your app
   - Should clear local session
   - Redirect to Keycloak logout
   - Then redirect back to `http://localhost:5173`

3. **Session Timeout**:
   - Leave app idle for 30 minutes
   - Next API call should trigger re-authentication

## Security Best Practices

1. **Always use PKCE** for public clients (S256)
2. **Keep access tokens short-lived** (5-15 minutes)
3. **Use refresh tokens** for maintaining sessions
4. **Implement proper CORS** settings
5. **Use HTTPS in production**
6. **Validate tokens** on every API request

## Troubleshooting

### Common Issues:

1. **"Invalid redirect_uri"**:
   - Check Valid Redirect URIs includes your URL
   - Make sure to include the wildcard `/*`

2. **"CORS error"**:
   - Add your origin to Web Origins
   - Use `+` to automatically include all redirect URIs

3. **"Invalid grant"**:
   - Token might be expired
   - Check client authentication is OFF

4. **Logout not working**:
   - Ensure Valid Post Logout Redirect URIs is set
   - Check Front-channel logout is enabled