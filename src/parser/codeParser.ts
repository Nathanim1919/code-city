/**
 * Code Parser - Analyzes source code to extract structure and dependencies.
 *
 * For the MVP, we use regex-based parsing that works in the browser.
 * This can be upgraded to Tree-sitter WASM for production use.
 */

import type { FileNode, FunctionNode, DependencyEdge, CodeGraph } from "../types";

const LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  go: "go",
  rs: "rust",
  java: "java",
  css: "css",
  json: "json",
  md: "markdown",
};

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop() || "";
  return LANGUAGE_MAP[ext] || "unknown";
}

function estimateComplexity(content: string): number {
  // Simple cyclomatic complexity: count branching keywords
  const branches = content.match(
    /\b(if|else|for|while|switch|case|catch|&&|\|\||\?)\b/g
  );
  return 1 + (branches?.length || 0);
}

function extractFunctions(
  content: string,
  filePath: string
): FunctionNode[] {
  const functions: FunctionNode[] = [];
  const lines = content.split("\n");

  // Match common function patterns across languages
  const patterns = [
    // JS/TS: function name(), const name = () =>, export function name()
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
    /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(?/,
    // Python: def name(
    /def\s+(\w+)\s*\(/,
    // Go: func name(
    /func\s+(?:\([^)]*\)\s+)?(\w+)\s*\(/,
    // Rust: fn name(
    /(?:pub\s+)?fn\s+(\w+)/,
    // Java: public void name(
    /(?:public|private|protected)\s+(?:static\s+)?(?:\w+\s+)+(\w+)\s*\(/,
    // Class methods: name() { or name: function
    /^\s+(\w+)\s*\([^)]*\)\s*\{/,
  ];

  lines.forEach((line, index) => {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        // Find the end of the function (simple brace counting)
        let braceCount = 0;
        let started = false;
        let endLine = index;

        for (let i = index; i < lines.length; i++) {
          for (const char of lines[i]) {
            if (char === "{" || char === ":") {
              braceCount++;
              started = true;
            }
            if (char === "}" && started) {
              braceCount--;
            }
          }
          if (started && braceCount <= 0) {
            endLine = i;
            break;
          }
        }

        const funcContent = lines.slice(index, endLine + 1).join("\n");

        functions.push({
          id: `${filePath}::${match[1]}`,
          name: match[1],
          filePath,
          loc: endLine - index + 1,
          complexity: estimateComplexity(funcContent),
          calls: extractCalls(funcContent),
          startLine: index + 1,
          endLine: endLine + 1,
        });
        break; // Only match first pattern per line
      }
    }
  });

  return functions;
}

function extractCalls(content: string): string[] {
  const calls: string[] = [];
  const callPattern = /\b([a-zA-Z_]\w*)\s*\(/g;
  let match;
  const keywords = new Set([
    "if", "for", "while", "switch", "catch", "function", "return",
    "class", "import", "export", "const", "let", "var", "new",
  ]);

  while ((match = callPattern.exec(content)) !== null) {
    if (!keywords.has(match[1])) {
      calls.push(match[1]);
    }
  }

  return [...new Set(calls)];
}

function extractImports(content: string): string[] {
  const imports: string[] = [];

  // JS/TS imports
  const jsImports = content.matchAll(
    /import\s+.*?from\s+['"]([^'"]+)['"]/g
  );
  for (const match of jsImports) {
    imports.push(match[1]);
  }

  // require()
  const requires = content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
  for (const match of requires) {
    imports.push(match[1]);
  }

  // Python imports
  const pyImports = content.matchAll(/(?:from|import)\s+([^\s;]+)/g);
  for (const match of pyImports) {
    if (!match[1].startsWith("'") && !match[1].startsWith('"')) {
      imports.push(match[1]);
    }
  }

  // Go imports
  const goImports = content.matchAll(/["']([^"']+)["']/g);
  // Only extract if we detect it's Go (has package declaration)
  if (content.match(/^package\s+\w+/m)) {
    for (const match of goImports) {
      imports.push(match[1]);
    }
  }

  return [...new Set(imports)];
}

function extractExports(content: string): string[] {
  const exports: string[] = [];

  const exportMatches = content.matchAll(
    /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g
  );
  for (const match of exportMatches) {
    exports.push(match[1]);
  }

  return exports;
}

/**
 * Parse a flat map of file paths -> content into a CodeGraph.
 * This is the main entry point for the parser.
 */
export function parseCodebase(
  files: Record<string, string>,
  rootPath: string = "/"
): CodeGraph {
  const fileNodes: FileNode[] = [];
  const edgeMap = new Map<string, Map<string, number>>();

  // First pass: parse all files
  for (const [path, content] of Object.entries(files)) {
    const lines = content.split("\n");
    const language = detectLanguage(path);
    const functions = extractFunctions(content, path);
    const imports = extractImports(content);
    const exports = extractExports(content);

    fileNodes.push({
      id: path,
      name: path.split("/").pop() || path,
      path,
      type: "file",
      language,
      loc: lines.length,
      complexity: estimateComplexity(content),
      functions,
      imports,
      exports,
      children: undefined,
    });
  }

  // Second pass: resolve import paths to actual files
  const filePaths = new Set(Object.keys(files));

  for (const node of fileNodes) {
    for (const imp of node.imports) {
      // Try to resolve the import to an actual file
      const resolved = resolveImport(imp, node.path, filePaths);
      if (resolved) {
        if (!edgeMap.has(node.path)) {
          edgeMap.set(node.path, new Map());
        }
        const targets = edgeMap.get(node.path)!;
        targets.set(resolved, (targets.get(resolved) || 0) + 1);
      }
    }
  }

  // Build edges
  const edges: DependencyEdge[] = [];
  for (const [source, targets] of edgeMap) {
    for (const [target, weight] of targets) {
      edges.push({ source, target, weight });
    }
  }

  return { nodes: fileNodes, edges, rootPath };
}

function resolveImport(
  importPath: string,
  fromFile: string,
  knownPaths: Set<string>
): string | null {
  // Handle relative imports
  if (importPath.startsWith(".")) {
    const dir = fromFile.split("/").slice(0, -1).join("/");
    const resolved = normalizePath(`${dir}/${importPath}`);

    // Try exact match, then with extensions
    const extensions = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"];
    for (const ext of extensions) {
      if (knownPaths.has(resolved + ext)) {
        return resolved + ext;
      }
    }
  }

  // Try absolute path match
  for (const known of knownPaths) {
    if (known.endsWith(importPath) || known.includes(importPath)) {
      return known;
    }
  }

  return null;
}

function normalizePath(path: string): string {
  const parts = path.split("/");
  const normalized: string[] = [];

  for (const part of parts) {
    if (part === "..") {
      normalized.pop();
    } else if (part !== "." && part !== "") {
      normalized.push(part);
    }
  }

  return normalized.join("/");
}

/**
 * Generate a sample codebase for demo purposes.
 */
export function generateSampleCodebase(): Record<string, string> {
  return {
    "src/index.ts": `
import { App } from './App';
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root')!);
root.render(App());
`,
    "src/App.ts": `
import { Router } from './router/Router';
import { AuthProvider } from './auth/AuthProvider';
import { ThemeProvider } from './ui/ThemeProvider';

export function App() {
  return ThemeProvider(AuthProvider(Router()));
}
`,
    "src/router/Router.ts": `
import { HomePage } from '../pages/HomePage';
import { DashboardPage } from '../pages/DashboardPage';
import { SettingsPage } from '../pages/SettingsPage';
import { useAuth } from '../auth/useAuth';

export function Router() {
  const auth = useAuth();
  if (!auth.isLoggedIn) return HomePage();
  return matchRoute(window.location.pathname);
}

function matchRoute(path: string) {
  switch (path) {
    case '/dashboard': return DashboardPage();
    case '/settings': return SettingsPage();
    default: return HomePage();
  }
}
`,
    "src/auth/AuthProvider.ts": `
import { createContext } from './context';
import { apiClient } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider(children: any) {
  const user = apiClient.getUser();
  return { context: AuthContext, value: { user }, children };
}
`,
    "src/auth/useAuth.ts": `
import { useContext } from './context';

export function useAuth() {
  return useContext('AuthContext');
}

export function usePermissions() {
  const auth = useAuth();
  return { canEdit: auth?.role === 'admin', canView: true };
}
`,
    "src/auth/context.ts": `
const contexts = new Map();

export function createContext(defaultValue: any) {
  const id = Math.random().toString(36);
  contexts.set(id, defaultValue);
  return id;
}

export function useContext(id: string) {
  return contexts.get(id);
}
`,
    "src/api/client.ts": `
import { handleError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const BASE_URL = '/api/v1';

export const apiClient = {
  async get(path: string) {
    try {
      logger.info('GET', path);
      const res = await fetch(BASE_URL + path);
      return res.json();
    } catch (err) {
      handleError(err);
    }
  },

  async post(path: string, body: any) {
    try {
      logger.info('POST', path);
      const res = await fetch(BASE_URL + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.json();
    } catch (err) {
      handleError(err);
    }
  },

  async getUser() {
    return this.get('/me');
  },

  async updateUser(data: any) {
    return this.post('/me', data);
  }
};
`,
    "src/api/websocket.ts": `
import { logger } from '../utils/logger';

export class WebSocketClient {
  private ws: WebSocket | null = null;

  connect(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => logger.info('WS connected');
    this.ws.onclose = () => logger.warn('WS disconnected');
    this.ws.onerror = (err) => logger.error('WS error', err);
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    this.ws?.close();
  }
}
`,
    "src/pages/HomePage.ts": `
import { Button } from '../ui/Button';
import { Layout } from '../ui/Layout';

export function HomePage() {
  return Layout({
    title: 'Welcome',
    children: [
      Button({ label: 'Get Started', onClick: () => {} }),
      Button({ label: 'Learn More', variant: 'secondary' }),
    ]
  });
}
`,
    "src/pages/DashboardPage.ts": `
import { Layout } from '../ui/Layout';
import { Chart } from '../ui/Chart';
import { DataTable } from '../ui/DataTable';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/useAuth';

export function DashboardPage() {
  const auth = useAuth();
  const data = apiClient.get('/dashboard');

  return Layout({
    title: 'Dashboard',
    children: [
      Chart({ data: data?.chartData, type: 'line' }),
      DataTable({ rows: data?.tableData, columns: ['name', 'value', 'trend'] }),
    ]
  });
}
`,
    "src/pages/SettingsPage.ts": `
import { Layout } from '../ui/Layout';
import { Form } from '../ui/Form';
import { apiClient } from '../api/client';
import { useAuth, usePermissions } from '../auth/useAuth';

export function SettingsPage() {
  const auth = useAuth();
  const { canEdit } = usePermissions();

  async function handleSave(data: any) {
    await apiClient.updateUser(data);
  }

  return Layout({
    title: 'Settings',
    children: [
      Form({
        fields: ['name', 'email', 'theme'],
        onSubmit: handleSave,
        disabled: !canEdit,
      }),
    ]
  });
}
`,
    "src/ui/Button.ts": `
export interface ButtonProps {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export function Button(props: ButtonProps) {
  return { type: 'button', ...props };
}
`,
    "src/ui/Layout.ts": `
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function Layout(props: { title: string; children: any[] }) {
  return {
    type: 'layout',
    header: Navbar(),
    sidebar: Sidebar(),
    main: { title: props.title, children: props.children },
  };
}
`,
    "src/ui/Navbar.ts": `
import { useAuth } from '../auth/useAuth';
import { Button } from './Button';

export function Navbar() {
  const auth = useAuth();
  return {
    type: 'navbar',
    items: [
      { label: 'Home', href: '/' },
      { label: 'Dashboard', href: '/dashboard' },
      auth ? Button({ label: 'Logout' }) : Button({ label: 'Login' }),
    ]
  };
}
`,
    "src/ui/Sidebar.ts": `
export function Sidebar() {
  return {
    type: 'sidebar',
    items: [
      { icon: 'home', label: 'Home', href: '/' },
      { icon: 'chart', label: 'Dashboard', href: '/dashboard' },
      { icon: 'settings', label: 'Settings', href: '/settings' },
    ]
  };
}
`,
    "src/ui/Chart.ts": `
export function Chart(props: { data: any; type: 'line' | 'bar' | 'pie' }) {
  const processData = (raw: any) => {
    if (!raw) return [];
    return raw.map((d: any) => ({ x: d.x, y: d.y, label: d.label }));
  };

  return {
    type: 'chart',
    chartType: props.type,
    data: processData(props.data),
  };
}
`,
    "src/ui/DataTable.ts": `
export function DataTable(props: { rows: any[]; columns: string[] }) {
  const sortRows = (rows: any[], col: string) => {
    return [...(rows || [])].sort((a, b) => a[col] > b[col] ? 1 : -1);
  };

  const filterRows = (rows: any[], query: string) => {
    return (rows || []).filter(r =>
      Object.values(r).some(v => String(v).includes(query))
    );
  };

  return { type: 'datatable', rows: props.rows, columns: props.columns };
}
`,
    "src/ui/Form.ts": `
export function Form(props: { fields: string[]; onSubmit: (data: any) => void; disabled?: boolean }) {
  function validate(data: any) {
    const errors: Record<string, string> = {};
    for (const field of props.fields) {
      if (!data[field]) errors[field] = 'Required';
    }
    return errors;
  }

  return { type: 'form', ...props, validate };
}
`,
    "src/ui/ThemeProvider.ts": `
const themes = {
  light: { bg: '#ffffff', text: '#000000', primary: '#3b82f6' },
  dark: { bg: '#0f172a', text: '#e2e8f0', primary: '#60a5fa' },
};

export function ThemeProvider(children: any) {
  const theme = themes.dark;
  return { type: 'theme', theme, children };
}
`,
    "src/utils/logger.ts": `
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export const logger = {
  info: (...args: any[]) => log('info', ...args),
  warn: (...args: any[]) => log('warn', ...args),
  error: (...args: any[]) => log('error', ...args),
  debug: (...args: any[]) => log('debug', ...args),
};

function log(level: LogLevel, ...args: any[]) {
  const timestamp = new Date().toISOString();
  console[level](\`[\${timestamp}] [\${level.toUpperCase()}]\`, ...args);
}
`,
    "src/utils/errorHandler.ts": `
import { logger } from './logger';

export function handleError(error: unknown) {
  if (error instanceof Error) {
    logger.error(error.message, error.stack);
  } else {
    logger.error('Unknown error', error);
  }
}

export function withErrorBoundary(fn: Function) {
  return (...args: any[]) => {
    try {
      return fn(...args);
    } catch (err) {
      handleError(err);
      return null;
    }
  };
}
`,
    "src/utils/helpers.ts": `
export function debounce(fn: Function, ms: number) {
  let timer: any;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function throttle(fn: Function, ms: number) {
  let last = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  };
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
`,
  };
}
