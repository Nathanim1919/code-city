import { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { fetchGitHubRepo } from "../parser/githubFetcher";

type Tab = "my-repos" | "other" | "new";

export function RepoDrawer({ onClose }: { onClose: () => void }) {
  const loadFiles = useStore((s) => s.loadFiles);
  const setRepoInfo = useStore((s) => s.setRepoInfo);
  const repos = useStore((s) => s.userRepos);
  const reposLoaded = useStore((s) => s.userReposLoaded);
  const fetchUserRepos = useStore((s) => s.fetchUserRepos);

  const [tab, setTab] = useState<Tab>("my-repos");
  const [loadingRepo, setLoadingRepo] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [visible, setVisible] = useState(false);

  // New repo tab state
  const [repoUrl, setRepoUrl] = useState("");
  const [newLoading, setNewLoading] = useState(false);
  const [newProgress, setNewProgress] = useState("");

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (tab === "my-repos" && !reposLoaded) {
      fetchUserRepos();
    }
  }, [tab, reposLoaded, fetchUserRepos]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError("");
    await fetchUserRepos(true);
    setRefreshing(false);
  };

  const handleSelect = async (repo: {
    full_name: string;
    owner: { login: string };
    name: string;
  }) => {
    setLoadingRepo(repo.full_name);
    setError("");
    try {
      const files = await fetchGitHubRepo(repo.owner.login, repo.name);
      if (Object.keys(files).length === 0) {
        setError(`No supported source files found in ${repo.full_name}`);
        setLoadingRepo(null);
        return;
      }
      const repoInfo = await fetch(
        `https://api.github.com/repos/${repo.full_name}`
      )
        .then((r) => r.json())
        .catch(() => null);
      const branch = repoInfo?.default_branch || "main";
      setRepoInfo({ owner: repo.owner.login, repo: repo.name, branch });
      loadFiles(files, repo.full_name);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to load repo");
      setLoadingRepo(null);
    }
  };

  const handleNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsed = parseGitHubUrl(repoUrl.trim());
    if (!parsed) {
      setError("Please enter a valid GitHub repo URL (e.g. https://github.com/user/repo)");
      return;
    }

    setNewLoading(true);
    setNewProgress("Fetching repository tree...");

    try {
      const files = await fetchGitHubRepo(
        parsed.owner,
        parsed.repo,
        parsed.branch,
        (msg) => setNewProgress(msg)
      );

      if (Object.keys(files).length === 0) {
        setError("No supported source files found in this repository.");
        setNewLoading(false);
        return;
      }

      setNewProgress(`Loaded ${Object.keys(files).length} files. Building city...`);

      const repoInfo = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`
      )
        .then((r) => r.json())
        .catch(() => null);
      const branch = parsed.branch || repoInfo?.default_branch || "main";
      setRepoInfo({ owner: parsed.owner, repo: parsed.repo, branch });

      loadFiles(files, `${parsed.owner}/${parsed.repo}`);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to fetch repository. Check the URL and try again.");
      setNewLoading(false);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setFilter("");
    setError("");
  };

  const loading = tab === "my-repos" && !reposLoaded;

  const filtered = filter
    ? repos.filter(
        (r) =>
          r.full_name.toLowerCase().includes(filter.toLowerCase()) ||
          r.description?.toLowerCase().includes(filter.toLowerCase())
      )
    : repos;

  return (
    <div
      className={`rd-overlay ${visible ? "rd-overlay--in" : ""}`}
      onClick={onClose}
    >
      <div className="rd-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rd-header">
          <h2 className="rd-title">Repositories</h2>
          <div className="rd-header-actions">
            {tab === "my-repos" && (
              <button
                className={`rd-icon-btn ${refreshing ? "rd-icon-btn--spin" : ""}`}
                onClick={handleRefresh}
                title="Refresh repos"
                disabled={refreshing}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </button>
            )}
            <button className="rd-icon-btn" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="rd-tabs">
          <button
            className={`rd-tab ${tab === "my-repos" ? "rd-tab--active" : ""}`}
            onClick={() => switchTab("my-repos")}
          >
            My Repos
          </button>
          <button
            className={`rd-tab ${tab === "other" ? "rd-tab--active" : ""}`}
            onClick={() => switchTab("other")}
          >
            Other
          </button>
          <button
            className={`rd-tab ${tab === "new" ? "rd-tab--active" : ""}`}
            onClick={() => switchTab("new")}
          >
            New
          </button>
        </div>

        {/* ── My Repos tab ── */}
        {tab === "my-repos" && (
          <>
            <div className="rd-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Filter repositories..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                autoFocus
              />
            </div>

            <div className="rd-list">
              {loading && (
                <div className="rd-state">
                  <div className="loading-spinner" />
                  <span>Loading repos...</span>
                </div>
              )}

              {error && <div className="rd-state rd-error">{error}</div>}

              {!loading && !error && filtered.length === 0 && (
                <div className="rd-state">No repositories found</div>
              )}

              {!loading &&
                filtered.map((repo) => (
                  <button
                    key={repo.id}
                    className={`rd-repo ${loadingRepo === repo.full_name ? "rd-repo--loading" : ""}`}
                    onClick={() => handleSelect(repo)}
                    disabled={!!loadingRepo}
                  >
                    <div className="rd-repo-top">
                      <span className="rd-repo-name">{repo.name}</span>
                      {repo.private && <span className="rd-repo-badge">private</span>}
                    </div>
                    {repo.description && (
                      <span className="rd-repo-desc">{repo.description}</span>
                    )}
                    <div className="rd-repo-meta">
                      {repo.language && (
                        <span className="rd-repo-lang">
                          <span className="rd-lang-dot" style={{ background: langColor(repo.language) }} />
                          {repo.language}
                        </span>
                      )}
                      {repo.stargazers_count > 0 && (
                        <span className="rd-repo-stars">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          {repo.stargazers_count}
                        </span>
                      )}
                    </div>
                    {loadingRepo === repo.full_name && (
                      <div className="rd-repo-progress">
                        <div className="loading-spinner" />
                      </div>
                    )}
                  </button>
                ))}
            </div>
          </>
        )}

        {/* ── Other tab (placeholder) ── */}
        {tab === "other" && (
          <div className="rd-list">
            <div className="rd-other-placeholder">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <p className="rd-other-title">Saved Repositories</p>
              <p className="rd-other-desc">
                Repos you've explored that aren't yours will appear here.
              </p>
              <span className="rd-other-badge">Coming soon</span>
            </div>
          </div>
        )}

        {/* ── New tab ── */}
        {tab === "new" && (
          <div className="rd-new">
            {newLoading ? (
              <div className="rd-new-loading">
                <div className="loading-spinner" />
                <p>{newProgress}</p>
              </div>
            ) : (
              <>
                <p className="rd-new-desc">
                  Paste a GitHub repository URL to visualize it as a city.
                </p>
                <form className="rd-new-form" onSubmit={handleNewSubmit}>
                  <div className="rd-new-input-wrap">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="rd-new-gh-icon">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <input
                      type="text"
                      className="rd-new-input"
                      placeholder="https://github.com/owner/repo"
                      value={repoUrl}
                      onChange={(e) => { setRepoUrl(e.target.value); setError(""); }}
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="rd-new-submit" disabled={!repoUrl.trim()}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    Build City
                  </button>
                </form>

                {error && <p className="rd-new-error">{error}</p>}

                <div className="rd-new-examples">
                  <p className="rd-new-examples-label">Try these:</p>
                  <div className="rd-new-examples-list">
                    {[
                      "https://github.com/sindresorhus/got",
                      "https://github.com/tj/commander.js",
                      "https://github.com/expressjs/express",
                    ].map((url) => (
                      <button
                        key={url}
                        className="rd-new-example"
                        onClick={() => setRepoUrl(url)}
                      >
                        {url.replace("https://github.com/", "")}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function parseGitHubUrl(url: string): { owner: string; repo: string; branch?: string } | null {
  const cleaned = url.replace(/\/$/, "");

  const urlMatch = cleaned.match(
    /(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+?)(?:\/tree\/([^/]+))?(?:\.git)?$/
  );
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2], branch: urlMatch[3] };
  }

  const shortMatch = cleaned.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }

  return null;
}

function langColor(lang: string): string {
  const colors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f7df1e",
    Python: "#3776ab",
    Go: "#00add8",
    Rust: "#dea584",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    Ruby: "#701516",
    PHP: "#4F5D95",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Shell: "#89e051",
  };
  return colors[lang] || "#8b8b8b";
}
