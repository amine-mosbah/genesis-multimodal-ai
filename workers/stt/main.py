"""
STT Worker - Speech-to-text using Hugging Face Whisper API.
"""
import os
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

app = FastAPI(title="STT Worker")

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
# Using the new router.huggingface.co endpoint (api-inference.huggingface.co is deprecated)
HF_API_URL = os.getenv("STT_MODEL_URL", "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3")


class GenerateRequest(BaseModel):
    """Request for speech-to-text transcription."""
    audio_url: str
    options: Optional[Dict[str, Any]] = {}


class GenerateResponse(BaseModel):
    """Response with transcribed text."""
    text: str


@app.get("/health")
async def health():
    """Health check."""
    return {"status": "healthy", "worker": "stt"}


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """
    Transcribe audio to text using Hugging Face Whisper API.
    
    Options:
    - language: Language code (e.g., "en", "es", "fr")
    """
    if not HF_API_KEY:
        raise HTTPException(status_code=500, detail="HUGGINGFACE_API_KEY not configured")
    
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}"
    }
    
    try:
        # Download audio file
        async with httpx.AsyncClient(timeout=60.0) as client:
            audio_response = await client.get(request.audio_url)
            audio_response.raise_for_status()
            audio_data = audio_response.content
            
            # Call HF Inference API
            # Note: HF expects multipart/form-data for audio
            files = {
                "file": ("audio.wav", audio_data, "audio/wav")
            }
            data = {}
            if request.options.get("language"):
                data["language"] = request.options["language"]
            
            response = await client.post(
                HF_API_URL,
                headers=headers,
                files=files,
                data=data,
                timeout=120.0
            )
            
            if response.status_code == 503:
                # Model is loading, wait and retry
                import asyncio
                await asyncio.sleep(10)
                response = await client.post(
                    HF_API_URL,
                    headers=headers,
                    files=files,
                    data=data,
                    timeout=120.0
                )
            
            response.raise_for_status()
            result = response.json()
            
            # Extract text from response
            if isinstance(result, dict):
                text = result.get("text", "")
            elif isinstance(result, str):
                text = result
            else:
                raise HTTPException(status_code=500, detail="Invalid response format from Hugging Face")
            
            if not text:
                raise HTTPException(status_code=500, detail="Empty transcription result")
            
            return GenerateResponse(text=text)
    
    except httpx.HTTPStatusError as e:
        error_text = e.response.text if hasattr(e.response, 'text') else str(e)
        raise HTTPException(status_code=e.response.status_code, detail=f"Hugging Face API error: {error_text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech-to-text failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
