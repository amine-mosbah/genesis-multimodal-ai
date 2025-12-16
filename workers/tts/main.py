"""
TTS Worker - Text-to-speech using ElevenLabs API.
"""
import os
import httpx
import uuid
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

app = FastAPI(title="TTS Worker")

# ElevenLabs API configuration
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech"
STORAGE_PATH = os.getenv("STORAGE_PATH", "/data/audio")

# Default voice ID (Rachel - clear, natural voice)
DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"

# Available voices (common ones)
VOICES = {
    "rachel": "21m00Tcm4TlvDq8ikWAM",
    "domi": "AZnzlk1XvdvUeBnXmlld",
    "bella": "EXAVITQu4vr4xnSDxMaL",
    "antoni": "ErXwobaYiN019PkySvjV",
    "josh": "TxGEqnHWrfWFTfGW9XjX",
    "arnold": "VR6AewLTigWG4xSOukaG",
    "adam": "pNInz6obpgDQGcFmaJgB",
    "sam": "yoZ06aMxZJJ28mfd3POQ",
}


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
    return {"status": "healthy", "worker": "tts", "provider": "elevenlabs"}


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """
    Generate speech audio from text using ElevenLabs API.
    
    Options:
    - voice: Voice name (rachel, domi, bella, antoni, josh, arnold, adam, sam)
    - stability: Voice stability (0.0-1.0, default 0.5)
    - similarity_boost: Similarity boost (0.0-1.0, default 0.75)
    """
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY not configured")
    
    # Get voice ID from options or use default
    voice_name = request.options.get("voice", "rachel").lower()
    voice_id = VOICES.get(voice_name, DEFAULT_VOICE_ID)
    
    # Voice settings
    stability = request.options.get("stability", 0.5)
    similarity_boost = request.options.get("similarity_boost", 0.75)
    
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
    }
    
    payload = {
        "text": request.text,
        "model_id": "eleven_turbo_v2_5",  # Using the latest turbo model
        "voice_settings": {
            "stability": stability,
            "similarity_boost": similarity_boost
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{ELEVENLABS_API_URL}/{voice_id}",
                json=payload,
                headers=headers
            )
            
            response.raise_for_status()
            
            # ElevenLabs returns audio bytes directly (MP3)
            audio_bytes = response.content
            if not audio_bytes or len(audio_bytes) < 100:
                raise HTTPException(status_code=500, detail="Invalid audio response from ElevenLabs")
            
            # Save audio locally
            audio_id = str(uuid.uuid4())
            audio_filename = f"{audio_id}.mp3"
            audio_path = os.path.join(STORAGE_PATH, audio_filename)
            
            Path(audio_path).parent.mkdir(parents=True, exist_ok=True)
            with open(audio_path, "wb") as f:
                f.write(audio_bytes)
            
            # Return URL
            audio_url = f"/storage/audio/{audio_filename}"
            
            return GenerateResponse(audio_url=audio_url)
    
    except httpx.HTTPStatusError as e:
        error_text = e.response.text if hasattr(e.response, 'text') else str(e)
        raise HTTPException(status_code=e.response.status_code, detail=f"ElevenLabs API error: {error_text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text-to-speech failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
