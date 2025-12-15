# Kubernetes (k0s) Design

## Cluster Configuration

- **Distribution**: k0s (lightweight, single-node friendly)
- **Target**: Single-node laptop deployment (8GB RAM minimum)
- **Namespace**: `multimodal-ai` (isolated namespace)

## Resource Allocation

### Service Resource Requests/Limits

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|-------------|-----------|----------------|--------------|
| Frontend | 50m | 200m | 64Mi | 128Mi |
| Gateway | 100m | 500m | 256Mi | 512Mi |
| LLM Worker | 50m | 200m | 128Mi | 256Mi |
| Image Worker | 100m | 500m | 256Mi | 512Mi |
| STT Worker | 100m | 500m | 256Mi | 512Mi |
| TTS Worker | 100m | 500m | 256Mi | 512Mi |
| CycleGAN Worker | 100m | 500m | 256Mi | 512Mi |

**Total Estimated Usage**: ~1.5 CPU cores, ~2GB RAM

## Storage Strategy

### Persistent Volume
- **Type**: `hostPath` (single-node)
- **Size**: 10Gi
- **Path**: `/tmp/multimodal-data`
- **Access Mode**: ReadWriteMany (shared across pods)
- **Reclaim Policy**: Retain

### Storage Mounts
- **Gateway**: `/data` (for SQLite database)
- **Image Worker**: `/data/images` (for generated images)
- **TTS Worker**: `/data/audio` (for generated audio)
- **CycleGAN Worker**: `/data/images` (for transformed images)

### Production Considerations
For production, consider:
- NFS or Ceph for distributed storage
- Object storage (MinIO, S3) for files
- PostgreSQL for database (replace SQLite)

## Service Discovery

### Internal Services
All services communicate via Kubernetes DNS:
- `gateway-service.multimodal-ai.svc.cluster.local:8000`
- `llm-worker-service.multimodal-ai.svc.cluster.local:8001`
- `image-worker-service.multimodal-ai.svc.cluster.local:8002`
- etc.

Services can also use short names within the namespace:
- `gateway-service:8000`
- `llm-worker-service:8001`

## External Access

### NodePort (Simple, Default)
Frontend service exposed via NodePort:
```yaml
type: NodePort
```
- Access via: `http://<node-ip>:<nodeport>`
- Automatic port assignment by Kubernetes

### Ingress (Optional)
For production-like setup with domain names:
```yaml
# Requires ingress controller (e.g., nginx-ingress)
apiVersion: networking.k8s.io/v1
kind: Ingress
```
- Access via: `http://multimodal-ai.local`

## Configuration Management

### ConfigMap
- **Name**: `app-config`
- **Contains**:
  - Worker service URLs
  - Storage paths
  - Model endpoints (Hugging Face URLs)
  - Database paths

### Secrets
- **Name**: `api-keys`
- **Contains**:
  - `openrouter-api-key`: OpenRouter API key
  - `huggingface-api-key`: Hugging Face API key

### Secret Management
**Never commit secrets to version control!**

Create secrets manually:
```bash
kubectl create secret generic api-keys \
  --from-literal=openrouter-api-key=sk-or-xxx \
  --from-literal=huggingface-api-key=hf_xxx \
  -n multimodal-ai
```

## Deployment Strategy

### Single Replica (Default)
Each service runs with `replicas: 1` for minimal resource usage.

### Scaling (Future)
To scale a service:
```bash
kubectl scale deployment/gateway-deployment --replicas=3 -n multimodal-ai
```

## Health Checks

### Liveness Probes (TODO)
Add liveness probes to detect and restart unhealthy pods:
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10
```

### Readiness Probes (TODO)
Add readiness probes to ensure pods are ready before receiving traffic:
```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Network Policies (TODO)

For enhanced security, add NetworkPolicies to restrict traffic:
- Frontend can only talk to Gateway
- Gateway can talk to all workers
- Workers cannot talk to each other directly
- All services can access storage

## Monitoring (Future)

Potential additions:
- Prometheus metrics export from each service
- Grafana dashboards
- Kubernetes metrics server
- Log aggregation (ELK stack, Loki)

## Deployment Order

1. Create namespace
2. Create ConfigMap
3. Create Secrets
4. Create PersistentVolume and PersistentVolumeClaim
5. Deploy Gateway (foundation service)
6. Deploy Workers (independent)
7. Deploy Frontend (depends on Gateway)

## Troubleshooting

### Check pod status:
```bash
kubectl get pods -n multimodal-ai
```

### View logs:
```bash
kubectl logs -f deployment/gateway-deployment -n multimodal-ai
```

### Access pod shell:
```bash
kubectl exec -it <pod-name> -n multimodal-ai -- /bin/sh
```

### Port forward for debugging:
```bash
kubectl port-forward service/gateway-service 8000:8000 -n multimodal-ai
```
