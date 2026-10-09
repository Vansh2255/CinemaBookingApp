# Azure architecture and end-to-end traffic

## Component map

```text
Browser
  | HTTPS
  v
Azure Front Door Premium
  |-- frontend endpoint --> Private Link --> Storage private endpoint --> Storage $web
  |                                                                    |-- index.html
  |                                                                    |-- JS/CSS assets
  |
  `-- backend endpoint --> Private Link connection --> Private Link Service
                                                       |
                                                       v
                                           AKS internal Load Balancer
                                                  10.224.0.7:5000
                                                       |
                                                       v
                                           cinema-backend Pod :5000
                                              |             |
                                              v             v
                                     postgresql:5432     redis:6379
                                              |             |
                                              v             v
                                      PostgreSQL Pod     Redis Pod
                                              |
                                              v
                                      Azure managed disk
```

Supporting infrastructure:

- **Private ACR:** `leetamcr.azurecr.io`, private endpoint in the main VNet. AKS reaches it over VNet peering and private DNS. AKS kubelet identity uses `AcrPull`.
- **VM:** `leetamVM`, no public IP, used for CLI, builds and tests. Access from Windows uses Point-to-Site VPN.
- **VNet peering:** connects the VM/main VNet and AKS VNet where needed for private resource access.
- **Private DNS:** `privatelink.azurecr.io` must be linked to the VNets that need to resolve ACR privately.
- **NAT Gateway:** outbound connectivity only; it does not make the VM or AKS service publicly reachable.

## Frontend request flow

1. The user opens the frontend Front Door hostname in a browser.
2. Front Door serves the static website from the Storage Account `$web` container using its approved private connectivity.
3. The browser downloads `index.html`, JavaScript and CSS; React runs in the browser.
4. The frontend JavaScript sends API requests to the backend Front Door hostname configured by `VITE_API_BASE_URL`.

## API request flow

1. The browser sends HTTPS to the backend Front Door endpoint (for example, login or `GET /api/movies`).
2. Front Door forwards the request through its approved Private Link connection to `leetam-cinema-backend-pls`.
3. The Private Link Service fronts the AKS internal Load Balancer at private IP `10.224.0.7`.
4. The Load Balancer forwards TCP traffic to the selected `cinema-backend` pod on port 5000.
5. The backend validates the request/JWT and accesses PostgreSQL through the Kubernetes DNS service `postgresql:5432` and Redis through `redis:6379` as needed.
6. The response returns through the established connection: backend pod → internal Load Balancer → Private Link/Front Door → browser.

The browser's HTTPS connection terminates at Front Door; the origin connection in the current configuration uses HTTP to port 5000 inside the private origin path. For production, explicitly assess origin encryption requirements and configure HTTPS end-to-end if the origin supports it.

## Data and workers

- PostgreSQL runs as a StatefulSet and stores data on a persistent managed disk through a PVC. Its service is private and it should not be exposed publicly.
- Redis is a private ClusterIP service. The current learning deployment does not configure Redis persistence; treat Redis contents as ephemeral.
- `cinema-email-worker` and `cinema-cleanup-worker` run the same image with different commands. The email worker handles queued email tasks; the cleanup worker processes reservation lifecycle/expiry work.

## Image deployment path

```text
Source code on build VM -> Docker Buildx (amd64 + arm64) -> private ACR
     -> AKS kubelet identity (AcrPull) -> backend/worker pods
```

AKS nodes in this environment use ARM64. A single-architecture amd64 image can fail to run on those nodes; build and push a multi-platform manifest.

## Domain plan (not yet configured in the recorded deployment)

- `www.yourdomain.example` → frontend Front Door endpoint → Storage `$web`.
- `api.yourdomain.example` → backend Front Door endpoint → PLS → AKS internal LB.
- Add/validate each custom domain in Front Door, publish the Azure-provided DNS TXT validation record, configure CNAMEs, associate domains with the correct routes, and enable HTTPS. Do not point public DNS directly to the private AKS IP or Storage private endpoint.
- If the frontend API hostname changes, update `VITE_API_BASE_URL`, rebuild the frontend, and re-upload the `dist/` files.
