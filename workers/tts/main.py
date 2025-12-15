"""
TTS Worker - Text-to-speech using Hugging Face TTS API.
"""
import os
import httpx
import uuid
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

app = FastAPI(title="TTS Worker")

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
HF_API_URL = os.getenv("TTS_MODEL_URL", "https://api-inference.huggingface.co/models/espnet/kan-bayashi_ljspeech_vits")
STORAGE_PATH = os.getenv("STORAGE_PATH", "/data/audio")


class GenerateRequest(BaseModel):
    """Request for text-to-speech generation."""
    text: str
    options: Optional[Dict[str, Any]] = {}


class GenerateResponse(BaseModel):
    """Response with generated audio URL."""
    audio_url: str


@app.get("/health")
async def health():
    """Health check."""
    return {"status": "healthy", "worker": "tts"}


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """
    Generate speech audio from text using Hugging Face TTS API.
    
    Options:
    - language: Language code (e.g., "en", "es")
    - speaker: Speaker ID (model-dependent)
    """
    if not HF_API_KEY:
        raise HTTPException(status_code=500, detail="HUGGINGFACE_API_KEY not configured")
    
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "inputs": request.text
    }
    
    # Add optional parameters
    if request.options.get("language"):
        payload["parameters"] = {"language": request.options["language"]}
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(HF_API_URL, json=payload, headers=headers)
            
            if response.status_code == 503:
                # Model is loading, wait and retry
                import asyncio
                await asyncio.sleep(10)
                response = await client.post(HF_API_URL, json=payload, headers=headers)
            
            response.raise_for_status()
            
            # HF returns audio bytes directly
            audio_bytes = response.content
            if not audio_bytes or len(audio_bytes) < 100:
                raise HTTPException(status_code=500, detail="Invalid audio response from Hugging Face")
            
            # Save audio locally
            audio_id = str(uuid.uuid4())
            audio_filename = f"{audio_id}.wav"
            audio_path = os.path.join(STORAGE_PATH, audio_filename)
            
            Path(audio_path).parent.mkdir(parents=True, exist_ok=True)
            with open(audio_path, "wb") as f:
                f.write(audio_bytes)
            
            # Return URL
            audio_url = f"/storage/audio/{audio_filename}"
            
            return GenerateResponse(audio_url=audio_url)
    
    except httpx.HTTPStatusError as e:
        error_text = e.response.text if hasattr(e.response, 'text') else str(e)
        raise HTTPException(status_code=e.response.status_code, detail=f"Hugging Face API error: {error_text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text-to-speech failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
