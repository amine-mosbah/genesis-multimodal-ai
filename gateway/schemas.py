"""
Unified job schema and data models for the multimodal AI platform.
"""
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from uuid import uuid4
from pydantic import BaseModel, Field


class PipelineType(str, Enum):
    """Supported pipeline types."""
    TEXT_TO_TEXT = "text_to_text"
    TEXT_TO_IMAGE = "text_to_image"
    TEXT_TO_SPEECH = "text_to_speech"
    SPEECH_TO_TEXT = "speech_to_text"
    SPEECH_TO_IMAGE = "speech_to_image"
    IMAGE_TO_IMAGE = "image_to_image"  # Optional


class JobStatus(str, Enum):
    """Job status states."""
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class JobInputs(BaseModel):
    """Input data for a job."""
    text: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None


class JobOptions(BaseModel):
    """Optional parameters for job execution."""
    style: Optional[str] = None  # e.g., "cinematic", "realistic"
    language: Optional[str] = "en"
    quality: Optional[str] = "high"  # e.g., "low", "medium", "high"
    aspect_ratio: Optional[str] = "1:1"  # e.g., "1:1", "16:9", "9:16"
    model: Optional[str] = None  # Specific model override
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


class JobOutputs(BaseModel):
    """Output data from a job."""
    text: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None


class JobMetadata(BaseModel):
    """Metadata about the job."""
    provider: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    worker_used: Optional[str] = None


class JobCreate(BaseModel):
    """Request to create a new job."""
    pipeline: PipelineType
    inputs: JobInputs
    options: Optional[JobOptions] = Field(default_factory=JobOptions)


class Job(BaseModel):
    """Complete job representation."""
    job_id: str = Field(default_factory=lambda: str(uuid4()))
    pipeline: PipelineType
    inputs: JobInputs
    options: JobOptions = Field(default_factory=JobOptions)
    status: JobStatus = JobStatus.QUEUED
    outputs: JobOutputs = Field(default_factory=JobOutputs)
    metadata: JobMetadata = Field(default_factory=JobMetadata)

    class Config:
        use_enum_values = True
