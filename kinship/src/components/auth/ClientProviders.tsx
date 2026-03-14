"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { ConnectivityProvider } from "@/lib/ConnectivityContext";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConnectivityProvider>
      <AuthProvider>{children}</AuthProvider>
    </ConnectivityProvider>
  );
}
