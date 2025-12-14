# Three-Body Entropy RNG - Makefile
# Build, test, and deploy commands

.PHONY: help install dev build test lint clean docker-build docker-push deploy migrate

# Variables
PROJECT_ID ?= ornate-time-270711
REGION ?= us-west1
CLUSTER ?= w2e-dev
NAMESPACE ?= ebisu-games-stg
IMAGE_NAME ?= three-body-rng
REGISTRY ?= us-west1-docker.pkg.dev/$(PROJECT_ID)/docker

# Get git commit hash
GIT_SHA := $(shell git rev-parse --short HEAD 2>/dev/null || echo "latest")

# Default target
help:
	@echo "Three-Body Entropy RNG - Available Commands"
	@echo "============================================"
	@echo ""
	@echo "Development:"
	@echo "  make install      - Install all dependencies"
	@echo "  make dev          - Start development server"
	@echo "  make test         - Run all tests"
	@echo "  make lint         - Run linting"
	@echo "  make clean        - Clean build artifacts"
	@echo ""
	@echo "Database:"
	@echo "  make migrate      - Run database migrations"
	@echo "  make migrate-down - Rollback migrations"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-push  - Push image to registry"
	@echo "  make docker-run   - Run container locally"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy       - Deploy to GKE"
	@echo "  make deploy-dry   - Dry run deployment"
	@echo "  make rollback     - Rollback deployment"
	@echo "  make logs         - View pod logs"
	@echo "  make status       - Check deployment status"
	@echo ""

# Install dependencies
install:
	@echo "Installing server dependencies..."
	cd server && npm ci
	@echo "Installing module dependencies..."
	cd modules/physics-engine && npm ci
	cd modules/hash-chain && npm ci
	cd modules/theta-protection && npm ci
	cd modules/session-state-machine && npm ci
	cd modules/client-library && npm ci
	cd modules/entropy-oracle && npm ci
	cd modules/integration-examples && npm ci
	@echo "Done!"

# Development server
dev:
	cd server && npm run dev

# Run tests
test:
	@echo "Running server tests..."
	cd server && npm test
	@echo "Running module tests..."
	cd modules/physics-engine && npm test
	cd modules/hash-chain && npm test
	cd modules/theta-protection && npm test
	cd modules/session-state-machine && npm test
	cd modules/client-library && npm test
	cd modules/entropy-oracle && npm test
	cd modules/integration-examples && npm test
	@echo "All tests passed!"

# Lint
lint:
	cd server && npm run lint
	@echo "Linting complete!"

# Clean
clean:
	rm -rf node_modules
	rm -rf server/node_modules
	rm -rf modules/*/node_modules
	rm -rf modules/*/dist
	@echo "Cleaned!"

# Database migrations
migrate:
	cd server && npm run migrate

migrate-down:
	cd server && npm run migrate:rollback

# Docker build
docker-build:
	@echo "Building Docker image: $(IMAGE_NAME):$(GIT_SHA)"
	docker build -t $(REGISTRY)/$(IMAGE_NAME):$(GIT_SHA) -t $(REGISTRY)/$(IMAGE_NAME):latest .

# Docker push
docker-push: docker-build
	@echo "Pushing to registry..."
	docker push $(REGISTRY)/$(IMAGE_NAME):$(GIT_SHA)
	docker push $(REGISTRY)/$(IMAGE_NAME):latest

# Docker run locally
docker-run:
	docker run -p 3000:3000 \
		-e NODE_ENV=development \
		-e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/three_body_rng \
		-e REDIS_URL=redis://host.docker.internal:6379 \
		$(REGISTRY)/$(IMAGE_NAME):latest

# Get GKE credentials
gke-auth:
	gcloud container clusters get-credentials $(CLUSTER) --zone $(REGION)-a --project $(PROJECT_ID)

# Deploy to GKE
deploy: gke-auth
	@echo "Deploying to GKE..."
	kubectl apply -f kubernetes/ -n $(NAMESPACE)
	kubectl set image deployment/three-body-rng-api api=$(REGISTRY)/$(IMAGE_NAME):$(GIT_SHA) -n $(NAMESPACE)
	kubectl rollout status deployment/three-body-rng-api -n $(NAMESPACE) --timeout=300s
	@echo "Deployment complete!"

# Dry run deployment
deploy-dry: gke-auth
	@echo "Dry run deployment..."
	kubectl apply -f kubernetes/ -n $(NAMESPACE) --dry-run=client

# Rollback deployment
rollback: gke-auth
	@echo "Rolling back deployment..."
	kubectl rollout undo deployment/three-body-rng-api -n $(NAMESPACE)
	kubectl rollout status deployment/three-body-rng-api -n $(NAMESPACE)

# View logs
logs: gke-auth
	kubectl logs -f deployment/three-body-rng-api -n $(NAMESPACE) --tail=100

# Check status
status: gke-auth
	@echo "Deployment Status:"
	kubectl get deployment three-body-rng-api -n $(NAMESPACE)
	@echo ""
	@echo "Pods:"
	kubectl get pods -l app=three-body-rng-api -n $(NAMESPACE)
	@echo ""
	@echo "Service:"
	kubectl get svc three-body-rng-api -n $(NAMESPACE)

# Create secrets (run once)
create-secrets: gke-auth
	@echo "Creating secrets..."
	@read -p "Enter DATABASE_URL: " db_url; \
	read -p "Enter REDIS_URL: " redis_url; \
	read -p "Enter API_SECRET_KEY: " api_key; \
	kubectl create secret generic three-body-rng-secrets \
		--from-literal=database-url="$$db_url" \
		--from-literal=redis-url="$$redis_url" \
		--from-literal=api-secret-key="$$api_key" \
		-n $(NAMESPACE) --dry-run=client -o yaml | kubectl apply -f -

# Cloud Build trigger
cloudbuild:
	gcloud builds submit --config=.cloudbuild/deploy.yaml --project=$(PROJECT_ID)

# Port forward for local testing
port-forward: gke-auth
	kubectl port-forward svc/three-body-rng-api 3000:3000 -n $(NAMESPACE)
