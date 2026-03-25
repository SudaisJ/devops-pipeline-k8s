# URL Shortener — Production DevOps Project

A production-grade URL shortening service demonstrating a complete DevOps pipeline: containerized Node.js application deployed on AWS EKS via a fully automated GitHub Actions CI/CD pipeline, with infrastructure managed by Terraform.

## Tech Stack

| Layer | Technology |
|---|---|
| Application | Node.js, Express, PostgreSQL |
| Containerization | Docker (multi-stage build) |
| Container Registry | AWS ECR |
| Orchestration | Kubernetes on AWS EKS |
| CI/CD | GitHub Actions |
| Infrastructure as Code | Terraform |
| Database | AWS RDS (PostgreSQL 15) |
| Load Balancer | AWS ALB + K8s Ingress |
| Monitoring | AWS CloudWatch |

## Architecture

```
Developer → GitHub → GitHub Actions CI/CD
                          │
                    ┌─────▼──────┐
                    │  Run tests │
                    │ Build image│
                    │  Push ECR  │
                    │ Deploy EKS │
                    └─────┬──────┘
                          │
               ┌──────────▼──────────┐
               │     AWS Cloud       │
               │  ┌──────────────┐   │
               │  │  EKS Cluster │   │
               │  │  3x Pods     │   │
               │  │  HPA enabled │   │
               │  └──────┬───────┘   │
               │         │           │
               │  ┌──────▼───────┐   │
               │  │  RDS Postgres│   │
               │  └──────────────┘   │
               └─────────────────────┘
```

## Features

- Shorten any URL to an 8-character code
- 301 redirect with click tracking
- Stats endpoint per short code
- Health check endpoint (used by K8s probes)
- Zero-downtime rolling deployments
- Auto-scaling (3–10 pods based on CPU)

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness/readiness probe |
| `POST` | `/shorten` | Create a short URL |
| `GET` | `/:code` | Redirect to original URL |
| `GET` | `/api/stats/:code` | Get click stats |

**Create a short URL:**
```bash
curl -X POST https://short.yourdomain.com/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.google.com"}'
```

Response:
```json
{
  "short_url": "https://short.yourdomain.com/a3f9c2b1",
  "short_code": "a3f9c2b1",
  "original_url": "https://www.google.com",
  "created_at": "2025-01-01T12:00:00.000Z"
}
```

## Local Development

```bash
# Clone the repo
git clone https://github.com/yourusername/url-shortener.git
cd url-shortener

# Start app + postgres locally
docker compose up

# Test it
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com"}'
```

## CI/CD Pipeline

Every push to `main` triggers:

1. **Test** — Jest unit tests with coverage report
2. **Build** — Multi-stage Docker build (test → production)
3. **Push** — Image tagged with git SHA pushed to AWS ECR
4. **Deploy** — `kubectl set image` triggers rolling update on EKS
5. **Verify** — Waits for rollout to complete, confirms pods are healthy

## Infrastructure Setup (one-time)

```bash
cd terraform

# Set your DB password securely (never hardcode it)
export TF_VAR_db_password="your-strong-password"

terraform init
terraform plan
terraform apply
```

Then add these secrets to your GitHub repo:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Kubernetes Commands

```bash
# View running pods
kubectl get pods -l app=url-shortener

# View logs
kubectl logs -l app=url-shortener --tail=100

# Manual scale
kubectl scale deployment url-shortener --replicas=5

# Rollback a bad deploy
kubectl rollout undo deployment/url-shortener

# Check HPA (autoscaler) status
kubectl get hpa url-shortener-hpa
```

## Project Structure

```
url-shortener/
├── src/
│   ├── index.js                  # Express app
│   └── __tests__/
│       └── api.test.js           # Jest tests
├── k8s/
│   ├── deployment.yaml           # 3-replica Deployment with probes
│   └── manifests.yaml            # Service, ConfigMap, Secret, Ingress, HPA
├── terraform/
│   ├── main.tf                   # Provider, VPC
│   ├── eks.tf                    # EKS, ECR, RDS, S3
│   └── variables.tf
├── .github/
│   └── workflows/
│       └── ci-cd.yml             # GitHub Actions pipeline
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yml            # Local dev environment
└── package.json
```

## What This Demonstrates

- **Docker** — Multi-stage builds, non-root user, HEALTHCHECK, layer caching
- **Kubernetes** — Deployments, Services, Ingress, ConfigMaps, Secrets, HPA, liveness/readiness probes, pod anti-affinity
- **AWS** — EKS, ECR, RDS, ALB, VPC, S3, IAM (least privilege)
- **CI/CD** — GitHub Actions, automated testing, image tagging with git SHA, rolling deployments
- **Terraform** — Remote state in S3, modular structure, sensitive variable handling
- **Security** — Secrets never in code, non-root containers, private subnets for DB, security groups

---
*Built as a portfolio project to demonstrate production-grade DevOps engineering.*
