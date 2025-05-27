import Keycloak from "keycloak-js";

let keycloakInstance: Keycloak | null = null;
let isInitialized = false;

function createKeycloakInstance() {
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak({
      url: "http://localhost:8080",
      realm: "contrack",
      clientId: "contrackapi",
    });

    // Override the init method to prevent multiple initializations
    const originalInit = keycloakInstance.init.bind(keycloakInstance);
    keycloakInstance.init = function (options) {
      if (isInitialized) {
        return Promise.resolve(this.authenticated || false);
      }
      isInitialized = true;
      return originalInit(options);
    };
  }
  return keycloakInstance;
}

const keycloak = createKeycloakInstance();

// Configure init options
export const keycloakInitOptions = {
  onLoad: "check-sso" as const,
  silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
  pkceMethod: "S256" as const,
  checkLoginIframe: false, // Disable for development
};

// Logout function with proper redirect
export const logout = () => {
  keycloak.logout({
    redirectUri: window.location.origin,
  });
};

export default keycloak;
