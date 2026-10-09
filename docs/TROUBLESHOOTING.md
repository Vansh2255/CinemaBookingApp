# Troubleshooting log and lessons learned

| Symptom | Cause / explanation | Correction and lesson |
|---|---|---|
| Private VM could not be SSHed to from Windows over the Internet | VM intentionally had no public IP | Configure Point-to-Site VPN and test TCP/22 to the private IP. Prefer private access over exposing a management VM. |
| `sudo kubectl get nodes` failed but normal `kubectl` worked | The kubeconfig belonged to the normal VM user, not root | Use `kubectl` as the configured user; `sudo` changes the home directory and kubeconfig context. |
| PostgreSQL initialization failed on a mounted volume | The root of the mounted volume could contain `lost+found`, which PostgreSQL doesn't accept as its data directory | Set `PGDATA=/var/lib/postgresql/data/pgdata` so PostgreSQL initializes in a clean subdirectory. |
| An extra `postgres-pvc` stayed Pending while the StatefulSet PVC was Bound | StatefulSet's `volumeClaimTemplates` created the PVC actually used by `postgresql-0` | Check `kubectl get pvc -n cinema` and inspect pod volume claims before removing an unused claim. Never delete the bound data PVC casually. |
| Redis service connectivity was uncertain | A Running pod alone doesn't prove Service routing works | Test from a pod with `redis-cli -h redis ping`; `PONG` confirmed service connectivity. |
| Container image architecture mismatch | Original image was amd64-only while AKS nodes were ARM64 | Build with Buildx for `linux/amd64,linux/arm64`; check node architecture before deploying. |
| AKS could not resolve/reach private ACR correctly | Private DNS zone wasn't linked to the AKS VNet / endpoint DNS configuration was incomplete | Add the ACR DNS zone group and link `privatelink.azurecr.io` to the AKS VNet; verify hostname resolves to the private endpoint IP. |
| `curl https://leetamcr.azurecr.io/v2/` returned 401 | Registry was reachable but the request wasn't authenticated | A 401 from `/v2/` is a useful network test: DNS/TCP/TLS reached ACR. Then verify identity/RBAC separately. |
| `az aks check-acr` returned `exec /canipull: exec format error` | Diagnostic helper had an architecture compatibility issue in this environment | Validate actual image pull from an AKS pod and check kubelet `AcrPull`; distinguish diagnostic failures from real data-plane failures. |
| Azure Storage upload failed despite the VM having Blob Data Contributor | Azure CLI session/token was stale | `az logout` then `az login --identity`; retry with `--auth-mode login`. Check connectivity and authorization separately. |
| Front Door route pattern conflicted | Existing frontend route already owned `/*` on its endpoint | Use a separate backend endpoint/route for the API origin, or deliberately design non-overlapping route patterns. |
| Azure CLI deployment status looked stale/NotStarted while endpoint worked | Control-plane status and data-plane behavior were temporarily out of sync | Test the actual endpoint (`/health`) and inspect HTTP status/headers instead of relying on one status field. |
| Backend initially only had ClusterIP | ClusterIP is cluster-internal and not the intended private origin frontend for Front Door PLS | Use an internal LoadBalancer with `service.beta.kubernetes.io/azure-load-balancer-internal: "true"`; keep it private. |
| `express-rate-limit` logged `ERR_ERL_STORE_REUSE` | A Store instance was reused across limiters | Application still started and health passed, but fix limiter initialization so each limiter gets its intended independent store. |
| Database tables existed but Movies page was empty | Schema/migrations existed, but no movie records were seeded | Seed or create genres, movies, theatres, screens, seats and showtimes using supported app/admin paths. An empty result isn't a network failure. |
| PowerShell curl JSON request failed | PowerShell quoting/curl alias differences caused malformed JSON | Build request bodies with `ConvertTo-Json -Compress` and use `Invoke-RestMethod`. |
| Frontend build/dependency warnings | Dependency/import issues and a React `useEffect` dependency warning appeared during earlier builds | Install declared dependencies, rebuild, and fix warnings. A warning does not always mean the build failed. |
| Frontend API still points to an old host after changing config | Vite variables are embedded at build time | Update `VITE_API_BASE_URL`, run `npm run build`, then upload the new `dist/` contents. |

## Debug by layer

When a request fails, test each layer in order:

1. DNS: does the hostname resolve to the expected public Front Door hostname or private endpoint IP?
2. Network: can the source reach the destination port (`nc`, `Test-NetConnection`, `curl`)?
3. Private Link/origin: is the PLS connection approved and the origin healthy?
4. Load Balancer/Service: does the service have the right selector and endpoint?
5. Pod: is it Running/Ready, and do logs show errors?
6. Application: does `/health` return 200? Do auth and validation endpoints behave as expected?
7. Dependencies: are PostgreSQL and Redis reachable and healthy?
8. Authorization: after network reachability is proven, check RBAC, credentials, JWT and application permissions.

A successful backend `/health` response with `database: up` and `redis: up` proves much more than a pod merely showing Running.
