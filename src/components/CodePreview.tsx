import { useEffect, useRef } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-java";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import { useStore } from "../store/useStore";
import type { FunctionNode } from "../types";

const LANGUAGE_MAP: Record<string, string> = {
  typescript: "typescript",
  javascript: "javascript",
  python: "python",
  go: "go",
  rust: "rust",
  java: "java",
  css: "css",
  json: "json",
  markdown: "markdown",
};

export function CodePreview() {
  const selectedBuilding = useStore((s) => s.selectedBuilding);
  const files = useStore((s) => s.files);
  const codeRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fileContent = selectedBuilding
    ? files[selectedBuilding.fileNode.path] || null
    : null;

  const language = selectedBuilding?.fileNode.language || "unknown";
  const prismLang = LANGUAGE_MAP[language] || "plaintext";

  // Highlight code when content changes
  useEffect(() => {
    if (codeRef.current && fileContent) {
      Prism.highlightElement(codeRef.current);
    }
  }, [fileContent, prismLang]);

  if (!selectedBuilding || !fileContent) return null;

  const functions = selectedBuilding.fileNode.functions;

  const scrollToLine = (line: number) => {
    if (!scrollRef.current) return;
    const lineHeight = 20; // approximate
    scrollRef.current.scrollTop = (line - 5) * lineHeight;
  };

  return (
    <div className="code-preview">
      {/* Header */}
      <div className="code-preview-header">
        <div className="code-preview-file">
          <span className="code-preview-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </span>
          <span className="code-preview-filename">{selectedBuilding.fileNode.name}</span>
          <span className="code-preview-path">{selectedBuilding.fileNode.path}</span>
        </div>
        <div className="code-preview-stats">
          <span>{selectedBuilding.fileNode.loc} lines</span>
          <span className="code-lang-badge">{language}</span>
        </div>
      </div>

      {/* Function jump list */}
      {functions.length > 0 && (
        <div className="code-functions-bar">
          <span className="code-functions-label">Jump to:</span>
          <div className="code-functions-list">
            {functions.map((fn: FunctionNode) => (
              <button
                key={fn.id}
                className="code-function-btn"
                onClick={() => scrollToLine(fn.startLine)}
                title={`Line ${fn.startLine}`}
              >
                {fn.name}()
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Code content */}
      <div className="code-preview-body" ref={scrollRef}>
        <div className="code-line-numbers">
          {fileContent.split("\n").map((_, i) => (
            <span key={i} className="code-line-num">
              {i + 1}
            </span>
          ))}
        </div>
        <pre className="code-pre">
          <code ref={codeRef} className={`language-${prismLang}`}>
            {fileContent}
          </code>
        </pre>
      </div>
    </div>
  );
}
