"""
Pipeline execution engine - orchestrates multi-step pipelines.
"""
import httpx
import os
from typing import Dict, Any
from ..schemas import Job, JobStatus, PipelineType


class PipelineExecutor:
    """Executes pipelines by orchestrating worker services."""
    
    def __init__(self):
        """Initialize worker service URLs."""
        self.llm_worker_url = os.getenv("LLM_WORKER_URL", "http://llm-worker:8001")
        self.image_worker_url = os.getenv("IMAGE_WORKER_URL", "http://image-worker:8002")
        self.stt_worker_url = os.getenv("STT_WORKER_URL", "http://stt-worker:8003")
        self.tts_worker_url = os.getenv("TTS_WORKER_URL", "http://tts-worker:8004")
        self.cyclegan_worker_url = os.getenv("CYCLEGAN_WORKER_URL", "http://cyclegan-worker:8005")
    
    async def execute(self, job: Job) -> Job:
        """Execute a job based on its pipeline type."""
        job.status = JobStatus.RUNNING
        if not job.metadata.started_at:
            from datetime import datetime
            job.metadata.started_at = datetime.utcnow()
        
        try:
            if job.pipeline == PipelineType.TEXT_TO_TEXT:
                job = await self._text_to_text(job)
            elif job.pipeline == PipelineType.TEXT_TO_IMAGE:
                job = await self._text_to_image(job)
            elif job.pipeline == PipelineType.TEXT_TO_SPEECH:
                job = await self._text_to_speech(job)
            elif job.pipeline == PipelineType.SPEECH_TO_TEXT:
                job = await self._speech_to_text(job)
            elif job.pipeline == PipelineType.SPEECH_TO_IMAGE:
                job = await self._speech_to_image(job)
            elif job.pipeline == PipelineType.IMAGE_TO_IMAGE:
                job = await self._image_to_image(job)
            else:
                raise ValueError(f"Unsupported pipeline: {job.pipeline}")
            
            job.status = JobStatus.COMPLETED
            from datetime import datetime
            job.metadata.completed_at = datetime.utcnow()
        
        except Exception as e:
            job.status = JobStatus.FAILED
            job.metadata.error_message = str(e)
            from datetime import datetime
            job.metadata.completed_at = datetime.utcnow()
        
        return job
    
    async def _call_worker(self, url: str, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Generic worker service call."""
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(f"{url}/{endpoint}", json=payload)
            response.raise_for_status()
            return response.json()
    
    async def _text_to_text(self, job: Job) -> Job:
        """Text-to-text generation pipeline."""
        result = await self._call_worker(
            self.llm_worker_url,
            "generate",
            {
                "text": job.inputs.text,
                "options": job.options.dict()
            }
        )
        job.outputs.text = result.get("text")
        job.metadata.worker_used = "llm-worker"
        return job
    
    async def _text_to_image(self, job: Job) -> Job:
        """Text-to-image generation pipeline."""
        # Optional: enhance prompt with LLM
        prompt = job.inputs.text
        if job.options.style:
            # Use LLM to enhance prompt with style
            try:
                enhanced = await self._call_worker(
                    self.llm_worker_url,
                    "generate",
                    {
                        "text": f"Rewrite this prompt in a {job.options.style} style: {prompt}",
                        "options": {"max_tokens": 200, "temperature": 0.7}
                    }
                )
                prompt = enhanced.get("text", prompt)
            except:
                pass  # Fallback to original prompt
        
        result = await self._call_worker(
            self.image_worker_url,
            "generate",
            {
                "prompt": prompt,
                "options": job.options.dict()
            }
        )
        job.outputs.image_url = result.get("image_url")
        job.metadata.worker_used = "image-worker"
        return job
    
    async def _text_to_speech(self, job: Job) -> Job:
        """Text-to-speech generation pipeline."""
        result = await self._call_worker(
            self.tts_worker_url,
            "generate",
            {
                "text": job.inputs.text,
                "options": job.options.dict()
            }
        )
        job.outputs.audio_url = result.get("audio_url")
        job.metadata.worker_used = "tts-worker"
        return job
    
    async def _speech_to_text(self, job: Job) -> Job:
        """Speech-to-text transcription pipeline."""
        result = await self._call_worker(
            self.stt_worker_url,
            "generate",
            {
                "audio_url": job.inputs.audio_url,
                "options": job.options.dict()
            }
        )
        job.outputs.text = result.get("text")
        job.metadata.worker_used = "stt-worker"
        return job
    
    async def _speech_to_image(self, job: Job) -> Job:
        """Speech-to-image: STT → prompt cleanup → image generation."""
        # Step 1: Speech to Text
        stt_result = await self._call_worker(
            self.stt_worker_url,
            "generate",
            {
                "audio_url": job.inputs.audio_url,
                "options": job.options.dict()
            }
        )
        transcribed_text = stt_result.get("text", "")
        
        # Step 2: Clean up and enhance prompt with LLM
        prompt = transcribed_text
        if prompt:
            try:
                enhanced = await self._call_worker(
                    self.llm_worker_url,
                    "generate",
                    {
                        "text": f"Transform this transcription into a clear image generation prompt: {prompt}",
                        "options": {"max_tokens": 150, "temperature": 0.7}
                    }
                )
                prompt = enhanced.get("text", prompt)
            except:
                pass
        
        # Step 3: Generate image
        image_result = await self._call_worker(
            self.image_worker_url,
            "generate",
            {
                "prompt": prompt,
                "options": job.options.dict()
            }
        )
        
        job.outputs.text = transcribed_text  # Keep intermediate result
        job.outputs.image_url = image_result.get("image_url")
        job.metadata.worker_used = "stt-worker,llm-worker,image-worker"
        return job
    
    async def _image_to_image(self, job: Job) -> Job:
        """Image-to-image transformation pipeline."""
        result = await self._call_worker(
            self.cyclegan_worker_url,
            "generate",
            {
                "image_url": job.inputs.image_url,
                "options": job.options.dict()
            }
        )
        job.outputs.image_url = result.get("image_url")
        job.metadata.worker_used = "cyclegan-worker"
        return job
