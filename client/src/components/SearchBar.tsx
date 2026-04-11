import { useStore } from "../store/useStore";

export function SearchBar() {
  const search = useStore((s) => s.search);
  const searchQuery = useStore((s) => s.searchQuery);
  const searchResults = useStore((s) => s.searchResults);
  const flyTo = useStore((s) => s.flyTo);

  return (
    <div className="absolute top-4 left-4 z-10 w-80">
      <div className="flex items-center bg-bg-secondary border border-bg-tertiary rounded-[10px] px-3.5 backdrop-blur-[10px] transition-[border-color] duration-200 focus-within:border-accent">
        <svg
          className="text-text-muted shrink-0"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search files, functions..."
          value={searchQuery}
          onChange={(e) => search(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-text-primary font-mono text-[0.85rem] p-2.5 placeholder:text-text-muted"
        />
        {searchQuery && (
          <button
            className="bg-transparent border-none text-text-muted cursor-pointer text-[0.9rem] py-1 px-2 rounded hover:bg-bg-tertiary hover:text-text-primary"
            onClick={() => search("")}
          >
            x
          </button>
        )}
      </div>

      {/* Search results dropdown */}
      {searchResults.length > 0 && searchQuery && (
        <div className="mt-1 bg-bg-secondary border border-bg-tertiary rounded-[10px] overflow-hidden">
          {searchResults.slice(0, 8).map((result) => (
            <div
              key={result.id}
              className="py-2.5 px-3.5 cursor-pointer transition-[background] duration-150 flex flex-col gap-0.5 hover:bg-bg-tertiary"
              onClick={() => {
                flyTo(result);
                search("");
              }}
            >
              <span className="font-mono text-[0.85rem] text-text-primary">{result.fileNode.name}</span>
              <span className="font-mono text-[0.65rem] text-text-muted">{result.fileNode.path}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
