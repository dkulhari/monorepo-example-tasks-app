import { Link, useLocation } from "@tanstack/react-router";
import { useKeycloak } from "@react-keycloak/web";
import { logout } from "@/web/lib/keycloak";

export default function AppNavbar() {
  const location = useLocation();
  const { keycloak, initialized } = useKeycloak();
  
  return (
    <nav className="container">
      <ul>
        <li><strong>Tasks App</strong></li>
      </ul>
      <ul>
        {location.pathname !== "/" && (
          <li>
            <Link to="/">Home</Link>
          </li>
        )}
        {initialized && keycloak.authenticated && (
          <>
            <li>
              <p>{keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.email}</p>
            </li>
            <li>
              <button
                type="button"
                className="outline contrast"
                onClick={() => logout()}
              >
                Sign Out
              </button>
            </li>
          </>
        )}
        {initialized && !keycloak.authenticated && (
          <li>
            <button
              type="button"
              className="outline"
              onClick={() => keycloak.login({
                redirectUri: window.location.origin,
              })}
            >
              Sign In
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}
