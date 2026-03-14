"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useKinshipStore } from "@/lib/store";
import { loadAuthFromOffline } from "@/lib/db";

export type ConnectivityMode = "online" | "offline" | "p2p";

interface ConnectivityState {
  mode: ConnectivityMode;
  setMode: (mode: ConnectivityMode) => void;
  cycleMode: () => void;
  isAuthenticated: boolean;
}

const ConnectivityContext = createContext<ConnectivityState>({
  mode: "online",
  setMode: () => {},
  cycleMode: () => {},
  isAuthenticated: false,
});

export function useConnectivity() {
  return useContext(ConnectivityContext);
}

/**
 * Global variable for non-React code (like api.ts) to check connectivity mode
 */
let _globalMode: ConnectivityMode = "online";
export function getConnectivityMode(): ConnectivityMode {
  return _globalMode;
}

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ConnectivityMode>("online");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { setConnectivity, token } = useKinshipStore();

  const setMode = useCallback((newMode: ConnectivityMode) => {
    setModeState(newMode);
    _globalMode = newMode;
    // Keep Zustand store in sync
    setConnectivity(newMode);
  }, [setConnectivity]);

  const cycleMode = useCallback(() => {
    setMode(
      mode === "online" ? "offline"
        : mode === "offline" ? "p2p"
        : "online"
    );
  }, [mode, setMode]);

  // Auto-detect browser offline
  useEffect(() => {
    const goOnline = () => { if (mode === "offline") setMode("online"); };
    const goOffline = () => setMode("offline");

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    if (!navigator.onLine) setMode("offline");

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [mode, setMode]);

  // Check authentication status globally
  useEffect(() => {
    async function checkAuth() {
      // 1. Check Dexie for saved auth
      const auth = await loadAuthFromOffline();
      // 2. Or check current session token via Zustand
      if (auth?.token || token) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, [token]);

  return (
    <ConnectivityContext.Provider value={{ mode, setMode, cycleMode, isAuthenticated }}>
      {children}
    </ConnectivityContext.Provider>
  );
}
