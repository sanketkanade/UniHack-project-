import { useKinshipStore } from "@/lib/store";
import { getConnectivityMode } from "@/lib/ConnectivityContext";
import { db } from "@/lib/db";

/**
 * Authenticated fetch wrapper.
 * Automatically reads the JWT token from the Zustand store
 * and attaches it as an Authorization: Bearer header.
 *
 * In OFFLINE mode, GET requests fall back to Dexie cached data.
 * In P2P mode, requests proceed normally but may use WebRTC channels.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const mode = getConnectivityMode();
  const token = useKinshipStore.getState().token;

  // OFFLINE MODE: intercept GET requests and serve from Dexie
  if (mode === "offline" && (!options.method || options.method === "GET")) {
    const cached = await getFromDexieCache(url);
    if (cached !== null) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { "Content-Type": "application/json", "X-Source": "dexie-cache" },
      });
    }
    // If nothing cached, still try network (might fail)
  }

  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Default to JSON content type for POST/PUT/PATCH
  if (
    options.method &&
    ["POST", "PUT", "PATCH"].includes(options.method.toUpperCase()) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(url, { ...options, headers });

    // Cache successful GET responses for offline use
    if (response.ok && (!options.method || options.method === "GET")) {
      const cloned = response.clone();
      try {
        const data = await cloned.json();
        await saveToDexieCache(url, data);
      } catch {
        // Non-JSON response, skip caching
      }
    }

    return response;
  } catch (error) {
    // Network error — try Dexie cache if available
    if (!options.method || options.method === "GET") {
      const cached = await getFromDexieCache(url);
      if (cached !== null) {
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Source": "dexie-fallback" },
        });
      }
    }
    throw error;
  }
}

/**
 * Convenience: authFetch + parse JSON response.
 * Throws if response is not ok.
 */
export async function authFetchJSON<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await authFetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

// ——— Dexie Cache Helpers ———

async function saveToDexieCache(url: string, data: unknown): Promise<void> {
  try {
    await db.table("apiCache").put({
      url,
      data: JSON.stringify(data),
      timestamp: Date.now(),
    });
  } catch {
    // Cache table might not exist yet, that's fine
  }
}

async function getFromDexieCache(url: string): Promise<unknown | null> {
  try {
    const entry = await db.table("apiCache").get(url);
    if (entry) {
      // Cache entries older than 1 hour are stale but still usable in offline mode
      return JSON.parse(entry.data);
    }
  } catch {
    // Cache table might not exist
  }
  return null;
}
