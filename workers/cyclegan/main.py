"""
CycleGAN Worker - Image style transformation using Hugging Face Inference API.
"""
import os
import httpx
import uuid
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

app = FastAPI(title="CycleGAN Worker")

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
HF_API_URL = os.getenv("CYCLEGAN_MODEL_URL", "https://api-inference.huggingface.co/models/CompVis/stable-diffusion-v1-4")
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
    
    Note: This is a placeholder implementation. For true CycleGAN,
    you would need a specialized model endpoint. This uses a generic
    image-to-image model as a fallback.
    
    Options:
    - style: Style transformation to apply
    """
    if not HF_API_KEY:
        raise HTTPException(status_code=500, detail="HUGGINGFACE_API_KEY not configured")
    
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}"
    }
    
    try:
        # Download source image
        async with httpx.AsyncClient(timeout=60.0) as client:
            image_response = await client.get(request.image_url)
            image_response.raise_for_status()
            image_data = image_response.content
            
            # For image-to-image, HF expects multipart/form-data
            files = {
                "image": ("image.png", image_data, "image/png")
            }
            data = {}
            if request.options.get("style"):
                data["style"] = request.options["style"]
            
            response = await client.post(
                HF_API_URL,
                headers=headers,
                files=files,
                data=data,
                timeout=120.0
            )
            
            if response.status_code == 503:
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
        error_text = e.response.text if hasattr(e.response, 'text') else str(e)
        raise HTTPException(status_code=e.response.status_code, detail=f"Hugging Face API error: {error_text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image transformation failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
