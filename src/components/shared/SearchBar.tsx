import { useEffect, useState } from "react";

/**
 * Debounces keystrokes before calling onSearch — avoids firing a
 * database query on every character typed. 300ms matches typical
 * typing cadence: fast enough to feel live, slow enough to skip
 * intermediate keystrokes.
 */
export function SearchBar({
  placeholder = "Search…", onSearch, delayMs = 300
}: { placeholder?: string; onSearch: (query: string) => void; delayMs?: number }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const t = setTimeout(() => onSearch(value.trim()), delayMs);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <input
      type="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
    />
  );
}
