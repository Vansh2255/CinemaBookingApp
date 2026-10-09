# Kubernetes manifests

These manifests describe the private AKS application components. They are templates, not a blind replacement for a running cluster. Review diffs before applying them to an existing `cinema` namespace, especially StatefulSet/PVC resources.

## Prerequisites

- `kubectl` is configured for the private AKS cluster (run as the normal VM user, not `sudo kubectl`).
- The private ACR `leetamcr.azurecr.io` contains `cinema-backend:v2` and AKS kubelet identity has `AcrPull`.
- A StorageClass named `managed-csi-premium` exists.
- Update the image tag and frontend/API domains for your environment.

## Create namespace and secrets

```bash
kubectl apply -f infra/k8s/00-namespace.yaml
kubectl -n cinema create secret generic postgres-secret \
  --from-literal=POSTGRES_USER='cinemauser' \
  --from-literal=POSTGRES_PASSWORD='REPLACE_WITH_A_NEW_STRONG_PASSWORD' \
  --from-literal=POSTGRES_DB='cinemadb' \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n cinema create secret generic cinema-backend-secret \
  --from-literal=JWT_SECRET='REPLACE_WITH_LONG_RANDOM_SECRET' \
  --from-literal=JWT_REFRESH_SECRET='REPLACE_WITH_DIFFERENT_LONG_RANDOM_SECRET' \
  --from-literal=STRIPE_SECRET_KEY='sk_test_REPLACE_ME' \
  --from-literal=STRIPE_WEBHOOK_SECRET='whsec_REPLACE_ME' \
  --from-literal=MAIL_USER='REPLACE_ME' \
  --from-literal=MAIL_PASSWORD='REPLACE_ME' \
  --from-literal=MAIL_FROM='Cinema Booking <noreply@example.com>' \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f infra/k8s/05-runtime-config.example.yaml
```

Before applying the example ConfigMap, edit its domains. For production, use Key Vault + Secrets Store CSI Driver or another managed secret delivery approach rather than committing secret values.

## Apply manifests

If the database already exists, do **not** reapply `10-postgres.yaml` without reviewing its Service and StatefulSet selectors/volume claim templates. Existing PVCs contain data.

```bash
kubectl apply -f infra/k8s/10-postgres.yaml
kubectl apply -f infra/k8s/20-redis.yaml
kubectl apply -f infra/k8s/30-backend.yaml
kubectl apply -f infra/k8s/40-workers.yaml
kubectl get pods,svc,pvc -n cinema -o wide
```

## Run Prisma migrations

From `backend/`, ensure the image contains the same Prisma schema and migrations, then run a one-off migration job/pod with the same `DATABASE_URL`. Example from a trusted admin environment with network access to AKS:

```bash
kubectl run prisma-migrate -n cinema --rm -it --restart=Never \
  --image=leetamcr.azurecr.io/cinema-backend:v2 \
  --env="DATABASE_URL=postgresql://cinemauser:REPLACE_PASSWORD@postgresql:5432/cinemadb?schema=public" \
  --command -- npx prisma migrate deploy
```

Avoid putting a real password in shell history for production. Prefer a temporary Job using `envFrom`/`secretKeyRef`.

## Validate

```bash
kubectl get pods -n cinema
kubectl logs deployment/cinema-backend -n cinema --tail=100
kubectl exec -n cinema deploy/cinema-backend -- wget -qO- http://127.0.0.1:5000/health
kubectl get svc cinema-backend -n cinema
```

The backend Service must remain an **internal** LoadBalancer. Do not remove its internal-LB annotation or expose PostgreSQL/Redis with public LoadBalancers.
