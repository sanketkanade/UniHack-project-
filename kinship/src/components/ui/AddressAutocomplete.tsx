"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    suburb?: string;
    town?: string;
    city_district?: string;
    postcode?: string;
    state?: string;
    country?: string;
  };
  lat: string;
  lon: string;
}

interface Suggestion {
  placeId: number;
  displayName: string;
  suburb: string;
  postcode: string;
  lat: number;
  lng: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: { suburb: string; postcode: string; lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing your street address…",
  className = "",
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions from Nominatim
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: `${query}, Melbourne, VIC, Australia`,
        format: "json",
        addressdetails: "1",
        countrycodes: "au",
        limit: "6",
        viewbox: "144.5,-38.5,145.5,-37.5",
        bounded: "0",
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        { headers: { "Accept-Language": "en", "User-Agent": "KinshipApp/1.0" } }
      );
      const data: NominatimResult[] = await res.json();

      const mapped: Suggestion[] = data.map((r) => {
        // Extract suburb from address dict — prefer suburb → city_district → town
        const suburb =
          r.address.suburb ||
          r.address.city_district ||
          r.address.town ||
          "";
        const postcode = r.address.postcode || "";

        // Build a cleaner display name (first 2 parts of display_name)
        const parts = r.display_name.split(", ");
        const shortDisplay = parts.slice(0, 4).join(", ");

        return {
          placeId: r.place_id,
          displayName: shortDisplay,
          suburb,
          postcode,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        };
      });

      setSuggestions(mapped);
      setIsOpen(mapped.length > 0);
      setHighlightedIndex(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce user input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  // Select a suggestion
  const handleSelect = (s: Suggestion) => {
    onChange(s.displayName);
    onSelect({ suburb: s.suburb, postcode: s.postcode, lat: s.lat, lng: s.lng });
    setSuggestions([]);
    setIsOpen(false);
  };

  // Keyboard nav
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        <MapPin
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-xl border border-gray-200 pl-9 pr-10 py-3 focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all outline-none text-textDark bg-white"
        />
        {isLoading && (
          <Loader2
            size={16}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-accent animate-spin pointer-events-none"
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          className="absolute z-50 mt-1.5 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
          role="listbox"
        >
          {suggestions.map((s, i) => {
            const parts = s.displayName.split(", ");
            const top = parts[0];
            const rest = parts.slice(1).join(", ");
            return (
              <li
                key={s.placeId}
                role="option"
                aria-selected={highlightedIndex === i}
                onMouseEnter={() => setHighlightedIndex(i)}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                className={`px-4 py-2.5 cursor-pointer flex items-start gap-2.5 transition-colors ${
                  highlightedIndex === i ? "bg-accent/10" : "hover:bg-gray-50"
                }`}
              >
                <MapPin size={14} className="text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-textDark leading-snug">{top}</p>
                  {rest && (
                    <p className="text-xs text-textMuted mt-0.5 leading-snug">{rest}</p>
                  )}
                  {(s.suburb || s.postcode) && (
                    <p className="text-xs text-accent font-semibold mt-0.5">
                      {[s.suburb, s.postcode].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
          <li className="px-4 py-1.5 text-[10px] text-textMuted border-t border-gray-100 text-right">
            Results from © OpenStreetMap contributors
          </li>
        </ul>
      )}
    </div>
  );
}
