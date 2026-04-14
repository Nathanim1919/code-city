import { useState, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useStore } from "../store/useStore";
import { fetchGitHubRepo } from "../parser/githubFetcher";
import { LoadingScene } from "./LoadingCity";
import { authClient } from "../lib/auth-client";
import { getPostAuthCallbackUrl } from "../lib/postAuthCallbackUrl";

const AUTH_RETURN_KEY = "codecity_auth_return";

// Slowly auto-rotating camera wrapper
function AutoRotateScene() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = 0.4;
      controlsRef.current.update();
    }
  });

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
        autoRotate
        autoRotateSpeed={0.4}
      />
      <LoadingScene />
    </>
  );
}

export function LandingPage() {
  const loadFiles = useStore((s) => s.loadFiles);
  const loadSampleProject = useStore((s) => s.loadSampleProject);
  const setRepoInfo = useStore((s) => s.setRepoInfo);
  const setRepoLoading = useStore((s) => s.setRepoLoading);
  const dismissLanding = useStore((s) => s.dismissLanding);
  const { data: session } = authClient.useSession();

  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState("");

  // After OAuth redirect: if user is now authenticated, load demo and enter city
  useEffect(() => {
    if (session?.user && sessionStorage.getItem(AUTH_RETURN_KEY)) {
      sessionStorage.removeItem(AUTH_RETURN_KEY);
      handleDemo();
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = parseGitHubUrl(repoUrl.trim());
    if (!parsed) {
      setError("Enter a valid GitHub URL or owner/repo");
      return;
    }
    dismissLanding();
    setRepoLoading(true, "Fetching repository tree...");
    try {
      const files = await fetchGitHubRepo(parsed.owner, parsed.repo, parsed.branch, (msg) => setRepoLoading(true, msg));
      if (Object.keys(files).length === 0) {
        setRepoLoading(false);
        return;
      }
      setRepoLoading(true, "Building city...");
      const ghInfo = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`).then((r) => r.json()).catch(() => null);
      const branch = parsed.branch || ghInfo?.default_branch || "main";
      setRepoInfo({ owner: parsed.owner, repo: parsed.repo, branch });
      loadFiles(files, `${parsed.owner}/${parsed.repo}`);
      setRepoLoading(false);
    } catch {
      setRepoLoading(false);
    }
  };

  const handleDemo = () => {
    dismissLanding();
    loadSampleProject();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* 3D Background */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [22, 16, 22], fov: 50, near: 0.1, far: 300 }}
          style={{ background: "#000000" }}
          gl={{ antialias: true }}
        >
          <AutoRotateScene />
        </Canvas>
      </div>

      {/* Gradient overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5 z-10">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[0.8rem] font-bold text-accent bg-accent/[0.08] border border-accent/[0.12] w-8 h-8 flex items-center justify-center rounded-lg select-none">
            {"</>"}
          </span>
          <span className="font-mono text-[0.9rem] font-bold text-white/80 tracking-[-0.01em]">
            CodeCity
          </span>
        </div>
        {!session?.user ? (
          <button
            className="flex items-center gap-2 py-2 px-4 bg-white/[0.06] border border-white/[0.1] rounded-lg text-[0.78rem] font-medium text-white/70 cursor-pointer transition-all duration-200 hover:bg-white/[0.1] hover:text-white/90"
            onClick={() => {
              sessionStorage.setItem(AUTH_RETURN_KEY, "1");
              const returnTo = getPostAuthCallbackUrl();
              authClient.signIn.social({ provider: "github", callbackURL: returnTo, errorCallbackURL: returnTo });
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="opacity-60">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Sign in
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            {session.user.image && (
              <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
            )}
            <span className="text-[0.78rem] text-white/60">{session.user.name}</span>
          </div>
        )}
      </div>

      {/* Hero content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">
        <div className="flex flex-col items-center max-w-[520px] w-full">
          {/* Badge */}
          <div className="flex items-center gap-2 py-1.5 px-4 rounded-full border border-white/[0.08] bg-white/[0.03] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[0.7rem] text-white/40 font-medium tracking-wide">Open source codebase visualizer</span>
          </div>

          {/* Heading */}
          <h1 className="text-[3.2rem] font-bold text-white text-center leading-[1.05] tracking-[-0.03em] m-0 mb-4">
            See your code
            <br />
            <span className="bg-gradient-to-r from-accent via-[#818cf8] to-[#c084fc] bg-clip-text text-transparent">
              as a city
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-[1rem] text-white/40 text-center leading-[1.6] m-0 mb-8 max-w-[420px]">
            Turn any GitHub repository into an interactive 3D city. Files become buildings. Directories become districts. Imports become glowing bridges.
          </p>

          {/* Input */}
          <form className="w-full flex flex-col gap-3 mb-4" onSubmit={handleSubmit}>
            <div className="relative group">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-accent/20 via-[#818cf8]/20 to-[#c084fc]/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm pointer-events-none" />
              <div className="relative flex items-center gap-3 bg-white/[0.05] border border-white/[0.1] rounded-2xl py-3.5 px-5 backdrop-blur-sm transition-all duration-300 focus-within:border-white/[0.2] focus-within:bg-white/[0.07]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white/15 shrink-0 transition-colors duration-300 group-focus-within:text-accent/50">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <input
                  type="text"
                  placeholder="owner/repo or paste a GitHub URL"
                  value={repoUrl}
                  onChange={(e) => { setRepoUrl(e.target.value); setError(""); }}
                  className="flex-1 bg-transparent border-none outline-none text-white font-mono text-[0.88rem] placeholder:text-white/20"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!repoUrl.trim()}
                  className="shrink-0 py-2 px-5 bg-accent text-white border-none rounded-xl font-sans text-[0.8rem] font-semibold cursor-pointer transition-all duration-200 hover:brightness-110 hover:shadow-[0_0_24px_rgba(96,165,250,0.25)] disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  Build
                </button>
              </div>
            </div>
          </form>

          {error && <p className="text-red-400/80 text-[0.78rem] m-0 mb-3 text-center">{error}</p>}

          {/* Quick actions */}
          <div className="flex items-center gap-3 mb-6">
            <button
              className="flex items-center gap-2 py-2 px-4 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[0.78rem] text-white/50 cursor-pointer transition-all duration-200 hover:bg-white/[0.08] hover:text-white/70 hover:border-white/[0.14]"
              onClick={handleDemo}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-50">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Try demo
            </button>
            <span className="text-[0.68rem] text-white/15">or try:</span>
            {[
              { label: "expressjs/express", url: "https://github.com/expressjs/express" },
              { label: "tj/commander.js", url: "https://github.com/tj/commander.js" },
            ].map(({ label, url }) => (
              <button
                key={url}
                className="py-1.5 px-3 bg-transparent border border-white/[0.06] rounded-lg text-white/25 font-mono text-[0.7rem] cursor-pointer transition-all duration-200 hover:border-accent/25 hover:text-accent/60"
                onClick={() => setRepoUrl(url)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Feature pills */}
          <div className="flex items-center gap-6 pt-6 border-t border-white/[0.05]">
            <FeaturePill icon="building" text="Files = Buildings" />
            <FeaturePill icon="bridge" text="Imports = Bridges" />
            <FeaturePill icon="search" text="Search & Fly-to" />
            <FeaturePill icon="timeline" text="Git Timeline" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturePill({ icon, text }: { icon: string; text: string }) {
  const icons: Record<string, React.ReactNode> = {
    building: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    bridge: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    search: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
    timeline: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-1.5 text-white/20">
      <span className="opacity-50">{icons[icon]}</span>
      <span className="text-[0.7rem] font-medium">{text}</span>
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
