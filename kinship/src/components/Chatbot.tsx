"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Trash2 } from "lucide-react";
import { useKinshipStore } from "@/lib/store";
import { useConnectivity } from "@/lib/ConnectivityContext";
import { db } from "@/lib/db";

interface Message {
  role: "user" | "assistant";
  content: string;
  mode?: string;
  language?: string;
  extractedData?: any;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your Kinship assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [eyesLit, setEyesLit] = useState(false);
  const [eyesBlink, setEyesBlink] = useState(false);
  const [robotBounce, setRobotBounce] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser, isCrisisActive } = useKinshipStore();
  const { mode: connectivityMode } = useConnectivity();

  const isMentalHealthMode = messages.some(m => m.mode === "mental_health");

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  // Blink eyes every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setEyesBlink(true);
      setTimeout(() => setEyesBlink(false), 180);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Light up eyes + increment unread on new assistant message
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && !isOpen) {
      setUnreadCount(c => c + 1);
      setEyesLit(true);
      setTimeout(() => setEyesLit(false), 2000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Clear unread when opened
  useEffect(() => { if (isOpen) setUnreadCount(0); }, [isOpen]);

  const handleOpen = () => {
    setRobotBounce(true);
    setTimeout(() => setRobotBounce(false), 500);
    setIsOpen(true);
  };

  const PROMPT_CHIPS = [
    { text: "Tell me about your household", color: "teal" },
    { text: "Who in my cluster can drive?", color: "teal" },
    { text: "I need medical help nearby", color: "teal" },
    { text: "Aiutami", color: "teal" },
    { text: "I am feeling overwhelmed", color: "purple" },
    { text: "I am scared and alone", color: "purple" },
  ];

  const handleSend = async (e?: React.FormEvent, preset?: string) => {
    e?.preventDefault();
    const messageText = preset || input.trim();
    if (!messageText || isLoading) return;

    const newMessages = [...messages, { role: "user" as const, content: messageText }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: newMessages,
          userId: currentUser?.id,
          connectivityMode,
          isCrisisActive
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: data.reply,
        mode: data.mode,
        language: data.language,
        extractedData: data.data
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      
      // Offline / P2P Local Fallback
      if (connectivityMode === "offline" || connectivityMode === "p2p") {
        const lowerInput = messageText.toLowerCase();
        let fallbackReply = "You are currently offline — your cluster data is available below.";
        let mode = "neighbourhood_qa";
        
        if (lowerInput.includes("overwhelmed") || lowerInput.includes("alone") || lowerInput.includes("scared")) {
          mode = "mental_health";
          fallbackReply = "Connection lost. I know things feel difficult right now, and being offline can make it harder. Please remember to breathe. Your community is physically nearby and you are not alone.";
        } else if (lowerInput.includes("crisis") || lowerInput.includes("help") || lowerInput.includes("medical") || lowerInput.includes("emergency") || lowerInput.includes("aiutami")) {
          mode = "crisis";
          fallbackReply = "⚠️ OFFLINE CRISIS MODE: Network unreachable. Stay calm. Your cached cluster members are listed below. If this is a life-threatening emergency, call 000 (satellite SOS may work on modern devices without cell towers).";
        }
        
        try {
          if (mode !== "mental_health") {
            const profiles = await db.profiles.toArray();
            const caps = await db.capabilities.toArray();
            
            const neighbors = profiles.filter(p => p.id !== currentUser?.id);
            if (neighbors.length > 0) {
              fallbackReply += "\n\n**Cached Neighbors:**\n" + neighbors.map(p => {
                const userCaps = caps.filter(c => c.user_id === p.id).map(c => c.category).join(", ");
                return `- ${p.name} (${p.suburb})${userCaps ? ` [Offers: ${userCaps}]` : ''}`;
              }).join("\n");
            } else {
              fallbackReply += "\n\n*(No local neighbours found in Dexie cache)*";
            }
          }
        } catch (dbError) {
          console.error("Dexie read failed:", dbError);
        }

        setMessages((prev) => [...prev, { 
          role: "assistant", 
          content: fallbackReply,
          mode: mode 
        }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I'm having trouble connecting to the Kinship AI server right now." }
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      { role: "assistant", content: "Chat cleared. What else can I help with?" }
    ]);
  };

  return (
    <>
      {/* ── Robot animations CSS ── */}
      <style jsx global>{`
        @keyframes robotBreathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.04); }
        }
        .robot-breathe { animation: robotBreathe 3s ease-in-out infinite; }

        @keyframes robotBounce {
          0%  { transform: scale(1) translateY(0); }
          30% { transform: scale(0.92) translateY(4px); }
          60% { transform: scale(1.08) translateY(-6px); }
          80% { transform: scale(0.97) translateY(2px); }
          100%{ transform: scale(1) translateY(0); }
        }
        .robot-bounce { animation: robotBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }

        @keyframes antennaWiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-18deg); }
          75% { transform: rotate(18deg); }
        }
        .antenna-group:hover .antenna-left { animation: antennaWiggle 0.4s ease-in-out 0.05s; }
        .antenna-group:hover .antenna-right { animation: antennaWiggle 0.4s ease-in-out 0s; }
        .antenna-excited .antenna-left { animation: antennaWiggle 0.35s ease-in-out 0s infinite !important; }
        .antenna-excited .antenna-right { animation: antennaWiggle 0.35s ease-in-out 0.12s infinite !important; }

        @keyframes eyeGlow {
          0%,100% { filter: brightness(1); }
          50% { filter: brightness(1.6) drop-shadow(0 0 3px white); }
        }
        .eye-lit { animation: eyeGlow 0.6s ease-in-out 3; }

        @keyframes notifPop {
          0%  { transform: scale(0); }
          70% { transform: scale(1.3); }
          100%{ transform: scale(1); }
        }
        .notif-dot { animation: notifPop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards; }

        @keyframes slideUpSpring {
          0%  { opacity: 0; transform: translateY(20px) scale(0.96); }
          100%{ opacity: 1; transform: translateY(0) scale(1); }
        }
        .chat-slide-in { animation: slideUpSpring 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>

      {/* ── Robot FAB ── */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-[100px] right-6 z-[1001] transition-all duration-300 ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
        aria-label="Open Kinship Assistant"
      >
        <div className={`antenna-group relative ${robotBounce ? 'robot-bounce' : 'robot-breathe'} drop-shadow-xl`}>
          {/* Notification dot */}
          {unreadCount > 0 && (
            <div className="notif-dot absolute -top-1 -right-1 z-10 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}

          <svg width="76" height="84" viewBox="0 0 56 62" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Left antenna */}
            <g className="antenna-left" style={{ transformOrigin: "18px 14px" }}>
              <line x1="18" y1="14" x2="12" y2="4" stroke="#00B4A6" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="12" cy="3" r="2.5" fill={eyesLit ? "#ffffff" : "#00eadd"} />
            </g>
            {/* Right antenna */}
            <g className="antenna-right" style={{ transformOrigin: "38px 14px" }}>
              <line x1="38" y1="14" x2="44" y2="4" stroke="#00B4A6" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="44" cy="3" r="2.5" fill={eyesLit ? "#ffffff" : "#00eadd"} />
            </g>
            {/* Robot head */}
            <rect x="8" y="14" width="40" height="36" rx="9" fill="#00B4A6" />
            {/* Head shine */}
            <ellipse cx="20" cy="19" rx="7" ry="4" fill="rgba(255,255,255,0.18)" />
            {/* Left eye */}
            <circle cx="21" cy="28" r="5" fill="rgba(255,255,255,0.15)" />
            <circle
              cx="21" cy="28" r={eyesBlink ? 1 : 3.5}
              fill={eyesLit ? "#ffffff" : "#e0fffe"}
              className={eyesLit ? "eye-lit" : ""}
              style={{ transition: "r 60ms ease" }}
            />
            {/* Right eye */}
            <circle cx="35" cy="28" r="5" fill="rgba(255,255,255,0.15)" />
            <circle
              cx="35" cy="28" r={eyesBlink ? 1 : 3.5}
              fill={eyesLit ? "#ffffff" : "#e0fffe"}
              className={eyesLit ? "eye-lit" : ""}
              style={{ transition: "r 60ms ease" }}
            />
            {/* Mouth: smile or concerned */}
            {isMentalHealthMode ? (
              <path d="M20 40 Q28 36 36 40" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
            ) : (
              <path d="M20 38 Q28 44 36 38" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
            )}
            {/* Chin bolts */}
            <circle cx="16" cy="46" r="2" fill="rgba(255,255,255,0.35)" />
            <circle cx="40" cy="46" r="2" fill="rgba(255,255,255,0.35)" />
            {/* Neck */}
            <rect x="22" y="50" width="12" height="6" rx="3" fill="#009e91" />
            {/* Body base */}
            <rect x="14" y="56" width="28" height="6" rx="4" fill="#00a89b" />
          </svg>
        </div>
      </button>

      {/* Chat Modal */}
      <div 
        className={`fixed z-[1001] flex flex-col bg-white shadow-2xl transition-all duration-300 ease-out sm:rounded-2xl border border-gray-100 overflow-hidden
        ${isOpen 
          ? "bottom-0 right-0 w-full h-full sm:bottom-6 sm:right-6 sm:w-96 sm:h-[600px] sm:max-h-[calc(100vh-48px)] opacity-100 pointer-events-auto chat-slide-in" 
          : "bottom-6 right-6 w-96 h-[600px] opacity-0 pointer-events-none transform translate-y-8 scale-95"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 text-white shadow-sm shrink-0 transition-colors ${isMentalHealthMode ? 'bg-mentalHealth' : 'bg-primary'}`}>
          <div className="flex items-center gap-2">
            {/* Mini robot icon */}
            <svg width="22" height="22" viewBox="0 0 56 56" fill="none">
              <rect x="8" y="14" width="40" height="32" rx="9" fill="rgba(255,255,255,0.25)" />
              <circle cx="21" cy="28" r="4" fill="white" opacity="0.9" />
              <circle cx="35" cy="28" r="4" fill="white" opacity="0.9" />
              {isMentalHealthMode
                ? <path d="M20 40 Q28 36 36 40" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                : <path d="M20 38 Q28 44 36 38" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              }
            </svg>
            <h3 className="font-semibold">{isMentalHealthMode ? 'You are not alone' : 'Kinship Guide'}</h3>
          </div>
          <div className="flex items-center gap-1">
            {isMentalHealthMode && (
              <a 
                href="https://www.lifeline.org.au/" 
                target="_blank" 
                rel="noreferrer"
                className="mr-2 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors font-medium border border-white/20"
              >
                Resources
              </a>
            )}
            <button 
              onClick={handleClear}
              className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
              aria-label="Clear chat history"
              title="Clear Chat"
            >
              <Trash2 size={16} />
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
              aria-label="Close Chat"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Dynamic Banners */}
        {isMentalHealthMode && (
          <div className="bg-purple-50 text-purple-900 px-4 py-2.5 text-xs border-b border-purple-100 flex flex-col gap-1 shrink-0">
            <p className="font-medium text-purple-800">Your cluster neighbours are nearby.</p>
            <p className="opacity-80">Crisis Support: Lifeline 13 11 14 | Beyond Blue 1300 22 4636</p>
          </div>
        )}

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {messages.map((msg, idx) => {
            const isMentalHealth = msg.mode === "mental_health";
            const isNonEnglish = msg.language && msg.language !== "en";
            const bubbleColor = msg.role === "user" 
              ? "bg-primary text-white rounded-br-sm shadow-sm" 
              : isMentalHealth 
                ? "bg-mentalHealth/10 border border-mentalHealth/20 text-textDark rounded-bl-sm shadow-sm"
                : "bg-white border border-gray-100 text-textDark rounded-bl-sm shadow-sm";

            return (
              <div 
                key={idx} 
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${bubbleColor}`}>
                  {isNonEnglish && msg.role === "assistant" && <span className="mr-2" title="Translated output">🌐</span>}
                  {msg.content}

                  {/* Inline actions based on Extracted Data */}
                  {msg.extractedData && msg.extractedData.name && (
                    <div className="mt-3 pt-3 border-t border-teal-100/30 flex flex-col gap-2">
                      <p className="text-xs opacity-90">I noticed you shared some profile details. Want to save them?</p>
                      <button 
                        onClick={() => alert("Profile update logic would go here!")}
                        className="text-xs bg-primary text-white px-3 py-1.5 rounded-md hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all w-full font-medium"
                      >
                        Save to your profile
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1 items-center h-[42px]">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Chips */}
        {messages.length === 1 && (
          <div className="px-3 pt-3 flex flex-wrap gap-2 shrink-0 bg-white border-t border-gray-100">
            {PROMPT_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(undefined, chip.text)}
                disabled={isLoading}
                className={`text-[11px] font-medium px-2.5 py-1.5 rounded-full border transition-all active:scale-95 ${
                  chip.color === 'teal' 
                    ? 'border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 shadow-sm' 
                    : 'border-mentalHealth/30 bg-mentalHealth/5 text-mentalHealth hover:bg-mentalHealth/10 shadow-sm'
                }`}
              >
                {chip.text}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 bg-white border-t border-gray-100 shrink-0">
          <form 
            onSubmit={handleSend}
            className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pr-1 pl-4 py-1.5 focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent transition-all"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent py-2 text-sm outline-none text-gray-800 placeholder:text-gray-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`p-2 w-10 h-10 flex items-center justify-center text-white rounded-full transition-transform transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 ${
                isMentalHealthMode 
                  ? 'bg-mentalHealth shadow-md shadow-mentalHealth/20' 
                  : 'bg-primary shadow-md shadow-primary/20'
              }`}
            >
              <Send size={18} className="translate-x-[1px]" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
