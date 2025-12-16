"""
Image Worker - Image generation using Hugging Face Inference API.
"""
import os
import httpx
import uuid
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

app = FastAPI(title="Image Worker")

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
# Using the new router.huggingface.co endpoint (api-inference.huggingface.co is deprecated)
HF_API_URL = os.getenv("IMAGE_MODEL_URL", "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0")
STORAGE_PATH = os.getenv("STORAGE_PATH", "/data/images")

# Fallback models if the primary one fails
FALLBACK_MODELS = [
    "https://router.huggingface.co/hf-inference/models/runwayml/stable-diffusion-v1-5",
    "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-2-1",
]


class GenerateRequest(BaseModel):
    """Request for image generation."""
    prompt: str
    options: Optional[Dict[str, Any]] = {}


class GenerateResponse(BaseModel):
    """Response with generated image URL."""
    image_url: str


@app.get("/health")
async def health():
    """Health check."""
    return {"status": "healthy", "worker": "image"}


async def download_image(url: str, save_path: str) -> str:
    """Download image from URL and save locally."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        
        Path(save_path).parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, "wb") as f:
            f.write(response.content)
        
        return save_path


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """
    Generate image using Hugging Face Inference API.
    
    Options:
    - quality: "low", "medium", "high" (affects steps/guidance)
    - aspect_ratio: "1:1", "16:9", "9:16" (TODO: implement)
    - style: style modifier (prepended to prompt)
    """
    if not HF_API_KEY:
        raise HTTPException(status_code=500, detail="HUGGINGFACE_API_KEY not configured")
    
    # Build prompt
    prompt = request.prompt
    if request.options.get("style"):
        prompt = f"{request.options['style']} style, {prompt}"
    
    # Configure generation parameters
    quality = request.options.get("quality", "high")
    num_inference_steps = {"low": 20, "medium": 40, "high": 50}.get(quality, 50)
    
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "inputs": prompt,
        "parameters": {
            "num_inference_steps": num_inference_steps,
            "guidance_scale": 7.5
        }
    }
    
    # Try primary model first, then fallbacks
    models_to_try = [HF_API_URL] + FALLBACK_MODELS
    last_error = None
    
    for model_url in models_to_try:
        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                response = await client.post(model_url, json=payload, headers=headers)
                
                # Handle model loading (503)
                if response.status_code == 503:
                    import asyncio
                    estimated_time = 20
                    try:
                        data = response.json()
                        estimated_time = data.get("estimated_time", 20)
                    except:
                        pass
                    await asyncio.sleep(min(estimated_time, 30))
                    response = await client.post(model_url, json=payload, headers=headers)
                
                # Handle unavailable model (410, 404) - try next
                if response.status_code in [410, 404]:
                    last_error = f"Model unavailable at {model_url}"
                    continue
                
                response.raise_for_status()
                
                # HF returns image bytes directly
                image_bytes = response.content
                if not image_bytes or len(image_bytes) < 100:
                    last_error = "Invalid image response"
                    continue
                
                # Save image locally
                image_id = str(uuid.uuid4())
                image_filename = f"{image_id}.png"
                image_path = os.path.join(STORAGE_PATH, image_filename)
                
                Path(image_path).parent.mkdir(parents=True, exist_ok=True)
                with open(image_path, "wb") as f:
                    f.write(image_bytes)
                
                # Return URL
                image_url = f"/storage/images/{image_filename}"
                return GenerateResponse(image_url=image_url)
        
        except httpx.HTTPStatusError as e:
            last_error = f"API error: {e.response.status_code}"
            if e.response.status_code not in [410, 404, 503]:
                error_text = e.response.text if hasattr(e.response, 'text') else str(e)
                raise HTTPException(status_code=e.response.status_code, detail=f"Hugging Face API error: {error_text}")
            continue
        except Exception as e:
            last_error = str(e)
            continue
    
    # All models failed
    raise HTTPException(status_code=500, detail=f"Image generation failed with all models. Last error: {last_error}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
