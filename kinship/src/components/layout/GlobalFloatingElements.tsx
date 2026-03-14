"use client";

import { useConnectivity } from "@/lib/ConnectivityContext";
import { ConnectivityStatusButton } from "@/components/layout/ConnectivityStatusButton";
import { Chatbot } from "@/components/Chatbot";

export function GlobalFloatingElements() {
  const { isAuthenticated } = useConnectivity();

  if (!isAuthenticated) return null;

  return (
    <>
      <ConnectivityStatusButton />
      <Chatbot />
    </>
  );
}
