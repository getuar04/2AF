# 2AF — Authentication Service me 2FA

Backend microservice autentikimi i ndërtuar me **TypeScript + Node.js + Express**, arkitekturë **Clean Architecture (Hexagonal)**, me mbështetje për autentikim me dy faktorë (TOTP/Google Authenticator).

---

## 📋 Tabela e Përmbajtjes

- [Stack Teknologjik](#stack-teknologjik)
- [Arkitektura](#arkitektura)
- [Kërkesat](#kërkesat)
- [Setup i Shpejtë — Docker Compose](#setup-i-shpejtë--docker-compose)
- [Setup i Plotë — Kubernetes](#setup-i-plotë--kubernetes)
- [CI/CD Pipeline — Jenkins](#cicd-pipeline--jenkins)
- [Endpointet API](#endpointet-api)
- [Variablat e Mjedisit](#variablat-e-mjedisit)
- [Testet](#testet)

---

## Stack Teknologjik

| Komponenti        | Teknologjia                                     |
| ----------------- | ----------------------------------------------- |
| Runtime           | Node.js 20 + TypeScript                         |
| Framework         | Express.js                                      |
| Databaza kryesore | PostgreSQL 16                                   |
| Audit logs        | MongoDB 7                                       |
| Cache / Session   | Redis 7                                         |
| Messaging         | Apache Kafka                                    |
| Autentikimi       | JWT (access 15m + refresh 7d)                   |
| 2FA               | TOTP nëpërmjet Speakeasy + Google Authenticator |
| Kontejnerizimi    | Docker + Kubernetes                             |
| CI/CD             | Jenkins                                         |

---

## Arkitektura

```
src/
├── domain/          # Rregullat e biznesit (Policies)
├── app/             # Use Cases, Ports, DTOs, Events
├── infra/           # Implementimet (HTTP, DB, Cache, Security)
└── di.ts            # Dependency Injection container
```

Projekti ndjek **Clean Architecture** — shtresa domain dhe app nuk kanë asnjë varësi nga infrastruktura.

---

## Kërkesat

- **Docker Desktop** me Kubernetes të aktivizuar
- **kubectl** i instaluar
- **Node.js 20+** (për zhvillim lokal)
- **Git**

---

## Setup i Shpejtë — Docker Compose

Për zhvillim lokal pa Kubernetes:

```powershell
# 1. Klono projektin
git clone https://github.com/getuar04/2AF.git
cd 2AF

# 2. Krijo .env nga shembulli
copy .env.example .env

# 3. Starto të gjitha shërbimet
docker compose up -d

# 4. Prit ~30 sekonda dhe testo
curl http://localhost:5000/health
```

---

## Setup i Plotë — Kubernetes

### Hapi 1 — Aktivizo Kubernetes në Docker Desktop

1. Hap **Docker Desktop**
2. Shko te **Settings → Kubernetes**
3. Aktivizo **"Enable Kubernetes"**
4. Kliko **"Apply & Restart"**
5. Prit derisa ikona të bëhet jeshile ✅

Verifiko:

```powershell
kubectl get nodes
# NAME                    STATUS   ROLES           VERSION
# desktop-control-plane   Ready    control-plane   v1.34.x
```

### Hapi 2 — Krijo Namespace dhe Sekrete

```powershell
# Krijo namespace
kubectl apply -f k8s/namespace.yaml

# Krijo sekrete (ndrysho vlerat!)
kubectl create secret generic auth-secrets `
  --namespace=auth-service `
  --from-literal=JWT_ACCESS_SECRET="vlera_jote_e_sigurt" `
  --from-literal=JWT_REFRESH_SECRET="vlera_jote_e_sigurt" `
  --from-literal=INTERNAL_API_KEY="vlera_jote_e_sigurt" `
  --from-literal=POSTGRES_USER="postgres" `
  --from-literal=POSTGRES_PASSWORD="vlera_jote_e_sigurt" `
  --from-literal=REDIS_PASSWORD="vlera_jote_e_sigurt"

# Verifiko
kubectl get secret auth-secrets -n auth-service
```

> ⚠️ `secret.yaml` nuk ekziston në repo me qëllim — sekrete krijohen direkt me kubectl.

### Hapi 3 — Deploy Kubernetes

```powershell
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/kafka.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

### Hapi 4 — Prit që pods të jenë gati

```powershell
kubectl get pods -n auth-service -w
# Prit derisa të gjitha të jenë 1/1 Running
```

### Hapi 5 — Port Forward dhe Testo

```powershell
# Terminal 1 — lëre hapur
kubectl port-forward service/auth-service 30500:5000 -n auth-service

# Terminal 2 — testo
curl http://localhost:30500/health
```

---

## CI/CD Pipeline — Jenkins

### Hapi 1 — Ndërto imazhin custom Jenkins

```powershell
docker build -f Dockerfile.jenkins -t jenkins-custom:latest .
```

Imazhi përfshin: `docker CLI`, `kubectl`, `python3 + PyYAML`, `node 20`.

### Hapi 2 — Aktivizo Docker TCP në Docker Desktop

Shko te **Docker Desktop → Settings → General** dhe aktivizo:

```
✅ Expose daemon on tcp://localhost:2375 without TLS
```

### Hapi 3 — Starto Jenkins

```powershell
docker run -d `
  --name jenkins `
  --restart=on-failure `
  -p 8080:8080 `
  -p 50000:50000 `
  -v jenkins_home:/var/jenkins_home `
  -v "$env:USERPROFILE\.kube:/var/jenkins_home/.kube:ro" `
  -e DOCKER_HOST=tcp://host.docker.internal:2375 `
  -e KUBECONFIG=/var/jenkins_home/.kube/config `
  --add-host=host.docker.internal:host-gateway `
  jenkins-custom:latest
```

### Hapi 4 — Konfiguro Jenkins

```powershell
# Merr passwordin fillestar
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Hap **http://localhost:8080** dhe:

1. Fut passwordin fillestar
2. Instalo plugin-et e sugjeruara
3. Shko te **Manage Jenkins → Credentials → Global**
4. Shto credential të re:
   - **Kind**: Username with password
   - **ID**: `docker-hub-credentials`
   - **Username**: username-i Docker Hub
   - **Password**: Docker Hub Personal Access Token

### Hapi 5 — Krijo Pipeline Job

1. **New Item → Pipeline**
2. **Name**: `2AF-Pipeline`
3. **Pipeline → Definition**: Pipeline script from SCM
4. **SCM**: Git
5. **Repository URL**: `https://github.com/getuar04/2AF.git`
6. **Branch**: `*/main`
7. **Script Path**: `Jenkinsfile`

### Hapi 6 — Triggero Build

Çdo `git push origin main` triggeron pipeline automatikisht.

Ose manualisht: **Build Now** në http://localhost:8080.

### Çfarë bën Pipeline-i

```
1. Checkout          → klonon kodin nga GitHub
2. Setup Kubeconfig  → rregullon host.docker.internal + TLS
3. Install Deps      → npm install
4. Run Tests         → 82 teste (unit + integration)
5. Pre-pull Image    → docker pull node:20-alpine
6. Build Image       → docker build 2af-auth-service:build-XX
7. Deploy K8s        → kubectl apply + rollout
```

---

# Hapi 1 - Login dhe ruaj session

$login = Invoke-RestMethod -Method POST -Uri "http://localhost:30500/auth/login" -ContentType "application/json" -Body '{"email":"admin@test.ts","password":"12345678"}' -SessionVariable session

$accessToken = $login.accessToken
echo "Access Token: $accessToken"

# Hapi 2 - Refresh (cookie dërgohet automatikisht nga session)

$refresh = Invoke-RestMethod -Method POST -Uri "http://localhost:30500/auth/refresh" -WebSession $session
$newAccessToken = $refresh.accessToken
echo "Access Token i Ri: $newAccessToken"

# Hapi 3 - Perdor token-in e ri per nje endpoint

$headers = @{ "Authorization" = "Bearer $newAccessToken" }
$auditLogs = Invoke-RestMethod -Method GET -Uri "http://localhost:30500/admin/audit-logs" -Headers $headers
$auditLogs | ConvertTo-Json -Depth 3

## Endpointet API

### Auth

| Metoda | Endpoint            | Përshkrimi      | Auth      |
| ------ | ------------------- | --------------- | --------- |
| POST   | `/auth/register`    | Regjistrim      | —         |
| POST   | `/auth/login`       | Login           | —         |
| POST   | `/auth/login/2fa`   | Verifikim 2FA   | —         |
| POST   | `/auth/2fa/init`    | Fillo setup 2FA | ✅ Bearer |
| POST   | `/auth/2fa/confirm` | Konfirmo 2FA    | ✅ Bearer |
| POST   | `/auth/refresh`     | Rinovim token   | Cookie    |
| POST   | `/auth/logout`      | Logout          | ✅ Bearer |

### Admin

| Metoda | Endpoint                                | Përshkrimi           | Auth     |
| ------ | --------------------------------------- | -------------------- | -------- |
| GET    | `/admin/audit-logs`                     | Audit logs me filtra | ✅ Admin |
| GET    | `/admin/debug/redis/health`             | Status Redis         | ✅ Admin |
| GET    | `/admin/debug/login-challenge/:id`      | Debug challenge      | ✅ Admin |
| GET    | `/admin/debug/2fa-setup/:userId/:token` | Debug 2FA setup      | ✅ Admin |

### Shembuj

```powershell
# Register
curl -X POST http://localhost:30500/auth/register `
  -H "Content-Type: application/json" `
  -d '{"fullName":"Getuar Jakupi","email":"getuar@test.com","password":"Password123"}'

# Login
curl -X POST http://localhost:30500/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"getuar@test.com","password":"Password123"}'

# Shiko users në PostgreSQL
kubectl exec -it deployment/postgres -n auth-service -- `
  psql -U postgres -d 2af -c "SELECT id, full_name, email, role, is_two_factor_enabled FROM users;"
```

---

## Tokens

| Token          | Transport                      | TTL       | Ku ruhet          |
| -------------- | ------------------------------ | --------- | ----------------- |
| `accessToken`  | `Authorization: Bearer` header | 15 minuta | Memory (frontend) |
| `refreshToken` | `Set-Cookie: HttpOnly Secure`  | 7 ditë    | Cookie (browser)  |
| Blacklist      | —                              | 900s      | Redis             |

---

## Variablat e Mjedisit

| Variabla             | Përshkrimi                       | Default  |
| -------------------- | -------------------------------- | -------- |
| `APP_RUNTIME_MODE`   | `memory` ose `production`        | `memory` |
| `PORT`               | Porta e serverit                 | `5000`   |
| `JWT_ACCESS_SECRET`  | Sekret për access token          | —        |
| `JWT_REFRESH_SECRET` | Sekret për refresh token         | —        |
| `INTERNAL_API_KEY`   | Çelës për komunikim ndër-service | —        |
| `POSTGRES_URL`       | URL e PostgreSQL                 | —        |
| `REDIS_URL`          | URL e Redis                      | —        |
| `MONGODB_URL`        | URL e MongoDB                    | —        |
| `KAFKA_BROKERS`      | Adresat e Kafka brokerëve        | —        |
| `ADMIN_EMAILS`       | Emailat admin (ndarë me presje)  | —        |

---

## Testet

```powershell
# Ekzekuto të gjitha testet
npm test

# Vetëm unit teste
npm test -- tests/unit

# Vetëm integration teste
npm test -- tests/integration
```

### Rezultati

```
Test Suites: 10 passed
Tests:       82 passed
Coverage:    83.95% statements
```

### Struktura e Testeve

```
tests/
├── unit/
│   ├── domain/auth/          # Policy tests
│   └── app/usecases/         # Use case tests
└── integration/
    ├── auth.routes.spec.ts   # Auth endpoint tests
    └── admin.routes.spec.ts  # Admin endpoint tests
```

---

## Troubleshooting

**Jenkins nuk lidhet me Docker:**

```powershell
# Aktivizo Docker TCP: Docker Desktop → Settings → General
# ✅ Expose daemon on tcp://localhost:2375 without TLS
```

**kubectl connection refused brenda Jenkins:**

```powershell
# Pipeline e rregullon automatikisht — Setup Kubeconfig stage
# Testo manualisht:
docker exec jenkins sh -c "cp /var/jenkins_home/.kube/config /tmp/k.conf && \
  sed -i 's|127.0.0.1|host.docker.internal|g' /tmp/k.conf && \
  kubectl --kubeconfig /tmp/k.conf --insecure-skip-tls-verify get nodes"
```

**Pod nuk starton (ImagePullBackOff):**

```powershell
# Sigurohu që imagePullPolicy është IfNotPresent në deployment.yaml
kubectl describe pod -n auth-service | grep -A5 "Events"
```

**Sekret mungon:**

```powershell
kubectl get secret auth-secrets -n auth-service
# Nëse nuk ekziston, ekzekuto Hapin 2 të Setup Kubernetes
```
