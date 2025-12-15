/**
 * API client for Gateway service
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface JobInputs {
  text?: string | null;
  image_url?: string | null;
  audio_url?: string | null;
}

export interface JobOptions {
  style?: string;
  language?: string;
  quality?: string;
  aspect_ratio?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface Job {
  job_id: string;
  pipeline: string;
  inputs: JobInputs;
  options: JobOptions;
  status: 'queued' | 'running' | 'completed' | 'failed';
  outputs: {
    text?: string | null;
    image_url?: string | null;
    audio_url?: string | null;
  };
  metadata: {
    provider?: string;
    created_at: string;
    started_at?: string | null;
    completed_at?: string | null;
    error_message?: string | null;
    worker_used?: string;
  };
}

export interface JobCreate {
  pipeline: string;
  inputs: JobInputs;
  options?: JobOptions;
}

export interface Pipeline {
  type: string;
  description: string;
}

/**
 * Create a new generation job
 */
export async function createJob(jobCreate: JobCreate): Promise<Job> {
  const response = await fetch(`${API_BASE_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jobCreate),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create job');
  }

  return response.json();
}

/**
 * Get job status and results
 */
export async function getJob(jobId: string): Promise<Job> {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Job not found');
    }
    throw new Error('Failed to fetch job');
  }

  return response.json();
}

/**
 * List all jobs (history)
 */
export async function listJobs(limit = 100, offset = 0): Promise<Job[]> {
  const response = await fetch(`${API_BASE_URL}/jobs?limit=${limit}&offset=${offset}`);

  if (!response.ok) {
    throw new Error('Failed to fetch jobs');
  }

  return response.json();
}

/**
 * List available pipeline types
 */
export async function listPipelines(): Promise<{ pipelines: Pipeline[] }> {
  const response = await fetch(`${API_BASE_URL}/pipelines`);

  if (!response.ok) {
    throw new Error('Failed to fetch pipelines');
  }

  return response.json();
}

/**
 * Upload file to storage (if needed)
 * Note: In a production system, this would upload to object storage
 * For now, we'll handle file uploads differently based on pipeline type
 */
export async function uploadFile(file: File, type: 'audio' | 'image'): Promise<string> {
  // TODO: Implement actual file upload endpoint
  // For now, return a placeholder URL
  // In production, upload to storage service and return the URL
  const formData = new FormData();
  formData.append('file', file);
  
  // This is a placeholder - you'd need a file upload service
  throw new Error('File upload not yet implemented. Please use direct URLs for now.');
}
