import { useState, useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { fetchGitHubRepo } from "../parser/githubFetcher";

interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string };
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  private: boolean;
}

export function UserReposPopup({ onClose }: { onClose: () => void }) {
  const loadFiles = useStore((s) => s.loadFiles);
  const setRepoInfo = useStore((s) => s.setRepoInfo);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRepo, setLoadingRepo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";

  useEffect(() => {
    fetch(`${apiBase}/api/github/repos`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch repos");
        return r.json();
      })
      .then((data) => {
        setRepos(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid the click that opened the popup from closing it
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSelect = async (repo: GitHubRepo) => {
    setLoadingRepo(repo.full_name);
    try {
      const files = await fetchGitHubRepo(repo.owner.login, repo.name);

      if (Object.keys(files).length === 0) {
        setError(`No supported source files found in ${repo.full_name}`);
        setLoadingRepo(null);
        return;
      }

      const repoInfo = await fetch(`https://api.github.com/repos/${repo.full_name}`)
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

  const filtered = filter
    ? repos.filter(
        (r) =>
          r.full_name.toLowerCase().includes(filter.toLowerCase()) ||
          r.description?.toLowerCase().includes(filter.toLowerCase())
      )
    : repos;

  return (
    <div className="urp" ref={popupRef}>
      <div className="urp-header">
        <span className="urp-title">Your Repositories</span>
        <button className="urp-close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Search filter */}
      <div className="urp-search">
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

      {/* Repo list */}
      <div className="urp-list">
        {loading && (
          <div className="urp-state">
            <div className="loading-spinner" />
            <span>Loading repos...</span>
          </div>
        )}

        {error && !loading && <div className="urp-state urp-error">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="urp-state">No repositories found</div>
        )}

        {filtered.map((repo) => (
          <button
            key={repo.id}
            className={`urp-repo ${loadingRepo === repo.full_name ? "urp-repo--loading" : ""}`}
            onClick={() => handleSelect(repo)}
            disabled={!!loadingRepo}
          >
            <div className="urp-repo-top">
              <span className="urp-repo-name">{repo.name}</span>
              {repo.private && <span className="urp-repo-badge">private</span>}
            </div>
            {repo.description && (
              <span className="urp-repo-desc">{repo.description}</span>
            )}
            <div className="urp-repo-meta">
              {repo.language && (
                <span className="urp-repo-lang">
                  <span className="urp-lang-dot" style={{ background: langColor(repo.language) }} />
                  {repo.language}
                </span>
              )}
              {repo.stargazers_count > 0 && (
                <span className="urp-repo-stars">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {repo.stargazers_count}
                </span>
              )}
            </div>
            {loadingRepo === repo.full_name && (
              <div className="urp-repo-progress">
                <div className="loading-spinner" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
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
