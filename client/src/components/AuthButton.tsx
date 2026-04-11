import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { getPostAuthCallbackUrl } from "../lib/postAuthCallbackUrl";
import { UserReposPopup } from "./UserReposPopup";

export function AuthButton() {
  const { data: session, isPending } = authClient.useSession();
  const [showRepos, setShowRepos] = useState(false);

  if (isPending) {
    return <div className="sb-bottom-loading" />;
  }

  if (session?.user) {
    return (
      <div className="sb-bottom-user-wrap">
        {showRepos && <UserReposPopup onClose={() => setShowRepos(false)} />}
        <div className="sb-bottom-user">
          <button
            className="sb-bottom-profile"
            onClick={() => setShowRepos((v) => !v)}
            title="View your repositories"
          >
            {session.user.image ? (
              <img src={session.user.image} alt={session.user.name} className="sb-bottom-avatar" />
            ) : (
              <div className="sb-bottom-avatar sb-bottom-avatar--fallback">
                {session.user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="sb-bottom-info">
              <span className="sb-bottom-name">{session.user.name}</span>
              <span className="sb-bottom-email">{session.user.email}</span>
            </div>
          </button>
          <button
            className="sb-bottom-logout"
            onClick={() => authClient.signOut()}
            title="Sign out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      className="sb-bottom-signin"
      onClick={() => {
        const returnTo = getPostAuthCallbackUrl();
        authClient.signIn.social({
          provider: "github",
          callbackURL: returnTo,
          errorCallbackURL: returnTo,
        });
      }}
    >
      <GitHubIcon />
      <span>Sign in with GitHub</span>
    </button>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
