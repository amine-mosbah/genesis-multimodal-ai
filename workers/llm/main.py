"""
LLM Worker - Text generation using OpenRouter API.
"""
import os
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

app = FastAPI(title="LLM Worker")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = os.getenv("LLM_MODEL", "openai/gpt-3.5-turbo")


class GenerateRequest(BaseModel):
    """Request for text generation."""
    text: str
    options: Optional[Dict[str, Any]] = {}


class GenerateResponse(BaseModel):
    """Response with generated text."""
    text: str


@app.get("/health")
async def health():
    """Health check."""
    return {"status": "healthy", "worker": "llm"}


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """
    Generate text using OpenRouter API.
    
    Options:
    - model: Model ID (default: gpt-3.5-turbo)
    - temperature: Sampling temperature (0-2)
    - max_tokens: Maximum tokens to generate
    """
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")
    
    model = request.options.get("model", DEFAULT_MODEL)
    temperature = request.options.get("temperature", 0.7)
    max_tokens = request.options.get("max_tokens", 500)
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/multimodal-ai-platform",  # Optional
        "X-Title": "Multimodal AI Platform"  # Optional
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": request.text}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(OPENROUTER_BASE_URL, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            # Extract text from response
            if "choices" in data and len(data["choices"]) > 0:
                generated_text = data["choices"][0]["message"]["content"]
                return GenerateResponse(text=generated_text)
            else:
                raise HTTPException(status_code=500, detail="Invalid response from OpenRouter")
    
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"OpenRouter API error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
