"""
Gateway API - Main entry point for the multimodal AI platform.
"""
import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from .schemas import Job, JobCreate, PipelineType, JobStatus
from .db import JobDB
from .services.pipeline_executor import PipelineExecutor


# Initialize database
db = JobDB(db_path=os.getenv("DB_PATH", "/data/jobs.db"))
executor = PipelineExecutor()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle management."""
    # Startup: ensure DB is initialized
    db._init_db()
    yield
    # Shutdown: cleanup if needed
    pass


app = FastAPI(
    title="Multimodal AI Platform Gateway",
    description="API-first gateway for multi-capability generative AI pipelines",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "gateway"}


@app.post("/jobs", response_model=Job, status_code=201)
async def create_job(job_create: JobCreate, background_tasks: BackgroundTasks):
    """
    Create a new generation job.
    
    The job will be processed asynchronously in the background.
    """
    # Validate inputs based on pipeline type
    if job_create.pipeline in [PipelineType.TEXT_TO_TEXT, PipelineType.TEXT_TO_IMAGE, PipelineType.TEXT_TO_SPEECH]:
        if not job_create.inputs.text:
            raise HTTPException(status_code=400, detail="Text input required for this pipeline")
    
    if job_create.pipeline in [PipelineType.SPEECH_TO_TEXT, PipelineType.SPEECH_TO_IMAGE]:
        if not job_create.inputs.audio_url:
            raise HTTPException(status_code=400, detail="Audio input required for this pipeline")
    
    if job_create.pipeline == PipelineType.IMAGE_TO_IMAGE:
        if not job_create.inputs.image_url:
            raise HTTPException(status_code=400, detail="Image input required for this pipeline")
    
    # Create job
    job = Job(
        pipeline=job_create.pipeline,
        inputs=job_create.inputs,
        options=job_create.options or JobOptions()
    )
    
    # Store in database
    job = db.create_job(job)
    
    # Execute asynchronously
    background_tasks.add_task(execute_job_async, job.job_id)
    
    return job


async def execute_job_async(job_id: str):
    """Execute a job asynchronously."""
    job = db.get_job(job_id)
    if not job:
        return
    
    # Execute pipeline
    job = await executor.execute(job)
    
    # Update database
    db.update_job(job)


@app.get("/jobs/{job_id}", response_model=Job)
async def get_job(job_id: str):
    """Get job status and results by ID."""
    job = db.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/jobs", response_model=List[Job])
async def list_jobs(limit: int = 100, offset: int = 0):
    """List all jobs (history)."""
    return db.list_jobs(limit=limit, offset=offset)


@app.get("/pipelines")
async def list_pipelines():
    """List all supported pipeline types."""
    return {
        "pipelines": [
            {
                "type": pipeline.value,
                "description": _get_pipeline_description(pipeline)
            }
            for pipeline in PipelineType
        ]
    }


def _get_pipeline_description(pipeline: PipelineType) -> str:
    """Get human-readable description for a pipeline."""
    descriptions = {
        PipelineType.TEXT_TO_TEXT: "Generate text from text input",
        PipelineType.TEXT_TO_IMAGE: "Generate image from text prompt",
        PipelineType.TEXT_TO_SPEECH: "Generate speech audio from text",
        PipelineType.SPEECH_TO_TEXT: "Transcribe speech audio to text",
        PipelineType.SPEECH_TO_IMAGE: "Generate image from speech (transcribe → enhance → image)",
        PipelineType.IMAGE_TO_IMAGE: "Transform image style (CycleGAN)"
    }
    return descriptions.get(pipeline, "Unknown pipeline")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
