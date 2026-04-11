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
  typescript: "typescript", javascript: "javascript", python: "python", go: "go",
  rust: "rust", java: "java", css: "css", json: "json", markdown: "markdown",
};

export function CodePreview() {
  const selectedBuilding = useStore((s) => s.selectedBuilding);
  const files = useStore((s) => s.files);
  const codePreviewMode = useStore((s) => s.codePreviewMode);
  const setCodePreviewMode = useStore((s) => s.setCodePreviewMode);
  const selectBuilding = useStore((s) => s.selectBuilding);
  const codeRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fileContent = selectedBuilding ? files[selectedBuilding.fileNode.path] || null : null;
  const language = selectedBuilding?.fileNode.language || "unknown";
  const prismLang = LANGUAGE_MAP[language] || "plaintext";
  const isFull = codePreviewMode === "full";

  useEffect(() => {
    if (codeRef.current && fileContent) Prism.highlightElement(codeRef.current);
  }, [fileContent, prismLang]);

  const handleClose = () => { setCodePreviewMode("closed"); selectBuilding(null); };
  const handleToggleSize = () => { setCodePreviewMode(isFull ? "normal" : "full"); };

  const functions = selectedBuilding?.fileNode.functions || [];
  const scrollToLine = (line: number) => { if (scrollRef.current) scrollRef.current.scrollTop = (line - 5) * 20; };

  const actionBtn = "bg-transparent border-none text-text-muted cursor-pointer p-1.5 rounded-md flex items-center justify-center transition-all duration-150 hover:bg-bg-tertiary hover:text-text-primary";

  return (
    <div className={`bg-bg-secondary border-l border-border flex flex-col overflow-hidden min-w-0 ${isFull ? "border-l-0 grid grid-cols-[260px_1fr] grid-rows-[1fr]" : ""}`}>
      {isFull && <FileTree />}

      <div className="flex flex-col overflow-hidden flex-1 min-w-0">
        {/* Header */}
        <div className="py-3 px-4 border-b border-border flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            {selectedBuilding ? (
              <>
                <span className="text-accent flex shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </span>
                <span className="font-mono text-[0.85rem] font-semibold text-text-primary">{selectedBuilding.fileNode.name}</span>
                <span className="font-mono text-[0.6rem] text-text-muted overflow-hidden text-ellipsis whitespace-nowrap">{selectedBuilding.fileNode.path}</span>
              </>
            ) : (
              <span className="font-mono text-[0.85rem] font-semibold text-text-muted">No file selected</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {selectedBuilding && (
              <div className="flex gap-2.5 text-[0.7rem] text-text-muted">
                <span>{selectedBuilding.fileNode.loc} lines</span>
                <span className="bg-bg-primary px-2 py-px rounded font-mono text-[0.65rem] text-accent">{language}</span>
              </div>
            )}
            <button className={actionBtn} onClick={handleToggleSize} title={isFull ? "Shrink panel" : "Expand to full screen"}>
              {isFull ? <ShrinkIcon /> : <ExpandIcon />}
            </button>
            <button className={actionBtn} onClick={handleClose} title="Close panel">
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Function jump list */}
        {functions.length > 0 && fileContent && (
          <div className="py-2 px-4 border-b border-border flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
            <span className="text-[0.65rem] text-text-muted shrink-0 uppercase tracking-[0.05em]">Jump to:</span>
            <div className="flex gap-1">
              {functions.map((fn: FunctionNode) => (
                <button key={fn.id} className="bg-bg-primary border border-transparent text-text-secondary font-mono text-[0.7rem] py-[3px] px-2 rounded-md cursor-pointer whitespace-nowrap transition-all duration-150 hover:border-accent hover:text-accent" onClick={() => scrollToLine(fn.startLine)} title={`Line ${fn.startLine}`}>
                  {fn.name}()
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Code content or empty state */}
        {fileContent ? (
          <div className="flex-1 overflow-auto flex scrollbar-thin scrollbar-color-[var(--bg-tertiary)_transparent]" ref={scrollRef}>
            <div className="flex flex-col py-4 text-right select-none shrink-0 sticky left-0 bg-bg-secondary z-[1]">
              {fileContent.split("\n").map((_, i) => (
                <span key={i} className="font-mono text-[0.7rem] text-text-muted opacity-50 px-3 pl-4 leading-[20px] h-[20px]">{i + 1}</span>
              ))}
            </div>
            <pre className="code-pre">
              <code ref={codeRef} className={`language-${prismLang}`}>{fileContent}</code>
            </pre>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-muted text-[0.85rem]">
            <p>{isFull ? "Select a file from the tree to view its code" : "Click a building to view its source code"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ExpandIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>;
}

function ShrinkIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></svg>;
}

function CloseIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}
