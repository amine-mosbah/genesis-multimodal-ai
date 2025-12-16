"""
CycleGAN Worker - Image style transformation using Hugging Face Inference API.
"""
import os
import httpx
import uuid
import base64
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

app = FastAPI(title="CycleGAN Worker")

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
# Using instruct-pix2pix for image-to-image transformation
HF_API_URL = os.getenv("CYCLEGAN_MODEL_URL", "https://router.huggingface.co/hf-inference/models/timbrooks/instruct-pix2pix")
STORAGE_PATH = os.getenv("STORAGE_PATH", "/data/images")


class GenerateRequest(BaseModel):
    """Request for image-to-image transformation."""
    image_url: str
    options: Optional[Dict[str, Any]] = {}


class GenerateResponse(BaseModel):
    """Response with transformed image URL."""
    image_url: str


@app.get("/health")
async def health():
    """Health check."""
    return {"status": "healthy", "worker": "cyclegan"}


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """
    Transform image style using Hugging Face Inference API.
    
    Uses instruct-pix2pix model for image transformation.
    
    Options:
    - style: Style/instruction for transformation (e.g., "make it look like a painting")
    - prompt: Alternative to style - instruction for the transformation
    """
    if not HF_API_KEY:
        raise HTTPException(status_code=500, detail="HUGGINGFACE_API_KEY not configured")
    
    # Get transformation instruction
    instruction = request.options.get("style") or request.options.get("prompt") or "transform this image into an artistic style"
    
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            # Download source image
            image_response = await client.get(request.image_url)
            image_response.raise_for_status()
            image_data = image_response.content
            
            # Encode image to base64
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # Prepare payload for instruct-pix2pix
            payload = {
                "inputs": {
                    "image": image_base64,
                    "prompt": instruction
                },
                "parameters": {
                    "num_inference_steps": 20,
                    "image_guidance_scale": 1.5,
                    "guidance_scale": 7.5
                }
            }
            
            response = await client.post(
                HF_API_URL,
                json=payload,
                headers=headers,
                timeout=180.0
            )
            
            # Handle model loading
            if response.status_code == 503:
                import asyncio
                data = response.json()
                wait_time = min(data.get("estimated_time", 20), 60)
                await asyncio.sleep(wait_time)
                response = await client.post(
                    HF_API_URL,
                    json=payload,
                    headers=headers,
                    timeout=180.0
                )
            
            response.raise_for_status()
            
            # HF returns image bytes
            image_bytes = response.content
            if not image_bytes or len(image_bytes) < 100:
                raise HTTPException(status_code=500, detail="Invalid image response from Hugging Face")
            
            # Save transformed image
            image_id = str(uuid.uuid4())
            image_filename = f"{image_id}.png"
            image_path = os.path.join(STORAGE_PATH, image_filename)
            
            Path(image_path).parent.mkdir(parents=True, exist_ok=True)
            with open(image_path, "wb") as f:
                f.write(image_bytes)
            
            image_url = f"/storage/images/{image_filename}"
            
            return GenerateResponse(image_url=image_url)
    
    except httpx.HTTPStatusError as e:
        error_text = ""
        try:
            error_text = e.response.text
        except:
            error_text = str(e)
        raise HTTPException(status_code=e.response.status_code, detail=f"Hugging Face API error: {error_text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image transformation failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
