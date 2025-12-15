# Multimodal Generative AI Platform

A production-grade, API-first, multi-capability generative AI platform deployed on Kubernetes (k0s). This system enables users to generate text, images, and audio through various pipelines, all orchestrated via a unified job-based architecture.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Supported Pipelines](#supported-pipelines)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Development](#development)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Limitations & Future Improvements](#limitations--future-improvements)
- [Contributing](#contributing)
- [License](#license)

## Overview

This platform provides a unified interface for multiple generative AI capabilities, including text generation, image generation, speech-to-text transcription, text-to-speech synthesis, and image transformation. The system is designed with a microservices architecture, where each capability is implemented as an independent worker service, orchestrated by a central Gateway API.

### Design Philosophy

- **API-First**: All communication is via REST APIs
- **Provider-Agnostic**: Easy to swap AI providers (OpenRouter, Hugging Face, etc.)
- **Asynchronous Jobs**: All generation tasks are handled asynchronously via job queues
- **Stateless Workers**: Each worker is stateless and can be scaled independently
- **Kubernetes-Native**: Built for container orchestration from the ground up
- **No Local ML Inference**: All inference is done via external APIs (reduces resource requirements)

## Features

- ✅ **Multiple Pipeline Types**: Support for 6+ different generation pipelines
- ✅ **Job-Based Architecture**: Asynchronous job processing with status tracking
- ✅ **Web Frontend**: Modern React-based UI with real-time status updates
- ✅ **Microservices**: Modular, independently scalable worker services
- ✅ **Kubernetes Deployment**: Full k0s manifests for easy deployment
- ✅ **Persistent Storage**: Job history and generated artifacts stored persistently
- ✅ **Error Handling**: Comprehensive error handling and retry logic
- ✅ **API Documentation**: Auto-generated OpenAPI/Swagger documentation

## Supported Pipelines

### 1. Text-to-Text (`text_to_text`)
Generate or transform text using large language models.

**Input**: Text prompt
**Output**: Generated text
**Worker**: LLM Worker (OpenRouter)

### 2. Text-to-Image (`text_to_image`)
Generate images from text descriptions.

**Input**: Text prompt
**Output**: Generated image (PNG)
**Workers**: LLM Worker (optional prompt enhancement), Image Worker (Stable Diffusion XL)

### 3. Text-to-Speech (`text_to_speech`)
Convert text to natural-sounding speech.

**Input**: Text
**Output**: Audio file (WAV)
**Worker**: TTS Worker (Hugging Face TTS)

### 4. Speech-to-Text (`speech_to_text`)
Transcribe speech audio to text.

**Input**: Audio file URL
**Output**: Transcribed text
**Worker**: STT Worker (Whisper Large v3)

### 5. Speech-to-Image (`speech_to_image`)
Generate images from speech input (multi-step pipeline).

**Flow**: Speech → Transcription → Prompt Enhancement → Image Generation
**Input**: Audio file URL
**Output**: Transcribed text + Generated image
**Workers**: STT Worker → LLM Worker → Image Worker

### 6. Image-to-Image (`image_to_image`)
Transform image style (CycleGAN-style).

**Input**: Image URL
**Output**: Transformed image
**Worker**: CycleGAN Worker (Hugging Face)

## Architecture

The system follows a microservices architecture with clear separation of concerns:

```
┌─────────────┐
│  Frontend   │ (React + TypeScript)
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────┐
│   Gateway   │ (FastAPI - Orchestration Layer)
└──────┬──────┘
       │
   ┌───┴───┬──────────┬──────────┬──────────┐
   ▼       ▼          ▼          ▼          ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐
│ LLM  │ │Image │ │ STT  │ │ TTS  │ │ CycleGAN │
│Worker│ │Worker│ │Worker│ │Worker│ │  Worker  │
└───┬──┘ └───┬──┘ └───┬──┘ └───┬──┘ └────┬─────┘
    │        │        │        │         │
    ▼        ▼        ▼        ▼         ▼
External APIs (OpenRouter, Hugging Face)
```

### Components

- **Frontend Service**: React SPA with job creation, status polling, and results visualization
- **Gateway Service**: Central orchestration layer managing jobs, pipelines, and worker coordination
- **Worker Services**: Stateless microservices for each AI capability
- **Storage**: SQLite database for job metadata, persistent volume for generated files

For detailed architecture documentation, see [`architecture/system_diagram.md`](architecture/system_diagram.md).

## Technology Stack

### Backend
- **Gateway**: FastAPI (Python 3.11)
- **Workers**: FastAPI (Python 3.11)
- **Database**: SQLite (default) / PostgreSQL (optional)
- **API Clients**: httpx (async HTTP)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router

### Infrastructure
- **Orchestration**: Kubernetes (k0s)
- **Containerization**: Docker
- **Storage**: Kubernetes PersistentVolume

### External APIs
- **LLM**: OpenRouter (GPT models)
- **Image Generation**: Hugging Face Inference API (Stable Diffusion XL)
- **Speech-to-Text**: Hugging Face Inference API (Whisper Large v3)
- **Text-to-Speech**: Hugging Face Inference API (TTS models)
- **Image Transformation**: Hugging Face Inference API

## Prerequisites

### For Local Development
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (optional)

### For Kubernetes Deployment
- k0s installed and running
- kubectl configured
- Minimum 8GB RAM available
- Docker or container runtime

### API Keys
- **OpenRouter API Key**: Sign up at [openrouter.ai](https://openrouter.ai)
- **Hugging Face API Key**: Get token from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd genesis-multimodal-ai
```

### 2. Build Docker Images

```bash
# Build all images
docker build -t multimodal-gateway:latest -f gateway/Dockerfile gateway/
docker build -t multimodal-frontend:latest -f frontend/Dockerfile frontend/
docker build -t multimodal-llm-worker:latest -f workers/llm/Dockerfile workers/llm/
docker build -t multimodal-image-worker:latest -f workers/image/Dockerfile workers/image/
docker build -t multimodal-stt-worker:latest -f workers/stt/Dockerfile workers/stt/
docker build -t multimodal-tts-worker:latest -f workers/tts/Dockerfile workers/tts/
docker build -t multimodal-cyclegan-worker:latest -f workers/cyclegan/Dockerfile workers/cyclegan/
```

### 3. Create Kubernetes Secrets

```bash
kubectl create namespace multimodal-ai

kubectl create secret generic api-keys \
  --from-literal=openrouter-api-key=YOUR_OPENROUTER_KEY \
  --from-literal=huggingface-api-key=YOUR_HF_KEY \
  -n multimodal-ai
```

### 4. Deploy to Kubernetes

```bash
# Apply manifests in order
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml  # Update with your keys first!
kubectl apply -f k8s/persistent-volume.yaml
kubectl apply -f k8s/gateway.yaml
kubectl apply -f k8s/workers/llm-worker.yaml
kubectl apply -f k8s/workers/image-worker.yaml
kubectl apply -f k8s/workers/stt-worker.yaml
kubectl apply -f k8s/workers/tts-worker.yaml
kubectl apply -f k8s/workers/cyclegan-worker.yaml
kubectl apply -f k8s/frontend.yaml
```

### 5. Access the Application

```bash
# Get NodePort for frontend
kubectl get svc frontend-service -n multimodal-ai

# Access via http://<node-ip>:<nodeport>
# Or use port forwarding:
kubectl port-forward service/frontend-service 3000:80 -n multimodal-ai
# Then open http://localhost:3000
```

### 6. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n multimodal-ai

# View gateway logs
kubectl logs -f deployment/gateway-deployment -n multimodal-ai
```

## Configuration

### Environment Variables

#### Gateway
- `DB_PATH`: Path to SQLite database (default: `/data/jobs.db`)
- `LLM_WORKER_URL`: LLM worker service URL
- `IMAGE_WORKER_URL`: Image worker service URL
- `STT_WORKER_URL`: STT worker service URL
- `TTS_WORKER_URL`: TTS worker service URL
- `CYCLEGAN_WORKER_URL`: CycleGAN worker service URL

#### Workers
- `OPENROUTER_API_KEY`: OpenRouter API key (LLM worker)
- `HUGGINGFACE_API_KEY`: Hugging Face API key (Image, STT, TTS, CycleGAN workers)
- `LLM_MODEL`: LLM model identifier (default: `openai/gpt-3.5-turbo`)
- `IMAGE_MODEL_URL`: Hugging Face image model endpoint
- `STORAGE_PATH`: Path for storing generated files

### ConfigMap

Configuration is managed via Kubernetes ConfigMap (`k8s/configmap.yaml`). Update values as needed.

### Secrets

API keys are stored in Kubernetes Secrets. Never commit secrets to version control!

## Development

### Local Development Setup

#### Backend Services

```bash
# Gateway
cd gateway
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
export OPENROUTER_API_KEY=your_key
export HUGGINGFACE_API_KEY=your_key
uvicorn gateway.main:app --reload --port 8000

# Workers (in separate terminals)
cd workers/llm
pip install -r requirements.txt
export OPENROUTER_API_KEY=your_key
uvicorn main:app --reload --port 8001
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

### Running Tests

```bash
# TODO: Add pytest tests
pytest gateway/tests/
pytest workers/*/tests/
```

### Code Quality

```bash
# Linting
ruff check gateway/ workers/

# Type checking
mypy gateway/ workers/

# Frontend linting
cd frontend
npm run lint
```

## Deployment

### Production Considerations

1. **Database**: Migrate from SQLite to PostgreSQL for production
2. **Storage**: Use object storage (S3, MinIO) instead of hostPath
3. **Secrets Management**: Use external secret management (Vault, Sealed Secrets)
4. **Monitoring**: Add Prometheus metrics and Grafana dashboards
5. **Logging**: Centralized logging with ELK stack or Loki
6. **Scaling**: Configure horizontal pod autoscaling
7. **Ingress**: Set up proper ingress controller with TLS
8. **Resource Limits**: Tune resource requests/limits based on usage

### High Availability

For production, consider:
- Multiple replicas for each service
- Database replication
- Load balancer in front of services
- Health checks and auto-restart
- Backup strategy for persistent data

## API Documentation

### Gateway API Endpoints

#### Create Job
```http
POST /jobs
Content-Type: application/json

{
  "pipeline": "text_to_image",
  "inputs": {
    "text": "A beautiful sunset over mountains"
  },
  "options": {
    "style": "cinematic",
    "quality": "high"
  }
}
```

Response:
```json
{
  "job_id": "uuid",
  "pipeline": "text_to_image",
  "status": "queued",
  ...
}
```

#### Get Job Status
```http
GET /jobs/{job_id}
```

Response:
```json
{
  "job_id": "uuid",
  "status": "completed",
  "outputs": {
    "image_url": "/storage/images/xxx.png"
  },
  ...
}
```

#### List Jobs
```http
GET /jobs?limit=100&offset=0
```

#### List Pipelines
```http
GET /pipelines
```

### Interactive API Documentation

Once the Gateway is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Worker API

Each worker exposes:
- `GET /health`: Health check
- `POST /generate`: Generate request

See worker-specific documentation in each worker's `main.py`.

## Limitations & Future Improvements

### Current Limitations

1. **File Upload**: Currently requires direct URLs for audio/image inputs. File upload endpoint TODO.
2. **Model Loading**: Hugging Face models may need warm-up time (first request slower).
3. **Storage URLs**: Generated file URLs are relative paths. Need file serving service.
4. **Error Recovery**: Limited retry logic for external API failures.
5. **Job Queue**: No dedicated message queue (using background tasks).
6. **Rate Limiting**: No rate limiting on API endpoints.
7. **Authentication**: No authentication/authorization implemented.

### Future Improvements

- [ ] **File Upload Service**: Direct file upload with presigned URLs
- [ ] **Message Queue**: Add RabbitMQ/Redis for job queuing
- [ ] **File Serving**: Nginx or object storage integration for file serving
- [ ] **Rate Limiting**: Implement rate limiting per user/IP
- [ ] **Authentication**: Add JWT-based authentication
- [ ] **Multi-tenancy**: Support for multiple users/organizations
- [ ] **WebSocket Updates**: Real-time job status via WebSockets
- [ ] **Batch Processing**: Support for batch job creation
- [ ] **Model Caching**: Cache frequently used models
- [ ] **Cost Tracking**: Track API usage costs per job
- [ ] **Advanced Pipelines**: More complex multi-step pipelines
- [ ] **Pipeline Templates**: Pre-configured pipeline templates
- [ ] **Metrics & Monitoring**: Prometheus + Grafana integration
- [ ] **CI/CD**: Automated testing and deployment pipelines

## Why API-Based Inference?

This project explicitly uses **API-based inference only** (no local ML models) for several reasons:

1. **Resource Efficiency**: No need for expensive GPUs or large model storage
2. **Flexibility**: Easy to swap providers or models without code changes
3. **Scalability**: Can leverage cloud-based inference at scale
4. **Cost-Effective**: Pay-per-use rather than maintaining infrastructure
5. **Academic Focus**: Allows focus on system architecture rather than ML optimization
6. **Deployment Simplicity**: Works on any Kubernetes cluster, even low-resource ones

This approach is suitable for:
- Academic projects
- Prototyping and MVP development
- Cost-sensitive deployments
- Multi-provider architectures

For production systems requiring local inference, the architecture can be extended with local model serving workers.

## Contributing

This is an academic project. Contributions welcome via pull requests!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is provided as-is for academic purposes.

## Acknowledgments

- **OpenRouter** for LLM API access
- **Hugging Face** for model hosting and inference APIs
- **FastAPI** for the excellent Python web framework
- **React** and **Vite** for modern frontend development
- **k0s** for lightweight Kubernetes distribution

## Contact

For questions or issues, please open an issue on the repository.

---

**Note**: This is a production-grade academic project demonstrating modern microservices architecture, Kubernetes deployment, and multi-modal AI integration. It is designed to be demo-ready and showcase best practices in distributed systems design.
