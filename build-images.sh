#!/bin/bash
# Build script for all Docker images

set -e

echo "Building all Docker images..."

# Build Gateway
echo "Building Gateway..."
docker build -t multimodal-gateway:latest -f gateway/Dockerfile .

# Build Frontend
echo "Building Frontend..."
docker build -t multimodal-frontend:latest -f frontend/Dockerfile frontend/

# Build Workers
echo "Building LLM Worker..."
docker build -t multimodal-llm-worker:latest -f workers/llm/Dockerfile workers/llm/

echo "Building Image Worker..."
docker build -t multimodal-image-worker:latest -f workers/image/Dockerfile workers/image/

echo "Building STT Worker..."
docker build -t multimodal-stt-worker:latest -f workers/stt/Dockerfile workers/stt/

echo "Building TTS Worker..."
docker build -t multimodal-tts-worker:latest -f workers/tts/Dockerfile workers/tts/

echo "Building CycleGAN Worker..."
docker build -t multimodal-cyclegan-worker:latest -f workers/cyclegan/Dockerfile workers/cyclegan/

echo "All images built successfully!"
echo ""
echo "Images created:"
docker images | grep multimodal
