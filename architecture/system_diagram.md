# System Architecture Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                    (React Frontend - Port 80)                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/REST
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Gateway Service                            │
│                  (FastAPI - Port 8000)                          │
│                                                                 │
│  • Job Creation & Management                                    │
│  • Pipeline Orchestration                                       │
│  • State Management (SQLite/PostgreSQL)                        │
│  • Async Job Execution                                          │
└───────────┬────────────────────┬───────────────────────────────┘
            │                    │
            │ HTTP               │ HTTP
            ▼                    ▼
    ┌───────────────┐    ┌───────────────┐
    │  LLM Worker   │    │ Image Worker  │
    │  (Port 8001)  │    │  (Port 8002)  │
    │               │    │               │
    │ OpenRouter    │    │ Hugging Face  │
    │ API           │    │ Inference API │
    └───────────────┘    └───────────────┘
    
    ┌───────────────┐    ┌───────────────┐
    │  STT Worker   │    │  TTS Worker   │
    │  (Port 8003)  │    │  (Port 8004)  │
    │               │    │               │
    │ Hugging Face  │    │ Hugging Face  │
    │ Whisper       │    │ TTS API       │
    └───────────────┘    └───────────────┘
    
            │                    │
            │                    │
    ┌───────────────┐
    │CycleGAN Worker│
    │  (Port 8005)  │
    │               │
    │ Hugging Face  │
    │ Inference API │
    └───────────────┘
```

## Component Responsibilities

### Frontend Service
- **Technology**: React + Vite + TypeScript
- **Responsibilities**:
  - User interface for job creation
  - Pipeline selection
  - Input form rendering (text, image, audio)
  - Job status polling
  - Results visualization (text, images, audio player)
  - Job history browsing

### Gateway Service
- **Technology**: FastAPI (Python)
- **Responsibilities**:
  - Single entry point for all client requests
  - Request validation
  - Job creation and storage
  - Pipeline orchestration
  - Worker service coordination
  - Job state management
  - REST API endpoints

### Worker Services
- **Technology**: FastAPI (Python)
- **Architecture**: Stateless microservices
- **Responsibilities**:
  - Single capability per worker
  - External API integration (no local ML)
  - Stateless request/response handling
  - Error handling and retries

### Storage Layer
- **Database**: SQLite (default) or PostgreSQL
  - Stores job metadata, status, inputs, outputs
- **File Storage**: Persistent Volume (K8s)
  - Stores generated images and audio files
  - Shared across services via PVC

## Data Flow

### Job Creation Flow
1. User submits job via Frontend
2. Frontend → Gateway: POST /jobs
3. Gateway validates request
4. Gateway creates job record in database (status: queued)
5. Gateway returns job_id immediately
6. Gateway executes job asynchronously in background

### Job Execution Flow
1. Gateway selects pipeline based on job type
2. Gateway orchestrates worker calls:
   - Simple pipelines: Single worker call
   - Complex pipelines: Sequential worker calls
     (e.g., speech_to_image: STT → LLM → Image)
3. Workers call external APIs (OpenRouter, Hugging Face)
4. Workers return results to Gateway
5. Gateway updates job status and outputs in database

### Status Polling Flow
1. Frontend polls Gateway: GET /jobs/{job_id}
2. Gateway returns current job state
3. Frontend updates UI based on status
4. When completed, Frontend displays results

## Communication Patterns

- **Frontend ↔ Gateway**: HTTP REST API
- **Gateway ↔ Workers**: HTTP REST API (internal cluster)
- **Workers ↔ External APIs**: HTTPS REST API
- **All Services ↔ Storage**: File system / Database connection

## Scalability Considerations

- **Horizontal Scaling**: Each service can be scaled independently
- **Stateless Workers**: Enable easy replication
- **Database**: Can be migrated to PostgreSQL for production
- **File Storage**: Can use object storage (S3, MinIO) for distributed systems
- **Job Queue**: Can add message queue (RabbitMQ, Redis) for high throughput
