"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Trash2 } from "lucide-react";
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
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 bg-teal-600 text-white rounded-full shadow-xl hover:bg-teal-700 transition-transform active:scale-95 ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
        aria-label="Open Chat"
      >
        <MessageCircle size={24} />
      </button>

      {/* Chat Modal */}
      <div 
        className={`fixed z-50 flex flex-col bg-white shadow-2xl transition-all duration-300 ease-out sm:rounded-2xl border border-gray-100 overflow-hidden
        ${isOpen 
          ? "bottom-0 right-0 w-full h-full sm:bottom-6 sm:right-6 sm:w-96 sm:h-[600px] sm:max-h-[calc(100vh-48px)] opacity-100 pointer-events-auto transform translate-y-0" 
          : "bottom-6 right-6 w-96 h-[600px] opacity-0 pointer-events-none transform translate-y-8 scale-95"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 text-white shadow-sm shrink-0 transition-colors ${isMentalHealthMode ? 'bg-[#7C3AED]' : 'bg-teal-600'}`}>
          <div className="flex items-center gap-2">
            <MessageCircle size={20} />
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
              ? "bg-teal-600 text-white rounded-br-sm" 
              : isMentalHealth 
                ? "bg-purple-100 border border-purple-200 text-purple-900 rounded-bl-sm shadow-sm"
                : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm";

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
                        className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-md hover:bg-teal-700 transition w-full font-medium"
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
                className={`text-[11px] font-medium px-2.5 py-1.5 rounded-full border transition-colors ${
                  chip.color === 'teal' 
                    ? 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100' 
                    : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
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
            className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pr-1 pl-4 py-1 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all"
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
              className={`p-2 text-white rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                isMentalHealthMode 
                  ? 'bg-[#7C3AED] hover:bg-purple-700 disabled:hover:bg-[#7C3AED]' 
                  : 'bg-teal-600 hover:bg-teal-700 disabled:hover:bg-teal-600'
              }`}
            >
              <Send size={16} className="-ml-0.5 mt-0.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
