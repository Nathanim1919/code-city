import { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import type { SavedRepoItem } from "../store/useStore";
import { fetchGitHubRepo } from "../parser/githubFetcher";
import { authClient } from "../lib/auth-client";
import { getPostAuthCallbackUrl } from "../lib/postAuthCallbackUrl";
import { parseCodebase } from "../parser/codeParser";

type Tab = "my-repos" | "other" | "new";

export function RepoDrawer({ onClose }: { onClose: () => void }) {
  const loadFiles = useStore((s) => s.loadFiles);
  const setRepoInfo = useStore((s) => s.setRepoInfo);
  const setRepoLoading = useStore((s) => s.setRepoLoading);
  const repos = useStore((s) => s.userRepos);
  const reposLoaded = useStore((s) => s.userReposLoaded);
  const fetchUserRepos = useStore((s) => s.fetchUserRepos);

  const savedRepos = useStore((s) => s.savedRepos);
  const savedReposLoaded = useStore((s) => s.savedReposLoaded);
  const fetchSavedRepos = useStore((s) => s.fetchSavedRepos);
  const saveRepo = useStore((s) => s.saveRepo);
  const deleteSavedRepo = useStore((s) => s.deleteSavedRepo);

  const { data: session, isPending: authPending } = authClient.useSession();

  const [tab, setTab] = useState<Tab>("my-repos");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [visible, setVisible] = useState(false);

  const [repoUrl, setRepoUrl] = useState("");

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
    setError("");
    setRepoLoading(true, "Fetching repository tree...");
    onClose();
    try {
      const files = await fetchGitHubRepo(repo.owner.login, repo.name, undefined, (msg) => setRepoLoading(true, msg));
      if (Object.keys(files).length === 0) { setRepoLoading(false); return; }
      setRepoLoading(true, "Building city...");
      const repoInfo = await fetch(`https://api.github.com/repos/${repo.full_name}`).then((r) => r.json()).catch(() => null);
      const branch = repoInfo?.default_branch || "main";
      setRepoInfo({ owner: repo.owner.login, repo: repo.name, branch });
      loadFiles(files, repo.full_name);
      setRepoLoading(false);
    } catch { setRepoLoading(false); }
  };

  const handleSelectSaved = async (saved: SavedRepoItem) => {
    const key = `${saved.owner}/${saved.repo}`;
    setError("");
    setRepoLoading(true, "Fetching repository tree...");
    onClose();
    try {
      const files = await fetchGitHubRepo(saved.owner, saved.repo, saved.branch, (msg) => setRepoLoading(true, msg));
      if (Object.keys(files).length === 0) { setRepoLoading(false); return; }
      setRepoLoading(true, "Building city...");
      setRepoInfo({ owner: saved.owner, repo: saved.repo, branch: saved.branch });
      loadFiles(files, key);
      saveRepo(saved.owner, saved.repo, saved.branch, saved.displayMeta);
      setRepoLoading(false);
    } catch { setRepoLoading(false); }
  };

  const handleNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = parseGitHubUrl(repoUrl.trim());
    if (!parsed) { setError("Please enter a valid GitHub repo URL (e.g. https://github.com/user/repo)"); return; }
    setRepoLoading(true, "Fetching repository tree...");
    onClose();
    try {
      const files = await fetchGitHubRepo(parsed.owner, parsed.repo, parsed.branch, (msg) => setRepoLoading(true, msg));
      if (Object.keys(files).length === 0) { setRepoLoading(false); return; }
      const fileCount = Object.keys(files).length;
      setRepoLoading(true, `Loaded ${fileCount} files. Building city...`);
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
      setRepoLoading(false);
    } catch (err: any) { setRepoLoading(false); setError(err.message || "Failed to fetch repository. Check the URL and try again."); }
  };

  const switchTab = (t: Tab) => { setTab(t); setFilter(""); setError(""); };

  const loading = (tab === "my-repos" && !reposLoaded) || (tab === "other" && !savedReposLoaded);
  const filtered = filter ? repos.filter((r) => r.full_name.toLowerCase().includes(filter.toLowerCase()) || r.description?.toLowerCase().includes(filter.toLowerCase())) : repos;
  const filteredSaved = filter ? savedRepos.filter((r) => `${r.owner}/${r.repo}`.toLowerCase().includes(filter.toLowerCase()) || r.displayMeta?.description?.toLowerCase().includes(filter.toLowerCase())) : savedRepos;

  const iconBtn = "bg-transparent border-none text-text-muted cursor-pointer p-1.5 rounded-lg flex items-center justify-center transition-all duration-150 hover:text-text-primary hover:bg-white/6";
  const searchBox = "flex items-center gap-2 py-2.5 px-[22px] border-b border-white/4 text-text-muted shrink-0";
  const searchInput = "flex-1 bg-transparent border-none outline-none text-text-primary font-sans text-[0.82rem] placeholder:text-text-muted";
  const repoBtn = "flex flex-col gap-1 w-full py-3 px-[22px] bg-transparent border-none border-b border-white/3 cursor-pointer text-left transition-[background] duration-[120ms] relative text-inherit font-[inherit] hover:bg-white/4";

  return (
    <div
      className={`fixed inset-0 z-200 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-250 ease-out ${visible ? "opacity-100" : "opacity-0"}`}
      onClick={onClose}
    >
      <div
        className={`w-[90vw] max-w-[560px] h-[80vh] max-h-[700px] bg-bg-secondary/60 backdrop-blur-sm border border-white/8 shadow-[0_24px_80px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden transition-transform duration-250 ease-out ${visible ? "translate-y-0 scale-100" : "translate-y-3 scale-[0.97]"}`}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Tabs */}
        <div className="flex justify-between items-center border-b border-white/6">
        <div className="flex items-center gap-1 bg-black">
          {(["my-repos", "other", "new"] as Tab[]).map((t) => (
            <button
              key={t}
              className={`bg-transparent border-r border-white/6 font-sans text-[0.8rem] font-medium py-2.5 px-4 cursor-pointer transition-all duration-150 ${tab === t ? "text-accent border-b-accent bg-black" : "text-text-muted border-b-transparent hover:text-text-secondary"}`}
              onClick={() => switchTab(t)}
            >
              {t === "my-repos" ? "My Repos" : t === "other" ? "Other" : "New"}
            </button>
          ))}
             </div>
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

        {/* ── My Repos tab ── */}
        {tab === "my-repos" && (
          <>
            {!authPending && !session?.user ? (
              <ConnectGitHub />
            ) : (
              <>
                <div className={searchBox}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                  <input type="text" placeholder="Filter repositories..." value={filter} onChange={(e) => setFilter(e.target.value)} className={searchInput} autoFocus />
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-none">
                  {(authPending || loading) && <div className="flex items-center justify-center gap-2 py-8 px-[22px] text-text-muted text-[0.82rem]"><div className="loading-spinner" /><span>Loading repos...</span></div>}
                  {error && <div className="flex items-center justify-center gap-2 py-8 px-[22px] text-danger text-[0.82rem]">{error}</div>}
                  {!authPending && !loading && !error && filtered.length === 0 && <div className="flex items-center justify-center gap-2 py-8 px-[22px] text-text-muted text-[0.82rem]">No repositories found</div>}
                  {!authPending && !loading && filtered.map((repo) => (
                    <button key={repo.id} className={repoBtn} onClick={() => handleSelect(repo)}>
                      <div className="flex items-center gap-2">
                        <span className="text-[0.85rem] font-semibold text-accent">{repo.name}</span>
                        {repo.private && <span className="text-[0.6rem] text-text-muted border border-white/10 px-1.5 py-px rounded">private</span>}
                      </div>
                      {repo.description && <span className="text-[0.72rem] text-text-secondary leading-[1.3] line-clamp-2">{repo.description}</span>}
                      <div className="flex items-center gap-3 mt-0.5">
                        {repo.language && <span className="flex items-center gap-1 text-[0.68rem] text-text-muted"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: langColor(repo.language) }} />{repo.language}</span>}
                        {repo.stargazers_count > 0 && <span className="flex items-center gap-1 text-[0.68rem] text-text-muted"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-[#f59e0b]"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>{repo.stargazers_count}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Other tab ── */}
        {tab === "other" && (
          <>
            {!authPending && !session?.user ? (
              <ConnectGitHub />
            ) : (
              <>
                {savedRepos.length > 0 && (
                  <div className={searchBox}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    <input type="text" placeholder="Filter saved repos..." value={filter} onChange={(e) => setFilter(e.target.value)} className={searchInput} autoFocus />
                  </div>
                )}
                <div className="flex-1 overflow-y-auto scrollbar-none">
                  {(authPending || loading) && <div className="flex items-center justify-center gap-2 py-8 px-[22px] text-text-muted text-[0.82rem]"><div className="loading-spinner" /><span>Loading saved repos...</span></div>}
                  {error && <div className="flex items-center justify-center gap-2 py-8 px-[22px] text-danger text-[0.82rem]">{error}</div>}
                  {!authPending && !loading && !error && filteredSaved.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-15 px-[22px] text-text-muted text-center">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                      <p className="text-[0.9rem] font-semibold text-text-secondary m-0">No saved repos yet</p>
                      <p className="text-[0.78rem] text-text-muted max-w-[280px] leading-[1.4] m-0">Repos you explore via the "New" tab that aren't yours will be saved here automatically.</p>
                    </div>
                  )}
                  {!authPending && !loading && filteredSaved.map((saved) => {
                    const key = `${saved.owner}/${saved.repo}`;
                    return (
                      <div key={saved.id} className="relative flex items-stretch group">
                        <button className={`${repoBtn} flex-1 pr-10`} onClick={() => handleSelectSaved(saved)}>
                          <div className="flex items-center gap-2"><span className="text-[0.85rem] font-semibold text-accent">{key}</span></div>
                          {saved.displayMeta?.description && <span className="text-[0.72rem] text-text-secondary leading-[1.3] line-clamp-2">{saved.displayMeta.description}</span>}
                          <div className="flex items-center gap-3 mt-0.5">
                            {saved.displayMeta?.language && <span className="flex items-center gap-1 text-[0.68rem] text-text-muted"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: langColor(saved.displayMeta.language) }} />{saved.displayMeta.language}</span>}
                            {saved.displayMeta?.stars != null && saved.displayMeta.stars > 0 && <span className="flex items-center gap-1 text-[0.68rem] text-text-muted"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-[#f59e0b]"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>{saved.displayMeta.stars}</span>}
                            {saved.displayMeta?.fileCount != null && <span className="text-[0.68rem] text-text-muted">{saved.displayMeta.fileCount} files</span>}
                            {saved.displayMeta?.loc != null && <span className="text-[0.68rem] text-text-muted">{saved.displayMeta.loc.toLocaleString()} LOC</span>}
                          </div>
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
          </>
        )}

        {/* ── New tab ── */}
        {tab === "new" && (
          <div className="flex-1 flex flex-col items-center justify-center px-7 py-10 overflow-y-auto">
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-accent/[0.08] border border-accent/[0.12] flex items-center justify-center mb-5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>

            {/* Heading */}
            <h3 className="text-[0.95rem] font-semibold text-text-primary m-0 mb-1">Explore a repository</h3>
            <p className="text-[0.76rem] text-text-muted m-0 mb-6 text-center max-w-[280px] leading-[1.45]">
              Paste any public GitHub URL and watch it transform into a 3D city.
            </p>

            {/* Input + button */}
            <form className="flex flex-col gap-3 w-full max-w-[380px]" onSubmit={handleNewSubmit}>
              <div className="relative group">
                <div className="absolute inset-0 rounded-xl bg-accent/[0.06] opacity-0 group-focus-within:opacity-100 -m-px transition-opacity duration-300 pointer-events-none" />
                <div className="relative flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 px-4 transition-all duration-200 focus-within:border-accent/40 focus-within:bg-white/[0.06]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white/20 shrink-0 transition-colors duration-200 group-focus-within:text-accent/50">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="owner/repo or paste full URL"
                    value={repoUrl}
                    onChange={(e) => { setRepoUrl(e.target.value); setError(""); }}
                    className="flex-1 bg-transparent border-none outline-none text-text-primary font-mono text-[0.82rem] placeholder:text-white/20"
                    autoFocus
                  />
                </div>
              </div>
              <button
                type="submit"
                className="flex items-center justify-center gap-2.5 py-3 px-5 bg-accent text-white border-none rounded-xl font-sans text-[0.82rem] font-semibold cursor-pointer transition-all duration-200 hover:brightness-110 hover:shadow-[0_0_20px_rgba(96,165,250,0.2)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
                disabled={!repoUrl.trim()}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
                Build City
              </button>
            </form>

            {error && <p className="text-[0.78rem] text-danger mt-3 m-0 text-center">{error}</p>}

            {/* Suggestions */}
            <div className="mt-8 flex flex-col items-center gap-2.5 w-full max-w-[380px]">
              <span className="text-[0.68rem] text-white/15 uppercase tracking-[0.08em] font-medium">Popular repos to try</span>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { url: "https://github.com/sindresorhus/got", label: "sindresorhus/got" },
                  { url: "https://github.com/tj/commander.js", label: "tj/commander.js" },
                  { url: "https://github.com/expressjs/express", label: "expressjs/express" },
                ].map(({ url, label }) => (
                  <button
                    key={url}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-lg py-1.5 px-3.5 text-white/30 font-mono text-[0.72rem] cursor-pointer transition-all duration-200 hover:bg-accent/[0.08] hover:border-accent/20 hover:text-accent"
                    onClick={() => setRepoUrl(url)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectGitHub() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 py-12">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-white/20">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-[0.9rem] font-semibold text-text-secondary m-0">
          Connect your GitHub
        </p>
        <p className="text-[0.75rem] text-text-muted mt-1.5 m-0 max-w-[240px] leading-[1.45]">
          Sign in to access your repositories and saved explorations.
        </p>
      </div>
      <button
        className="flex items-center justify-center gap-2.5 py-2.5 px-5 bg-white/[0.06] border border-white/[0.1] rounded-xl text-[0.82rem] font-medium text-text-primary cursor-pointer transition-all duration-200 hover:bg-white/[0.1] hover:border-white/[0.18]"
        onClick={() => {
          const returnTo = getPostAuthCallbackUrl();
          authClient.signIn.social({
            provider: "github",
            callbackURL: returnTo,
            errorCallbackURL: returnTo,
          });
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white/70">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
        Sign in with GitHub
      </button>
      <p className="text-[0.68rem] text-text-muted/40 m-0 text-center max-w-[220px] leading-[1.4]">
        Or use the "New" tab to explore any public repo without signing in.
      </p>
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
