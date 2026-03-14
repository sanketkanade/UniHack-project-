import os
import json
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

# Ensure env vars are loaded
load_dotenv(os.path.join(os.path.dirname(__file__), "../../..", ".env"), override=True)
load_dotenv(os.path.join(os.path.dirname(__file__), "../../..", ".env.local"), override=True)

try:
    from supabase import create_client, Client
    SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if SUPABASE_URL and SUPABASE_KEY:
        supabase: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY)
    else:
        supabase = None
except ImportError:
    supabase = None

router = APIRouter()

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    user_id: str
    language: Optional[str] = "en"
    conversation_history: List[Message] = []
    connectivity_mode: str = "online"
    is_crisis_active: bool = False
    current_time: str = ""

class ChatResponse(BaseModel):
    reply: str
    detected_language: str
    extracted_data: Optional[Dict[str, Any]] = None
    mode_detected: str

SYSTEM_PROMPT = """
You are the central intelligence for 'Kinship', a neighbourhood emergency resilience app.
Your objective is to dynamically adapt your responses based on the context of the user's message.
You must categorize the user's need into one of 5 modes, and return your ENTIRE response as a valid JSON object matching the requested schema.

The 5 Modes:
1. "onboarding": User is introducing themselves. Extract their name, suburb, capabilities (what they can offer like tools, skills), and needs (what they require like transport, child care).
2. "crisis": User is reporting an active emergency. Query hypothetical cluster data if needed, give calm actionable advice.
3. "neighbourhood_qa": User asks about resources, people, or community plans (e.g., "Who has a chainsaw?").
4. "mental_health": User expresses anxiety, fear, loneliness, or feeling overwhelmed. Acknowledge feelings warmly, offer grounding, remind them their cluster is there to support them, suggest professional help if severe.
5. "multilingual": The user is speaking a language other than English. You must detect the language and respond in the same language. (Fallback mode if others apply but language differs).

IMPORTANT: You must ONLY return a JSON object. No markdown formatting around it, no extra text.
JSON Schema:
{
  "reply": "Your conversational response to the user here. If mental_health mode, be empathetic. If multilingual, translate this reply.",
  "detected_language": "ISO language code (e.g., 'en', 'es', 'vi')",
  "extracted_data": { 
     // For onboarding:
     "name": "", "suburb": "", "capabilities": [], "needs": []
     // For other modes, this can be empty {}
  },
  "mode_detected": "onboarding" | "crisis" | "neighbourhood_qa" | "mental_health" | "multilingual"
}
"""

@router.post("", response_model=ChatResponse)
async def process_chat(request: ChatRequest):
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    cluster_members_str = "None"
    
    if supabase and request.user_id and request.user_id != "anonymous":
        try:
            # 1. Get user profile
            profile_res = supabase.table("profiles").select("cluster_id").eq("id", request.user_id).execute()
            
            if profile_res.data and len(profile_res.data) > 0:
                cluster_id = profile_res.data[0].get("cluster_id")
                
                if cluster_id:
                    # 2. Get cluster members
                    members_res = supabase.table("profiles").select("name, capabilities_offered, current_status").eq("cluster_id", cluster_id).neq("id", request.user_id).execute()
                    
                    if members_res.data:
                        members_arr = []
                        for m in members_res.data:
                            name = m.get("name") or "Unknown"
                            caps_data = m.get("capabilities_offered") or []
                            
                            caps = []
                            if isinstance(caps_data, list):
                                for c in caps_data:
                                    if isinstance(c, dict) and "tag" in c:
                                        caps.append(c["tag"])
                                    elif isinstance(c, str):
                                        caps.append(c)

                            status = m.get("current_status") or "unknown"
                            members_arr.append(f"- {name} (Capabilities: {', '.join(caps)}, Status: {status})")
                        
                        if members_arr:
                            cluster_members_str = "\n".join(members_arr)
        except Exception as e:
            print(f"Supabase query error: {str(e)}")

    dynamic_prompt = f"{SYSTEM_PROMPT}\n\n--- DYNAMIC REALTIME CONTEXT ---\nCurrent Time: {request.current_time}\nConnectivity Mode: {request.connectivity_mode}\nCrisis Active: {request.is_crisis_active}\n\nYour Cluster Members (Real Live Data):\n{cluster_members_str}\n"

    messages = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history]
    messages.append({"role": "user", "content": request.message})

    try:
        groq_api_key = os.getenv("GROQ_API_KEY")
        
        if groq_api_key:
            # ---------------------------------------------------------
            # PRODUCTION: Use Groq Cloud API if key is present
            # ---------------------------------------------------------
            payload = {
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": dynamic_prompt},
                    *messages
                ],
                "stream": False,
                "temperature": 0.2
            }
            
            headers = {
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                reply_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                
        else:
            # ---------------------------------------------------------
            # DEVELOPMENT: Use Local Ollama
            # ---------------------------------------------------------
            payload = {
                "model": "llama3.2",
                "messages": [
                    {"role": "system", "content": dynamic_prompt},
                    *messages
                ],
                "stream": False,
                "options": {
                    "temperature": 0.2
                }
            }
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post("http://localhost:11434/api/chat", json=payload)
                response.raise_for_status()
                data = response.json()
                reply_text = data.get("message", {}).get("content", "")
        
        # Parse Llama's JSON response
        try:
            # Strip potential markdown block syntax
            cleaned_reply = reply_text.strip()
            if cleaned_reply.startswith("```json"):
                cleaned_reply = cleaned_reply[7:-3].strip()
            elif cleaned_reply.startswith("```"):
                cleaned_reply = cleaned_reply[3:-3].strip()
                
            parsed_data = json.loads(cleaned_reply)
            
            return ChatResponse(**{
                "reply": parsed_data.get("reply", "I'm sorry, I couldn't process that properly."),
                "detected_language": parsed_data.get("detected_language", "en"),
                "extracted_data": parsed_data.get("extracted_data", {}),
                "mode_detected": parsed_data.get("mode_detected", "neighbourhood_qa")
            })
        except json.JSONDecodeError:
            # Fallback if Llama fails to return valid JSON
            return ChatResponse(**{
                "reply": reply_text,
                "detected_language": "en",
                "extracted_data": {},
                "mode_detected": "neighbourhood_qa"
            })

    except Exception as e:
        print(f"Chat API error (Ollama): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
