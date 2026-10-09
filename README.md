# Cinema Booking — Azure deployment repository

This repository groups the existing Cinema Booking backend, the React/Vite frontend used with the deployed API, and Azure/AKS deployment documentation.

## Repository layout

```text
.
├── backend/                 # Existing Node.js/Express + Prisma API and workers
├── frontend/                # React + Vite static website
├── infra/k8s/               # Kubernetes manifest templates
├── docs/                    # Architecture, traffic flow, troubleshooting notes
└── scripts/                 # Build/deploy helper scripts
```

## Current Azure deployment shape

- **Frontend:** React/Vite build uploaded to the Storage Account `$web` container; Azure Front Door Premium is the browser entry point and connects to Storage through Private Link.
- **Backend:** Node.js API and background workers in private AKS. The backend is exposed through an internal AKS Load Balancer, then Azure Private Link Service, consumed by the backend Azure Front Door endpoint.
- **Data:** PostgreSQL StatefulSet with a persistent Azure managed disk and Redis Deployment; both are private Kubernetes Services.
- **Images:** Docker image stored in private Azure Container Registry (`leetamcr.azurecr.io`). The backend image must support `linux/arm64` because the AKS nodes are ARM64; the deployed `v2` image is multi-architecture.
- **Administration:** Private VM accessed through Point-to-Site VPN. Use `kubectl` as the normal VM user, not `sudo kubectl`.

See [architecture](docs/ARCHITECTURE.md), [troubleshooting](docs/TROUBLESHOOTING.md), and [Kubernetes manifest notes](infra/k8s/README.md).

## Local development

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with local development credentials; never commit .env.
npm ci
npx prisma generate
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_BASE_URL to the backend URL reachable from your browser.
npm install
npm run dev
```

For production static hosting, Vite embeds `VITE_API_BASE_URL` at build time:

```bash
npm run build
# Upload frontend/dist/ contents (not the dist folder itself) to Storage $web.
```

## Build and push backend image

Run from `backend/` on a build machine with Docker Buildx and ACR access:

```bash
az login --identity   # use only on an Azure VM configured with managed identity
az acr login --name leetamcr

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t leetamcr.azurecr.io/cinema-backend:v2 \
  --push .
```

Use a new immutable tag for each release rather than relying on `latest`.

## Important safety notes

- Never commit `.env`, kubeconfig, certificates, access tokens, passwords, Stripe keys, SMTP credentials, or real JWT secrets.
- The secrets used during learning were placeholders; create fresh strong values before any production use. Rotate any credentials that have ever been pasted into chat or committed to Git.
- The Kubernetes files are **templates**. Review them against the live cluster before applying, especially PostgreSQL StatefulSet/PVC resources, because reapplying storage manifests can affect an existing data workload.
- Payment/email settings are placeholders. The application is not production-ready for real payments or email until those integrations and webhook handling are configured and tested.
- Front Door domains shown in the docs are Azure-generated hostnames from the current learning environment. Replace them if resources are recreated. `www.tatt3r.com` and `api.tatt3r.com` are examples only; custom domains are not assumed to be configured.
