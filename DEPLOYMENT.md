# Deployment Guide

## Quick Deployment Checklist

1. ✅ Build all Docker images
2. ✅ Create Kubernetes namespace
3. ✅ Create secrets with API keys
4. ✅ Deploy ConfigMap
5. ✅ Deploy PersistentVolume
6. ✅ Deploy Gateway
7. ✅ Deploy Workers
8. ✅ Deploy Frontend
9. ✅ Verify all pods are running
10. ✅ Access frontend

## Detailed Steps

### Step 1: Build Docker Images

```bash
# From project root
make build

# Or manually:
docker build -t multimodal-gateway:latest -f gateway/Dockerfile gateway/
docker build -t multimodal-frontend:latest -f frontend/Dockerfile frontend/
docker build -t multimodal-llm-worker:latest -f workers/llm/Dockerfile workers/llm/
docker build -t multimodal-image-worker:latest -f workers/image/Dockerfile workers/image/
docker build -t multimodal-stt-worker:latest -f workers/stt/Dockerfile workers/stt/
docker build -t multimodal-tts-worker:latest -f workers/tts/Dockerfile workers/tts/
docker build -t multimodal-cyclegan-worker:latest -f workers/cyclegan/Dockerfile workers/cyclegan/
```

### Step 2: Prepare API Keys

Get your API keys:
- **OpenRouter**: Sign up at https://openrouter.ai and get API key
- **Hugging Face**: Get token from https://huggingface.co/settings/tokens

### Step 3: Create Kubernetes Resources

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create ConfigMap
kubectl apply -f k8s/configmap.yaml

# Create Secrets (IMPORTANT: Update with your keys first!)
kubectl create secret generic api-keys \
  --from-literal=openrouter-api-key=sk-or-v1-xxx \
  --from-literal=huggingface-api-key=hf_xxx \
  -n multimodal-ai

# Create PersistentVolume and PersistentVolumeClaim
kubectl apply -f k8s/persistent-volume.yaml

# Deploy Gateway
kubectl apply -f k8s/gateway.yaml

# Deploy Workers
kubectl apply -f k8s/workers/llm-worker.yaml
kubectl apply -f k8s/workers/image-worker.yaml
kubectl apply -f k8s/workers/stt-worker.yaml
kubectl apply -f k8s/workers/tts-worker.yaml
kubectl apply -f k8s/workers/cyclegan-worker.yaml

# Deploy Frontend
kubectl apply -f k8s/frontend.yaml
```

### Step 4: Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n multimodal-ai

# Expected output:
# NAME                                     READY   STATUS    RESTARTS   AGE
# gateway-deployment-xxx                   1/1     Running   0          1m
# frontend-deployment-xxx                  1/1     Running   0          1m
# llm-worker-deployment-xxx                1/1     Running   0          1m
# image-worker-deployment-xxx              1/1     Running   0          1m
# stt-worker-deployment-xxx                1/1     Running   0          1m
# tts-worker-deployment-xxx                1/1     Running   0          1m
# cyclegan-worker-deployment-xxx           1/1     Running   0          1m

# Check services
kubectl get svc -n multimodal-ai

# Check logs if any pod is not running
kubectl logs <pod-name> -n multimodal-ai
```

### Step 5: Access the Application

#### Option A: Port Forwarding (Recommended for Testing)

```bash
# Port forward frontend
kubectl port-forward service/frontend-service 3000:80 -n multimodal-ai

# Access at http://localhost:3000
```

#### Option B: NodePort (If configured)

```bash
# Get NodePort
kubectl get svc frontend-service -n multimodal-ai

# Access at http://<node-ip>:<nodeport>
```

#### Option C: Ingress (If configured)

```bash
# Apply ingress
kubectl apply -f k8s/ingress.yaml

# Access at http://multimodal-ai.local (add to /etc/hosts)
```

### Step 6: Test the System

1. Open frontend in browser
2. Select a pipeline (e.g., `text_to_image`)
3. Enter input (e.g., "A beautiful sunset")
4. Submit job
5. Wait for job to complete
6. View results

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n multimodal-ai

# Common issues:
# - Image pull errors: Check image names match
# - Secret errors: Verify secrets exist
# - Resource limits: Check node has enough resources
```

### API Key Errors

```bash
# Verify secrets are set
kubectl get secret api-keys -n multimodal-ai -o yaml

# Update secret if needed
kubectl create secret generic api-keys \
  --from-literal=openrouter-api-key=new_key \
  --from-literal=huggingface-api-key=new_key \
  -n multimodal-ai \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart deployments
kubectl rollout restart deployment -n multimodal-ai
```

### Storage Issues

```bash
# Check PVC status
kubectl get pvc -n multimodal-ai

# Check PV status
kubectl get pv

# Verify host path exists (for hostPath volumes)
ls -la /tmp/multimodal-data
```

### Service Communication Issues

```bash
# Test service connectivity from within cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- curl http://gateway-service:8000/health

# Check service endpoints
kubectl get endpoints -n multimodal-ai
```

## Updating Deployment

### Update Configuration

```bash
# Edit ConfigMap
kubectl edit configmap app-config -n multimodal-ai

# Restart deployments to pick up changes
kubectl rollout restart deployment -n multimodal-ai
```

### Update Images

```bash
# Rebuild and tag images
docker build -t multimodal-gateway:v2 -f gateway/Dockerfile gateway/

# Update deployment
kubectl set image deployment/gateway-deployment gateway=multimodal-gateway:v2 -n multimodal-ai
```

### Scale Services

```bash
# Scale gateway to 3 replicas
kubectl scale deployment/gateway-deployment --replicas=3 -n multimodal-ai
```

## Cleanup

```bash
# Delete entire namespace (removes everything)
kubectl delete namespace multimodal-ai

# Or delete individual resources
kubectl delete -f k8s/
```

## Production Considerations

For production deployment:

1. **Use proper container registry**: Push images to Docker Hub, GCR, ECR, etc.
2. **Use proper storage**: Replace hostPath with NFS, Ceph, or object storage
3. **Add monitoring**: Prometheus + Grafana
4. **Add logging**: Centralized logging solution
5. **Use Helm**: Package manifests as Helm charts
6. **Add CI/CD**: Automated build and deployment
7. **Security hardening**: Network policies, pod security policies
8. **Resource optimization**: Tune resource requests/limits based on metrics
9. **High availability**: Multiple replicas, anti-affinity rules
10. **Backup strategy**: Regular backups of database and storage
