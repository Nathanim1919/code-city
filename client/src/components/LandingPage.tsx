import { useState } from "react";
import { useStore } from "../store/useStore";
import { fetchGitHubRepo } from "../parser/githubFetcher";
import { AuthButton } from "./AuthButton";

export function LandingPage() {
  const loadFiles = useStore((s) => s.loadFiles);
  const loadSampleProject = useStore((s) => s.loadSampleProject);
  const setRepoInfo = useStore((s) => s.setRepoInfo);
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = parseGitHubUrl(repoUrl.trim());
    if (!parsed) { setError("Please enter a valid GitHub repo URL (e.g. https://github.com/user/repo)"); return; }
    setIsLoading(true);
    setProgress("Fetching repository tree...");
    try {
      const files = await fetchGitHubRepo(parsed.owner, parsed.repo, parsed.branch, (msg) => setProgress(msg));
      if (Object.keys(files).length === 0) { setError("No supported source files found in this repository."); setIsLoading(false); return; }
      setProgress(`Loaded ${Object.keys(files).length} files. Building city...`);
      const repoInfo = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`).then((r) => r.json()).catch(() => null);
      const branch = parsed.branch || repoInfo?.default_branch || "main";
      setRepoInfo({ owner: parsed.owner, repo: parsed.repo, branch });
      loadFiles(files, `${parsed.owner}/${parsed.repo}`);
    } catch (err: any) { setError(err.message || "Failed to fetch repository. Check the URL and try again."); setIsLoading(false); }
  };

  return (
    <div className="w-screen h-screen bg-bg-primary flex items-center justify-center overflow-y-auto py-10 px-5 relative">
      <div className="absolute top-5 right-6 z-10">
        <AuthButton />
      </div>

      <div className="max-w-[560px] w-full flex flex-col items-center gap-6">
        {/* Hero */}
        <div className="text-center mb-2">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-accent font-mono text-[1.8rem] font-bold">{"</>"}</span>
            <h1 className="font-mono text-[2.4rem] font-bold text-text-primary">CodeCity</h1>
          </div>
          <p className="text-text-secondary text-[0.95rem] leading-[1.6] max-w-[460px]">
            Explore any GitHub repository as a 3D city. Files become buildings,
            directories become districts, and dependencies become glowing bridges.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-10 text-text-secondary text-[0.9rem]">
            <div className="loading-spinner" />
            <p>{progress}</p>
          </div>
        ) : (
          <>
            {/* GitHub URL input */}
            <form className="w-full flex flex-col gap-3" onSubmit={handleSubmit}>
              <div className="flex items-center bg-bg-secondary border border-bg-tertiary rounded-xl px-4 transition-[border-color] duration-200 focus-within:border-accent">
                <svg className="text-text-muted shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <input
                  type="text"
                  placeholder="https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={(e) => { setRepoUrl(e.target.value); setError(""); }}
                  className="flex-1 bg-transparent border-none outline-none text-text-primary font-mono text-[0.9rem] py-3.5 px-3"
                  autoFocus
                />
              </div>
              <button type="submit" className="flex items-center justify-center gap-2 py-3 px-6 bg-accent text-[#0f172a] border-none rounded-xl font-sans text-[0.9rem] font-semibold cursor-pointer transition-all duration-200 hover:bg-accent-hover hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed" disabled={!repoUrl.trim()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                Build City
              </button>
            </form>

            {error && <p className="text-danger text-[0.8rem] text-center">{error}</p>}

            {/* Example repos */}
            <div className="w-full text-center">
              <p className="text-text-muted text-[0.75rem] mb-2 uppercase tracking-[0.05em]">Try these:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["https://github.com/sindresorhus/got", "https://github.com/tj/commander.js", "https://github.com/expressjs/express"].map((url) => (
                  <button key={url} className="bg-bg-secondary border border-bg-tertiary text-accent font-mono text-[0.75rem] py-1.5 px-3 rounded-lg cursor-pointer transition-all duration-150 hover:bg-bg-tertiary hover:border-accent" onClick={() => setRepoUrl(url)}>
                    {url.replace("https://github.com/", "")}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="w-full flex items-center gap-4 text-text-muted text-[0.75rem] before:content-[''] before:flex-1 before:h-px before:bg-bg-tertiary after:content-[''] after:flex-1 after:h-px after:bg-bg-tertiary">
              <span>or</span>
            </div>

            {/* Demo button */}
            <button className="flex items-center gap-2 py-2.5 px-6 bg-transparent text-text-secondary border border-bg-tertiary rounded-xl text-[0.85rem] cursor-pointer transition-all duration-200 hover:bg-bg-secondary hover:border-text-muted hover:text-text-primary" onClick={loadSampleProject}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Explore Demo Project
            </button>
            <p className="text-text-muted text-[0.7rem] text-center">See a sample codebase with 20+ files to get a feel for CodeCity</p>
          </>
        )}

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 w-full mt-4 pt-6 border-t border-bg-tertiary">
          <div className="text-center py-4 px-2">
            <div className="text-accent mb-2.5 flex justify-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg></div>
            <h3 className="text-[0.8rem] font-semibold mb-1.5 text-text-primary">Files = Buildings</h3>
            <p className="text-[0.7rem] text-text-muted leading-[1.4]">Height shows complexity, width shows lines of code, color shows language</p>
          </div>
          <div className="text-center py-4 px-2">
            <div className="text-accent mb-2.5 flex justify-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg></div>
            <h3 className="text-[0.8rem] font-semibold mb-1.5 text-text-primary">Imports = Bridges</h3>
            <p className="text-[0.7rem] text-text-muted leading-[1.4]">Glowing arcs connect files that depend on each other</p>
          </div>
          <div className="text-center py-4 px-2">
            <div className="text-accent mb-2.5 flex justify-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg></div>
            <h3 className="text-[0.8rem] font-semibold mb-1.5 text-text-primary">Search & Navigate</h3>
            <p className="text-[0.7rem] text-text-muted leading-[1.4]">Find any file or function and fly to it in the 3D city</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function parseGitHubUrl(url: string): { owner: string; repo: string; branch?: string } | null {
  let cleaned = url.replace(/\/$/, "");
  const urlMatch = cleaned.match(/(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+?)(?:\/tree\/([^/]+))?(?:\.git)?$/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2], branch: urlMatch[3] };
  const shortMatch = cleaned.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
  return null;
}
