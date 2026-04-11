import { useStore } from "../store/useStore";

export function SearchBar() {
  const search = useStore((s) => s.search);
  const searchQuery = useStore((s) => s.searchQuery);
  const searchResults = useStore((s) => s.searchResults);
  const flyTo = useStore((s) => s.flyTo);

  return (
    <div className="search-container">
      <div className="search-bar">
        <svg
          className="search-icon"
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
          className="search-input"
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => search("")}>
            x
          </button>
        )}
      </div>

      {/* Search results dropdown */}
      {searchResults.length > 0 && searchQuery && (
        <div className="search-results">
          {searchResults.slice(0, 8).map((result) => (
            <div
              key={result.id}
              className="search-result-item"
              onClick={() => {
                flyTo(result);
                search("");
              }}
            >
              <span className="result-name">{result.fileNode.name}</span>
              <span className="result-path">{result.fileNode.path}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
