import { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import type { SavedRepoItem } from "../store/useStore";
import { fetchGitHubRepo } from "../parser/githubFetcher";
import { authClient } from "../lib/auth-client";
import { parseCodebase } from "../parser/codeParser";

type Tab = "my-repos" | "other" | "new";

export function RepoDrawer({ onClose }: { onClose: () => void }) {
  const loadFiles = useStore((s) => s.loadFiles);
  const setRepoInfo = useStore((s) => s.setRepoInfo);
  const repos = useStore((s) => s.userRepos);
  const reposLoaded = useStore((s) => s.userReposLoaded);
  const fetchUserRepos = useStore((s) => s.fetchUserRepos);

  const savedRepos = useStore((s) => s.savedRepos);
  const savedReposLoaded = useStore((s) => s.savedReposLoaded);
  const fetchSavedRepos = useStore((s) => s.fetchSavedRepos);
  const saveRepo = useStore((s) => s.saveRepo);
  const deleteSavedRepo = useStore((s) => s.deleteSavedRepo);

  const { data: session } = authClient.useSession();

  const [tab, setTab] = useState<Tab>("my-repos");
  const [loadingRepo, setLoadingRepo] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [visible, setVisible] = useState(false);

  const [repoUrl, setRepoUrl] = useState("");
  const [newLoading, setNewLoading] = useState(false);
  const [newProgress, setNewProgress] = useState("");

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (tab === "my-repos" && !reposLoaded) fetchUserRepos();
    if (tab === "other" && !savedReposLoaded) fetchSavedRepos();
  }, [tab, reposLoaded, savedReposLoaded, fetchUserRepos, fetchSavedRepos]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError("");
    if (tab === "my-repos") await fetchUserRepos(true);
    if (tab === "other") await fetchSavedRepos(true);
    setRefreshing(false);
  };

  const handleSelect = async (repo: { full_name: string; owner: { login: string }; name: string }) => {
    setLoadingRepo(repo.full_name);
    setError("");
    try {
      const files = await fetchGitHubRepo(repo.owner.login, repo.name);
      if (Object.keys(files).length === 0) { setError(`No supported source files found in ${repo.full_name}`); setLoadingRepo(null); return; }
      const repoInfo = await fetch(`https://api.github.com/repos/${repo.full_name}`).then((r) => r.json()).catch(() => null);
      const branch = repoInfo?.default_branch || "main";
      setRepoInfo({ owner: repo.owner.login, repo: repo.name, branch });
      loadFiles(files, repo.full_name);
      onClose();
    } catch (err: any) { setError(err.message || "Failed to load repo"); setLoadingRepo(null); }
  };

  const handleSelectSaved = async (saved: SavedRepoItem) => {
    const key = `${saved.owner}/${saved.repo}`;
    setLoadingRepo(key);
    setError("");
    try {
      const files = await fetchGitHubRepo(saved.owner, saved.repo, saved.branch);
      if (Object.keys(files).length === 0) { setError(`No supported source files found in ${key}`); setLoadingRepo(null); return; }
      setRepoInfo({ owner: saved.owner, repo: saved.repo, branch: saved.branch });
      loadFiles(files, key);
      saveRepo(saved.owner, saved.repo, saved.branch, saved.displayMeta);
      onClose();
    } catch (err: any) { setError(err.message || "Failed to load repo"); setLoadingRepo(null); }
  };

  const handleNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = parseGitHubUrl(repoUrl.trim());
    if (!parsed) { setError("Please enter a valid GitHub repo URL (e.g. https://github.com/user/repo)"); return; }
    setNewLoading(true);
    setNewProgress("Fetching repository tree...");
    try {
      const files = await fetchGitHubRepo(parsed.owner, parsed.repo, parsed.branch, (msg) => setNewProgress(msg));
      if (Object.keys(files).length === 0) { setError("No supported source files found in this repository."); setNewLoading(false); return; }
      const fileCount = Object.keys(files).length;
      setNewProgress(`Loaded ${fileCount} files. Building city...`);
      const ghInfo = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`).then((r) => r.json()).catch(() => null);
      const branch = parsed.branch || ghInfo?.default_branch || "main";
      setRepoInfo({ owner: parsed.owner, repo: parsed.repo, branch });
      const graph = parseCodebase(files, `${parsed.owner}/${parsed.repo}`);
      const totalLoc = graph.nodes.reduce((sum, n) => sum + n.loc, 0);
      const isOwnRepo = repos.some((r) => r.owner.login.toLowerCase() === parsed.owner.toLowerCase() && r.name.toLowerCase() === parsed.repo.toLowerCase());
      if (session?.user && !isOwnRepo) {
        saveRepo(parsed.owner, parsed.repo, branch, { description: ghInfo?.description || undefined, language: ghInfo?.language || undefined, stars: ghInfo?.stargazers_count || 0, fileCount, loc: totalLoc });
      }
      loadFiles(files, `${parsed.owner}/${parsed.repo}`);
      onClose();
    } catch (err: any) { setError(err.message || "Failed to fetch repository. Check the URL and try again."); setNewLoading(false); }
  };

  const switchTab = (t: Tab) => { setTab(t); setFilter(""); setError(""); };

  const loading = (tab === "my-repos" && !reposLoaded) || (tab === "other" && !savedReposLoaded);
  const filtered = filter ? repos.filter((r) => r.full_name.toLowerCase().includes(filter.toLowerCase()) || r.description?.toLowerCase().includes(filter.toLowerCase())) : repos;
  const filteredSaved = filter ? savedRepos.filter((r) => `${r.owner}/${r.repo}`.toLowerCase().includes(filter.toLowerCase()) || r.displayMeta?.description?.toLowerCase().includes(filter.toLowerCase())) : savedRepos;

  const iconBtn = "bg-transparent border-none text-text-muted cursor-pointer p-1.5 rounded-lg flex items-center justify-center transition-all duration-150 hover:text-text-primary hover:bg-white/6";
  const searchBox = "flex items-center gap-2 py-2.5 px-[22px] border-b border-white/4 text-text-muted shrink-0";
  const searchInput = "flex-1 bg-transparent border-none outline-none text-text-primary font-sans text-[0.82rem] placeholder:text-text-muted";
  const repoBtn = (isLoading: boolean) => `flex flex-col gap-1 w-full py-3 px-[22px] bg-transparent border-none border-b border-white/3 cursor-pointer text-left transition-[background] duration-[120ms] relative text-inherit font-[inherit] hover:bg-white/4 ${isLoading ? "opacity-50 pointer-events-none" : ""}`;

  return (
    <div
      className={`fixed inset-0 z-200 flex items-center justify-center bg-black/70 backdrop-blur-[8px] transition-opacity duration-[250ms] ease-out ${visible ? "opacity-100" : "opacity-0"}`}
      onClick={onClose}
    >
      <div
        className={`w-[90vw] max-w-[560px] h-[80vh] max-h-[700px] bg-bg-secondary border border-white/8 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden transition-transform duration-[250ms] ease-out ${visible ? "translate-y-0 scale-100" : "translate-y-3 scale-[0.97]"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pt-[18px] pb-3.5 px-[22px] shrink-0">
          <h2 className="text-base font-bold text-text-primary m-0">Repositories</h2>
          <div className="flex items-center gap-1">
            {(tab === "my-repos" || tab === "other") && (
              <button className={`${iconBtn} ${refreshing ? "[&_svg]:animate-spin" : ""}`} onClick={handleRefresh} title="Refresh" disabled={refreshing}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </button>
            )}
            <button className={iconBtn} onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-[22px] border-b border-white/6 shrink-0">
          {(["my-repos", "other", "new"] as Tab[]).map((t) => (
            <button
              key={t}
              className={`bg-transparent border-none border-b-2 font-sans text-[0.8rem] font-medium py-2.5 px-4 cursor-pointer transition-all duration-150 ${tab === t ? "text-accent border-b-accent" : "text-text-muted border-b-transparent hover:text-text-secondary"}`}
              onClick={() => switchTab(t)}
            >
              {t === "my-repos" ? "My Repos" : t === "other" ? "Other" : "New"}
            </button>
          ))}
        </div>

        {/* ── My Repos tab ── */}
        {tab === "my-repos" && (
          <>
            <div className={searchBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input type="text" placeholder="Filter repositories..." value={filter} onChange={(e) => setFilter(e.target.value)} className={searchInput} autoFocus />
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-none">
              {loading && <div className="flex items-center justify-center gap-2 py-8 px-[22px] text-text-muted text-[0.82rem]"><div className="loading-spinner" /><span>Loading repos...</span></div>}
              {error && <div className="flex items-center justify-center gap-2 py-8 px-[22px] text-danger text-[0.82rem]">{error}</div>}
              {!loading && !error && filtered.length === 0 && <div className="flex items-center justify-center gap-2 py-8 px-[22px] text-text-muted text-[0.82rem]">No repositories found</div>}
              {!loading && filtered.map((repo) => (
                <button key={repo.id} className={repoBtn(loadingRepo === repo.full_name)} onClick={() => handleSelect(repo)} disabled={!!loadingRepo}>
                  <div className="flex items-center gap-2">
                    <span className="text-[0.85rem] font-semibold text-accent">{repo.name}</span>
                    {repo.private && <span className="text-[0.6rem] text-text-muted border border-white/10 px-1.5 py-px rounded">private</span>}
                  </div>
                  {repo.description && <span className="text-[0.72rem] text-text-secondary leading-[1.3] line-clamp-2">{repo.description}</span>}
                  <div className="flex items-center gap-3 mt-0.5">
                    {repo.language && <span className="flex items-center gap-1 text-[0.68rem] text-text-muted"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: langColor(repo.language) }} />{repo.language}</span>}
                    {repo.stargazers_count > 0 && <span className="flex items-center gap-1 text-[0.68rem] text-text-muted"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-[#f59e0b]"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>{repo.stargazers_count}</span>}
                  </div>
                  {loadingRepo === repo.full_name && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><div className="loading-spinner" /></div>}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Other tab ── */}
        {tab === "other" && (
          <>
            {savedRepos.length > 0 && (
              <div className={searchBox}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                <input type="text" placeholder="Filter saved repos..." value={filter} onChange={(e) => setFilter(e.target.value)} className={searchInput} autoFocus />
              </div>
            )}
            <div className="flex-1 overflow-y-auto scrollbar-none">
              {loading && <div className="flex items-center justify-center gap-2 py-8 px-[22px] text-text-muted text-[0.82rem]"><div className="loading-spinner" /><span>Loading saved repos...</span></div>}
              {error && <div className="flex items-center justify-center gap-2 py-8 px-[22px] text-danger text-[0.82rem]">{error}</div>}
              {!loading && !error && filteredSaved.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-15 px-[22px] text-text-muted text-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                  <p className="text-[0.9rem] font-semibold text-text-secondary m-0">No saved repos yet</p>
                  <p className="text-[0.78rem] text-text-muted max-w-[280px] leading-[1.4] m-0">Repos you explore via the "New" tab that aren't yours will be saved here automatically.</p>
                </div>
              )}
              {!loading && filteredSaved.map((saved) => {
                const key = `${saved.owner}/${saved.repo}`;
                return (
                  <div key={saved.id} className="relative flex items-stretch group">
                    <button className={`${repoBtn(loadingRepo === key)} flex-1 pr-10`} onClick={() => handleSelectSaved(saved)} disabled={!!loadingRepo}>
                      <div className="flex items-center gap-2"><span className="text-[0.85rem] font-semibold text-accent">{key}</span></div>
                      {saved.displayMeta?.description && <span className="text-[0.72rem] text-text-secondary leading-[1.3] line-clamp-2">{saved.displayMeta.description}</span>}
                      <div className="flex items-center gap-3 mt-0.5">
                        {saved.displayMeta?.language && <span className="flex items-center gap-1 text-[0.68rem] text-text-muted"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: langColor(saved.displayMeta.language) }} />{saved.displayMeta.language}</span>}
                        {saved.displayMeta?.stars != null && saved.displayMeta.stars > 0 && <span className="flex items-center gap-1 text-[0.68rem] text-text-muted"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-[#f59e0b]"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>{saved.displayMeta.stars}</span>}
                        {saved.displayMeta?.fileCount != null && <span className="text-[0.68rem] text-text-muted">{saved.displayMeta.fileCount} files</span>}
                        {saved.displayMeta?.loc != null && <span className="text-[0.68rem] text-text-muted">{saved.displayMeta.loc.toLocaleString()} LOC</span>}
                      </div>
                      {loadingRepo === key && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><div className="loading-spinner" /></div>}
                    </button>
                    <button className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none text-text-muted cursor-pointer p-1.5 rounded-md flex items-center justify-center opacity-0 transition-all duration-150 group-hover:opacity-100 hover:text-danger hover:bg-danger/10" onClick={() => deleteSavedRepo(saved.id)} title="Remove">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── New tab ── */}
        {tab === "new" && (
          <div className="flex-1 flex flex-col py-7 px-[22px] overflow-y-auto">
            {newLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-muted text-[0.82rem]">
                <div className="loading-spinner" />
                <p>{newProgress}</p>
              </div>
            ) : (
              <>
                <p className="text-[0.82rem] text-text-muted m-0 mb-5 leading-[1.4]">Paste a GitHub repository URL to visualize it as a city.</p>
                <form className="flex flex-col gap-3" onSubmit={handleNewSubmit}>
                  <div className="flex items-center gap-2.5 bg-white/4 border border-white/8 rounded-[10px] py-2.5 px-3.5 transition-[border-color] duration-150 focus-within:border-accent">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted shrink-0">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <input type="text" placeholder="https://github.com/owner/repo" value={repoUrl} onChange={(e) => { setRepoUrl(e.target.value); setError(""); }} className="flex-1 bg-transparent border-none outline-none text-text-primary font-sans text-[0.85rem] placeholder:text-text-muted" autoFocus />
                  </div>
                  <button type="submit" className="flex items-center justify-center gap-2 py-2.5 px-[18px] bg-accent text-white border-none rounded-[10px] font-sans text-[0.82rem] font-semibold cursor-pointer transition-opacity duration-150 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed" disabled={!repoUrl.trim()}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                    Build City
                  </button>
                </form>
                {error && <p className="text-[0.78rem] text-danger mt-2">{error}</p>}
                <div className="mt-6">
                  <p className="text-[0.72rem] text-text-muted m-0 mb-2 uppercase tracking-[0.04em]">Try these:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["https://github.com/sindresorhus/got", "https://github.com/tj/commander.js", "https://github.com/expressjs/express"].map((url) => (
                      <button key={url} className="bg-white/4 border border-white/8 rounded-lg py-1.5 px-3 text-text-secondary font-mono text-[0.72rem] cursor-pointer transition-all duration-150 hover:bg-[rgba(96,165,250,0.1)] hover:border-accent hover:text-accent" onClick={() => setRepoUrl(url)}>
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
  const urlMatch = cleaned.match(/(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+?)(?:\/tree\/([^/]+))?(?:\.git)?$/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2], branch: urlMatch[3] };
  const shortMatch = cleaned.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
  return null;
}

function langColor(lang: string): string {
  const colors: Record<string, string> = { TypeScript: "#3178c6", JavaScript: "#f7df1e", Python: "#3776ab", Go: "#00add8", Rust: "#dea584", Java: "#b07219", "C++": "#f34b7d", C: "#555555", Ruby: "#701516", PHP: "#4F5D95", Swift: "#F05138", Kotlin: "#A97BFF", HTML: "#e34c26", CSS: "#563d7c", Shell: "#89e051" };
  return colors[lang] || "#8b8b8b";
}
