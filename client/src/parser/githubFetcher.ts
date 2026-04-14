/**
 * GitHub Repository Fetcher
 *
 * Uses the GitHub API to fetch a repo's file tree and contents.
 * When authenticated, proxies through the server for higher rate limits (5000/hour).
 * Falls back to direct unauthenticated calls (60/hour) when not logged in.
 */

const GITHUB_API = "https://api.github.com";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const SUPPORTED_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "py", "go", "rs", "java",
  "css", "json", "md", "html", "vue", "svelte", "rb",
  "php", "c", "cpp", "h", "hpp", "cs", "swift", "kt",
]);

const IGNORED_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "__pycache__",
  ".venv", "vendor", "target", ".idea", ".vscode", "coverage",
  "test", "tests", "__tests__", "spec", ".github", "docs",
  "examples", "example", "fixtures", "benchmark", "benchmarks",
]);

const MAX_FILE_SIZE = 100_000; // 100KB per file
const MAX_FILES = 150; // Cap to keep things reasonable

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

/**
 * Fetch a GitHub repo's source files and return them as a path->content map.
 */
export async function fetchGitHubRepo(
  owner: string,
  repo: string,
  branch?: string,
  onProgress?: (msg: string) => void
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};

  // 1. Get default branch if not specified
  if (!branch) {
    onProgress?.("Fetching repository info...");
    const repoInfo = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}`);
    branch = repoInfo.default_branch || "main";
  }

  // 2. Get the full file tree (recursive)
  onProgress?.("Fetching file tree...");
  const treeData: GitHubTreeResponse = await githubFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  );

  // 3. Filter to supported source files
  const sourceFiles = treeData.tree.filter((item) => {
    if (item.type !== "blob") return false;
    if (item.size && item.size > MAX_FILE_SIZE) return false;

    // Check extension
    const ext = item.path.split(".").pop()?.toLowerCase() || "";
    if (!SUPPORTED_EXTENSIONS.has(ext)) return false;

    // Check ignored directories
    const parts = item.path.split("/");
    if (parts.some((p) => IGNORED_DIRS.has(p))) return false;

    return true;
  });

  // Cap the number of files
  const filesToFetch = sourceFiles.slice(0, MAX_FILES);

  onProgress?.(`Fetching ${filesToFetch.length} source files...`);

  // 4. Fetch file contents in parallel batches
  const BATCH_SIZE = 10;
  let fetched = 0;

  for (let i = 0; i < filesToFetch.length; i += BATCH_SIZE) {
    const batch = filesToFetch.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (item) => {
        const content = await fetchFileContent(owner, repo, item.path, branch!);
        return { path: item.path, content };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.content) {
        files[result.value.path] = result.value.content;
        fetched++;
      }
    }

    onProgress?.(`Fetched ${fetched}/${filesToFetch.length} files...`);
  }

  return files;
}

/**
 * Fetch a single file's content from GitHub.
 */
async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<string | null> {
  try {
    // Use the raw content endpoint (no API rate limit hit for content)
    const response = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
    );

    if (!response.ok) return null;

    const text = await response.text();

    // Basic binary check - skip files with too many non-printable chars
    const nonPrintable = text.slice(0, 1000).split("").filter((c) => {
      const code = c.charCodeAt(0);
      return code < 32 && code !== 9 && code !== 10 && code !== 13;
    }).length;

    if (nonPrintable > 5) return null;

    return text;
  } catch {
    return null;
  }
}

/**
 * Fetch commit history for a repo (last N commits with file change info).
 */
export async function fetchCommitHistory(
  owner: string,
  repo: string,
  branch: string,
  maxCommits: number = 30,
  onProgress?: (msg: string) => void
): Promise<CommitHistoryItem[]> {
  onProgress?.("Fetching commit history...");

  // Get list of commits
  const commits = await githubFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${maxCommits}`
  );

  const history: CommitHistoryItem[] = [];

  // Fetch file changes for each commit (in batches to respect rate limits)
  const BATCH = 5;
  for (let i = 0; i < commits.length; i += BATCH) {
    const batch = commits.slice(i, i + BATCH);

    const results = await Promise.allSettled(
      batch.map(async (c: any) => {
        const detail = await githubFetch(
          `${GITHUB_API}/repos/${owner}/${repo}/commits/${c.sha}`
        );
        return {
          sha: c.sha,
          message: (c.commit?.message || "").split("\n")[0], // first line only
          author: c.commit?.author?.name || c.author?.login || "unknown",
          date: c.commit?.author?.date || "",
          files: (detail.files || []).map((f: any) => ({
            path: f.filename,
            status: f.status as "added" | "modified" | "removed" | "renamed",
            additions: f.additions || 0,
            deletions: f.deletions || 0,
          })),
        };
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        history.push(r.value);
      }
    }

    onProgress?.(`Fetched ${Math.min(i + BATCH, commits.length)}/${commits.length} commits...`);
  }

  // Reverse so oldest is first (index 0 = earliest commit)
  return history.reverse();
}

export interface CommitHistoryItem {
  sha: string;
  message: string;
  author: string;
  date: string;
  files: {
    path: string;
    status: "added" | "modified" | "removed" | "renamed";
    additions: number;
    deletions: number;
  }[];
}

/**
 * Fetch from GitHub API with error handling.
 * Tries the authenticated server proxy first (5000 req/hour),
 * falls back to direct unauthenticated calls (60 req/hour).
 */
async function githubFetch(url: string): Promise<any> {
  // Try authenticated proxy first
  try {
    const proxyRes = await fetch(
      `${API_BASE}/api/github/proxy?url=${encodeURIComponent(url)}`,
      { credentials: "include" }
    );
    if (proxyRes.ok) {
      return proxyRes.json();
    }
    // 401/400 means not authenticated or no token — fall through to direct
    if (proxyRes.status !== 401 && proxyRes.status !== 400) {
      const err = await proxyRes.json().catch(() => ({}));
      throw new Error(err.error || `GitHub API error: ${proxyRes.status}`);
    }
  } catch (e: any) {
    // Network error reaching proxy — fall through to direct
    if (e.message && !e.message.includes("fetch")) throw e;
  }

  // Fallback: direct unauthenticated call
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Repository not found. Make sure it's a public repo and the URL is correct.");
    }
    if (response.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Sign in with GitHub for higher limits.");
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
