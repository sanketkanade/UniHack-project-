"use client";

import { useConnectivity, ConnectivityMode } from "@/lib/ConnectivityContext";

export function ConnectivityStatusButton() {
  const { mode, cycleMode } = useConnectivity();

  return (
    <>
      <style jsx global>{`
        /* ── Online: wifi rings ── */
        @keyframes wifiRing {
          0%   { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .wifi-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid #22c55e;
          animation: wifiRing 1.8s ease-out infinite;
        }
        .wifi-ring-2 { animation-delay: 0.6s; }
        .wifi-ring-3 { animation-delay: 1.2s; }

        /* ── Offline: slow amber pulse ── */
        @keyframes offlinePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
          50%       { box-shadow: 0 0 0 8px rgba(245,158,11,0); }
        }
        .offline-orb { animation: offlinePulse 2s ease-in-out infinite; }

        /* ── P2P: orbiting satellite ── */
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(20px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(20px) rotate(-360deg); }
        }
        .satellite-orbit {
          position: absolute;
          width: 12px;
          height: 12px;
          top: calc(50% - 6px);
          left: calc(50% - 6px);
          animation: orbit 2.2s linear infinite;
        }

        /* ── P2P: star field ── */
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; }
          50%       { opacity: 0.9; }
        }
        .star { position: absolute; border-radius: 50%; background: white; animation: twinkle 2s ease-in-out infinite; }

        /* ── P2P: travelling dot on label ── */
        @keyframes travelDot {
          0%   { transform: translateX(-4px); opacity: 0; }
          30%  { opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translateX(52px); opacity: 0; }
        }
        .travel-dot {
          position: absolute;
          bottom: -3px;
          left: 0;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(255,255,255,0.8);
          animation: travelDot 2s linear infinite;
        }

        /* ── Shared orb glow ── */
        .orb-online  { background: radial-gradient(circle at 35% 35%, #4ade80, #16a34a); box-shadow: 0 0 12px 3px rgba(34,197,94,0.55); }
        .orb-offline { background: radial-gradient(circle at 35% 35%, #fbbf24, #d97706); }
        .orb-p2p     { background: radial-gradient(circle at 35% 35%, #2dd4bf, #0d9488); box-shadow: 0 0 14px 4px rgba(45,212,191,0.5); }

        /* ── Shared button ── */
        .conn-btn {
          position: fixed;
          bottom: 100px;
          left: 24px;
          z-index: 1001;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px 10px 10px;
          border-radius: 50px;
          border: none;
          cursor: pointer;
          user-select: none;
          font-family: inherit;
          font-weight: 600;
          font-size: 13px;
          color: white;
          backdrop-filter: blur(8px);
          transition: transform 300ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 300ms ease;
        }
        .conn-btn:hover  { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
        .conn-btn:active { transform: scale(0.95); }
        .conn-btn-online  { background: rgba(22,101,52,0.85); }
        .conn-btn-offline { background: rgba(120,53,15,0.85); }
        .conn-btn-p2p     { background: rgba(19,53,78,0.92); }

        .orb-wrap {
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .orb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          position: relative;
          z-index: 1;
        }
        .label-rel { position: relative; }
      `}</style>

      <button
        onClick={cycleMode}
        id="connectivity-status-button"
        className={`conn-btn conn-btn-${mode}`}
        aria-label={`Connectivity mode: ${mode}. Click to change.`}
      >
        {/* ── Orb ── */}
        <div className="orb-wrap">
          {/* Online wifi rings */}
          {mode === "online" && (
            <>
              <div className="wifi-ring" />
              <div className="wifi-ring wifi-ring-2" />
              <div className="wifi-ring wifi-ring-3" />
            </>
          )}

          {/* P2P star field */}
          {mode === "p2p" && (
            <>
              <div className="star" style={{ width:2,height:2, top:"6px", left:"5px", animationDelay:"0s" }} />
              <div className="star" style={{ width:2,height:2, top:"22px", left:"25px", animationDelay:"0.7s" }} />
              <div className="star" style={{ width:2,height:2, top:"8px", left:"24px", animationDelay:"1.4s" }} />
            </>
          )}

          {/* P2P orbiting satellite */}
          {mode === "p2p" && (
            <div className="satellite-orbit">
              <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="4" height="4" rx="1" fill="white" opacity="0.9" />
                <rect x="0" y="5" width="4" height="2" rx="0.5" fill="white" opacity="0.7" />
                <rect x="8" y="5" width="4" height="2" rx="0.5" fill="white" opacity="0.7" />
              </svg>
            </div>
          )}

          {/* Orb sphere */}
          <div className={`orb orb-${mode} ${mode === "offline" ? "offline-orb" : ""}`}>
            {/* offline broken wifi icon */}
            {mode === "offline" && (
              <svg viewBox="0 0 20 20" fill="none" style={{width:12,height:12,margin:"auto",display:"block",marginTop:4}}>
                <path d="M2 2l16 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M10 15.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" fill="white" />
              </svg>
            )}
            {/* online wifi icon */}
            {mode === "online" && (
              <svg viewBox="0 0 20 20" fill="none" style={{width:12,height:12,margin:"auto",display:"block",marginTop:4}}>
                <path d="M2 8a11.3 11.3 0 0 1 16 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M5 11a7 7 0 0 1 10 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="10" cy="15" r="1.25" fill="white" />
              </svg>
            )}
            {/* p2p signal icon */}
            {mode === "p2p" && (
              <svg viewBox="0 0 20 20" fill="none" style={{width:12,height:12,margin:"auto",display:"block",marginTop:4}}>
                <circle cx="10" cy="10" r="2" fill="white" />
                <path d="M10 3v3M10 14v3M3 10h3M14 10h3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </div>
        </div>

        {/* ── Label ── */}
        <div className="label-rel">
          <span style={{ letterSpacing: "0.01em" }}>
            {mode === "online"  && "Online"}
            {mode === "offline" && "Offline — Cached"}
            {mode === "p2p"    && "Satellite P2P Active"}
          </span>
          {mode === "p2p" && <div className="travel-dot" />}
        </div>

        {/* ── Mode indicator dots ── */}
        <div style={{ display:"flex", gap:4, marginLeft:2 }}>
          {(["online","offline","p2p"] as ConnectivityMode[]).map((m) => (
            <div key={m} style={{
              width: 5, height: 5, borderRadius: "50%",
              background: mode === m ? "white" : "rgba(255,255,255,0.3)",
              transition: "background 300ms",
            }} />
          ))}
        </div>
      </button>
    </>
  );
}
