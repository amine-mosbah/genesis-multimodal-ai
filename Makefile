.PHONY: help build push deploy clean test

help:
	@echo "Available targets:"
	@echo "  build      - Build all Docker images"
	@echo "  deploy     - Deploy to Kubernetes"
	@echo "  clean      - Clean up Kubernetes resources"
	@echo "  test       - Run tests (TODO)"
	@echo "  logs       - View gateway logs"

build:
	docker build -t multimodal-gateway:latest -f gateway/Dockerfile gateway/
	docker build -t multimodal-frontend:latest -f frontend/Dockerfile frontend/
	docker build -t multimodal-llm-worker:latest -f workers/llm/Dockerfile workers/llm/
	docker build -t multimodal-image-worker:latest -f workers/image/Dockerfile workers/image/
	docker build -t multimodal-stt-worker:latest -f workers/stt/Dockerfile workers/stt/
	docker build -t multimodal-tts-worker:latest -f workers/tts/Dockerfile workers/tts/
	docker build -t multimodal-cyclegan-worker:latest -f workers/cyclegan/Dockerfile workers/cyclegan/

deploy:
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/configmap.yaml
	kubectl apply -f k8s/persistent-volume.yaml
	kubectl apply -f k8s/gateway.yaml
	kubectl apply -f k8s/workers/llm-worker.yaml
	kubectl apply -f k8s/workers/image-worker.yaml
	kubectl apply -f k8s/workers/stt-worker.yaml
	kubectl apply -f k8s/workers/tts-worker.yaml
	kubectl apply -f k8s/workers/cyclegan-worker.yaml
	kubectl apply -f k8s/frontend.yaml

clean:
	kubectl delete namespace multimodal-ai

logs:
	kubectl logs -f deployment/gateway-deployment -n multimodal-ai

status:
	kubectl get pods -n multimodal-ai
	kubectl get svc -n multimodal-ai

test:
	@echo "TODO: Add tests"
	# pytest gateway/tests/
	# pytest workers/*/tests/
