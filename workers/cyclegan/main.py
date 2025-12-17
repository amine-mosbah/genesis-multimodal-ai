"""
CycleGAN Worker - Image-to-image transformation using ModelLab API.
"""
import os
import httpx
import uuid
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="CycleGAN Worker")

MODELSLAB_API_KEY = os.getenv("MODELSLAB_API_KEY")
MODELSLAB_API_URL = os.getenv("MODELSLAB_API_URL", "https://modelslab.com/api/v6/images/img2img")
MODELSLAB_MODEL_ID = os.getenv("MODELSLAB_MODEL_ID", "flux-kontext-dev")  # Default model (doesn't require scheduler)
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
    return {
        "status": "healthy",
        "worker": "cyclegan",
        "provider": "modelslab",
        "api_configured": MODELSLAB_API_KEY is not None,
        "api_url": MODELSLAB_API_URL
    }


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """
    Transform image style using ModelLab API.
    
    Options:
    - style: Style/instruction for transformation (e.g., "make it look like a painting")
    - prompt: Alternative to style - instruction for the transformation
    - negative_prompt: What to avoid in the image
    - strength: Transformation strength (0.0-1.0, default 0.8). Higher = more transformation
    - model_id: Model ID to use (default: dreamshaper_8)
    - width: Image width (max 1024, default: auto from input)
    - height: Image height (max 1024, default: auto from input)
    - num_inference_steps: Denoising steps (1-20, default: 20)
    - guidance_scale: Guidance scale (1-20, default: 7.5)
    """
    if not MODELSLAB_API_KEY:
        raise HTTPException(status_code=500, detail="MODELSLAB_API_KEY not configured")
    
    # Get transformation instruction
    prompt = request.options.get("style") or request.options.get("prompt") or "transform this image into an artistic style"
    negative_prompt = request.options.get("negative_prompt", "")
    strength = float(request.options.get("strength", 0.8))
    model_id = request.options.get("model_id", MODELSLAB_MODEL_ID)
    width = request.options.get("width")
    height = request.options.get("height")
    num_inference_steps = int(request.options.get("num_inference_steps", 20))
    guidance_scale = float(request.options.get("guidance_scale", 7.5))
    
    # Validate strength
    strength = max(0.0, min(1.0, strength))
    num_inference_steps = max(1, min(20, num_inference_steps))
    guidance_scale = max(1.0, min(20.0, guidance_scale))
    
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            # Verify image URL is accessible
            try:
                image_check = await client.head(request.image_url, timeout=10.0)
                image_check.raise_for_status()
            except:
                # If HEAD fails, try GET
                try:
                    image_check = await client.get(request.image_url, timeout=10.0)
                    image_check.raise_for_status()
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Image URL is not accessible: {str(e)}")
            
            # Prepare payload for ModelLab API
            payload = {
                "key": MODELSLAB_API_KEY,
                "model_id": model_id,
                "init_image": request.image_url,
                "prompt": prompt,
                "strength": strength,
                "num_inference_steps": num_inference_steps,
                "guidance_scale": guidance_scale,
                "samples": 1,
                "base64": False,  # Get URLs instead of base64
                "safety_checker": False
            }
            
            # Add scheduler only if not using flux-kontext-dev (which doesn't require it)
            if model_id != "flux-kontext-dev":
                payload["scheduler"] = request.options.get("scheduler", "DPMSolverMultistepScheduler")
            
            # Add optional parameters
            if negative_prompt:
                payload["negative_prompt"] = negative_prompt
            if width:
                payload["width"] = min(1024, max(1, int(width)))
            if height:
                payload["height"] = min(1024, max(1, int(height)))
            
            # Make initial request
            response = await client.post(
                MODELSLAB_API_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=180.0
            )
            
            # Handle different response statuses
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid ModelLab API key")
            elif response.status_code == 429:
                raise HTTPException(status_code=429, detail="ModelLab API rate limit exceeded")
            elif response.status_code == 400:
                error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                error_msg = error_data.get("message", response.text)
                raise HTTPException(status_code=400, detail=f"ModelLab API error: {error_msg}")
            
            response.raise_for_status()
            result = response.json()
            
            # Handle processing status (polling)
            max_polls = 30
            poll_count = 0
            
            while result.get("status") == "processing" and poll_count < max_polls:
                fetch_url = result.get("fetch_result")
                
                # Check if we have future_links (image might be ready)
                future_links = result.get("future_links", [])
                if future_links and len(future_links) > 0:
                    # Try to use the future link directly
                    try:
                        img_response = await client.get(future_links[0], timeout=10.0)
                        if img_response.status_code == 200:
                            # Image is ready, break out of polling
                            result = {
                                "status": "success",
                                "output": future_links
                            }
                            break
                    except:
                        pass  # Continue polling if future link doesn't work yet
                
                if not fetch_url:
                    # If no fetch_url but we have future_links, wait a bit and try again
                    if future_links:
                        await asyncio.sleep(5)
                        # Retry the original request to check status
                        retry_response = await client.post(
                            MODELSLAB_API_URL,
                            json=payload,
                            headers={"Content-Type": "application/json"},
                            timeout=180.0
                        )
                        retry_response.raise_for_status()
                        result = retry_response.json()
                        poll_count += 1
                        continue
                    else:
                        raise HTTPException(status_code=500, detail="ModelLab API returned processing status but no fetch_result URL or future_links")
                
                # Wait before polling
                eta = result.get("eta", 5)
                await asyncio.sleep(min(max(eta, 2), 15))  # Wait at least 2 seconds, max 15
                
                # Fetch result (ModelLab fetch endpoint requires POST)
                try:
                    fetch_response = await client.post(
                        fetch_url,
                        json={"key": MODELSLAB_API_KEY},
                        headers={"Content-Type": "application/json"},
                        timeout=60.0
                    )
                    fetch_response.raise_for_status()
                    result = fetch_response.json()
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 404:
                        # Fetch endpoint might not be ready yet, wait and retry
                        await asyncio.sleep(5)
                        poll_count += 1
                        continue
                    raise
                poll_count += 1
            
            # Check final status
            if result.get("status") == "error":
                error_msg = result.get("message") or result.get("messege", "Unknown error from ModelLab API")
                raise HTTPException(status_code=500, detail=f"ModelLab API error: {error_msg}")
            
            if result.get("status") == "failed":
                error_msg = result.get("messege") or result.get("message", "Generation failed")
                error_log = result.get("error_log", {})
                if error_log:
                    error_detail = error_log.get("error", error_msg)
                    raise HTTPException(status_code=500, detail=f"ModelLab API generation failed: {error_detail}")
                raise HTTPException(status_code=500, detail=f"ModelLab API generation failed: {error_msg}")
            
            if result.get("status") != "success":
                raise HTTPException(status_code=500, detail=f"Unexpected status from ModelLab API: {result.get('status')}")
            
            # Extract image URL from response
            output = result.get("output", [])
            if not output or len(output) == 0:
                raise HTTPException(status_code=500, detail="ModelLab API returned success but no image URLs")
            
            image_url = output[0]  # Get first image
            
            # Download the generated image
            try:
                img_response = await client.get(image_url, timeout=60.0)
                img_response.raise_for_status()
                image_bytes = img_response.content
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to download generated image from ModelLab: {str(e)}")
            
            if not image_bytes or len(image_bytes) < 100:
                raise HTTPException(status_code=500, detail="Downloaded image is too small or invalid")
            
            # Save transformed image locally
            image_id = str(uuid.uuid4())
            image_filename = f"{image_id}.png"
            image_path = Path(STORAGE_PATH) / image_filename
            
            image_path.parent.mkdir(parents=True, exist_ok=True)
            with open(image_path, "wb") as f:
                f.write(image_bytes)
            
            local_image_url = f"/storage/images/{image_filename}"
            
            return GenerateResponse(image_url=local_image_url)
    
    except httpx.HTTPStatusError as e:
        error_text = ""
        try:
            if e.response.headers.get("content-type", "").startswith("application/json"):
                error_json = e.response.json()
                error_text = error_json.get("message") or error_json.get("detail") or str(error_json)
            else:
                error_text = e.response.text
        except:
            error_text = str(e)
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"ModelLab API error (HTTP {e.response.status_code}): {error_text}"
        )
    except httpx.RequestError as e:
        # Network/DNS errors
        error_msg = str(e)
        if "Name or service not known" in error_msg or "Name resolution" in error_msg:
            raise HTTPException(
                status_code=500,
                detail=f"ModelLab API endpoint not reachable: {MODELSLAB_API_URL}. Please check your network connection and MODELSLAB_API_URL in .env file. Error: {error_msg}"
            )
        raise HTTPException(status_code=500, detail=f"Network error connecting to ModelLab API: {error_msg}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image transformation failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
