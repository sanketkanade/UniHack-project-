"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { p2pManager } from "@/lib/p2p";
import { Wifi, Radio, QrCode } from "lucide-react";
import { useKinshipStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";

interface P2PConnectProps {
  userId: string;
  clusterName: string;
  isSatelliteMode?: boolean;
}

export function P2PConnect({ userId, clusterName, isSatelliteMode }: P2PConnectProps) {
  const [mode, setMode] = useState<"idle" | "hub" | "peer">("idle");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const { setConnectivity, setConnectedPeers } = useKinshipStore();

  useEffect(() => {
    if (isSatelliteMode && mode === "idle") {
      // Auto-connect as peer when satellite mode is toggled on globally
      setMode("peer");
      handleConnect();
    }
  }, [isSatelliteMode]);

  const handleConnect = async () => {
    setConnecting(true);
    const peerCount = await p2pManager.simulateConnect();
    setConnected(true);
    setConnecting(false);
    // Only update Zustand if not already overridden by global mode
    if (!isSatelliteMode) {
      setConnectivity("p2p");
    }
    setConnectedPeers(peerCount);
  };

  const qrPayload = p2pManager.getHubPayload(userId, clusterName);

  if (mode === "idle") {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-textDark flex items-center gap-2">
          <Radio size={18} />
          Peer-to-Peer Connection
        </h3>
        <p className="text-sm text-textMuted">
          Connect directly to your cluster when the internet is down.
        </p>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => { setMode("hub"); handleConnect(); }} className="flex-1">
            <QrCode size={18} />
            Be the Hub
          </Button>
          <Button variant="secondary" onClick={() => { setMode("peer"); handleConnect(); }} className="flex-1">
            <Wifi size={18} />
            Join as Peer
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "hub") {
    return (
      <div className="space-y-3 text-center">
        <h3 className="font-semibold text-textDark">Hub Mode</h3>
        <p className="text-sm text-textMuted">Other devices can scan this QR code to connect</p>
        <div className="flex justify-center py-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <QRCodeSVG value={qrPayload} size={180} />
          </div>
        </div>
        {connecting && (
          <p className="text-sm text-primary animate-pulse">Establishing connection...</p>
        )}
        {connected && (
          <div className="flex items-center justify-center gap-2 text-sm text-success font-medium">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            Connected — {p2pManager.getPeerCount()} devices
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={() => { setMode("idle"); p2pManager.disconnect(); setConnectivity("online"); }}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <h3 className="font-semibold text-teal-600 flex items-center justify-center gap-2">
        <Radio size={18} className="animate-pulse" />
        Satellite P2P Mode
      </h3>
      {connecting ? (
        <div className="py-8">
          <div className="mx-auto w-12 h-12 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin mb-4" />
          <p className="text-sm text-textMuted animate-pulse">Scanning for mesh network...</p>
        </div>
      ) : connected ? (
        <div className="py-6 bg-teal-50 rounded-xl border border-teal-100">
          <Wifi size={32} className="mx-auto text-teal-500 mb-2" />
          <div className="flex items-center justify-center gap-2 text-sm text-teal-700 font-medium">
            <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
            Connected via WebRTC
          </div>
          <p className="text-xs text-teal-600/70 mt-1">
            {p2pManager.getPeerCount()} active peers in cluster
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-200">
          <QrCode size={40} className="mx-auto text-textMuted mb-2" />
          <p className="text-sm text-textMuted mb-4">Or scan a Hub QR code manually</p>
          <Button variant="secondary" size="sm" className="w-full">Open Camera</Button>
        </div>
      )}
      {!isSatelliteMode && (
        <Button variant="ghost" size="sm" onClick={() => { setMode("idle"); p2pManager.disconnect(); }}>
          Cancel
        </Button>
      )}
    </div>
  );
}
