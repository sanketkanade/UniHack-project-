"use client";

import { Wifi, WifiOff, Radio } from "lucide-react";
import { useConnectivity, ConnectivityMode } from "@/lib/ConnectivityContext";

const modeConfig: Record<ConnectivityMode, {
  bg: string;
  text: string;
  border: string;
  glow: string;
  icon: typeof Wifi;
  label: string;
  animate: boolean;
}> = {
  online: {
    bg: "bg-emerald-500",
    text: "text-white",
    border: "border-emerald-400",
    glow: "",
    icon: Wifi,
    label: "Online",
    animate: false,
  },
  offline: {
    bg: "bg-amber-500",
    text: "text-white",
    border: "border-amber-400",
    glow: "",
    icon: WifiOff,
    label: "Offline — Cached Mode",
    animate: false,
  },
  p2p: {
    bg: "bg-teal-500",
    text: "text-white",
    border: "border-teal-400",
    glow: "p2p-glow",
    icon: Radio,
    label: "Satellite P2P Active",
    animate: true,
  },
};

export function ConnectivityStatusButton() {
  const { mode, cycleMode } = useConnectivity();
  const config = modeConfig[mode];
  const Icon = config.icon;

  return (
    <>
      <style jsx global>{`
        @keyframes p2pPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(20, 184, 166, 0.4); }
          50% { box-shadow: 0 0 20px rgba(20, 184, 166, 0.8), 0 0 40px rgba(20, 184, 166, 0.3); }
        }
        .p2p-glow {
          animation: p2pPulse 2s ease-in-out infinite;
        }
        @keyframes p2pRadio {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .p2p-radio-pulse {
          animation: p2pRadio 1.5s ease-in-out infinite;
        }
      `}</style>

      <button
        onClick={cycleMode}
        id="connectivity-status-button"
        className={`
          fixed bottom-20 left-4 z-50
          flex items-center gap-2 px-4 py-2.5
          rounded-full border
          font-semibold text-sm
          shadow-lg backdrop-blur-sm
          transition-all duration-300 ease-out
          hover:scale-105 active:scale-95
          cursor-pointer select-none
          ${config.bg} ${config.text} ${config.border} ${config.glow}
        `}
        aria-label={`Connectivity: ${config.label}. Click to change mode.`}
        title={`Mode: ${config.label} — Click to switch`}
      >
        <Icon
          size={16}
          className={config.animate ? "p2p-radio-pulse" : ""}
        />
        <span className="whitespace-nowrap">{config.label}</span>

        {/* Mode indicator dots */}
        <div className="flex gap-1 ml-1">
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
            mode === "online" ? "bg-white" : "bg-white/30"
          }`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
            mode === "offline" ? "bg-white" : "bg-white/30"
          }`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
            mode === "p2p" ? "bg-white" : "bg-white/30"
          }`} />
        </div>
      </button>
    </>
  );
}
