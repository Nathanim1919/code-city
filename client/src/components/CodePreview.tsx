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
import { FileTree } from "./FileTree";
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
  const codePreviewMode = useStore((s) => s.codePreviewMode);
  const setCodePreviewMode = useStore((s) => s.setCodePreviewMode);
  const selectBuilding = useStore((s) => s.selectBuilding);
  const codeRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fileContent = selectedBuilding
    ? files[selectedBuilding.fileNode.path] || null
    : null;

  const language = selectedBuilding?.fileNode.language || "unknown";
  const prismLang = LANGUAGE_MAP[language] || "plaintext";
  const isFull = codePreviewMode === "full";

  // Highlight code when content changes
  useEffect(() => {
    if (codeRef.current && fileContent) {
      Prism.highlightElement(codeRef.current);
    }
  }, [fileContent, prismLang]);

  const handleClose = () => {
    setCodePreviewMode("closed");
    selectBuilding(null);
  };

  const handleToggleSize = () => {
    setCodePreviewMode(isFull ? "normal" : "full");
  };

  const functions = selectedBuilding?.fileNode.functions || [];

  const scrollToLine = (line: number) => {
    if (!scrollRef.current) return;
    const lineHeight = 20;
    scrollRef.current.scrollTop = (line - 5) * lineHeight;
  };

  return (
    <div className={`code-preview ${isFull ? "code-preview--full" : ""}`}>
      {/* File tree — only in full screen mode */}
      {isFull && <FileTree />}

      {/* Code panel */}
      <div className="code-panel">
        {/* Header with controls */}
        <div className="code-preview-header">
          <div className="code-preview-file">
            {selectedBuilding ? (
              <>
                <span className="code-preview-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </span>
                <span className="code-preview-filename">{selectedBuilding.fileNode.name}</span>
                <span className="code-preview-path">{selectedBuilding.fileNode.path}</span>
              </>
            ) : (
              <span className="code-preview-filename" style={{ color: "var(--text-muted)" }}>
                No file selected
              </span>
            )}
          </div>
          <div className="code-preview-actions">
            {selectedBuilding && (
              <div className="code-preview-stats">
                <span>{selectedBuilding.fileNode.loc} lines</span>
                <span className="code-lang-badge">{language}</span>
              </div>
            )}
            <button
              className="code-action-btn"
              onClick={handleToggleSize}
              title={isFull ? "Shrink panel" : "Expand to full screen"}
            >
              {isFull ? <ShrinkIcon /> : <ExpandIcon />}
            </button>
            <button className="code-action-btn" onClick={handleClose} title="Close panel">
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Function jump list */}
        {functions.length > 0 && fileContent && (
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

        {/* Code content or empty state */}
        {fileContent ? (
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
        ) : (
          <div className="code-preview-empty">
            <p>{isFull ? "Select a file from the tree to view its code" : "Click a building to view its source code"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Icons ---

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function ShrinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
