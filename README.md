# 2AF — Authentication Service me 2FA

Backend microservice autentikimi i ndërtuar me **TypeScript + Node.js + Express**, arkitekturë **Clean Architecture (Hexagonal)**, me mbështetje për autentikim me dy faktorë (TOTP/Google Authenticator).

---

## Tabela e Përmbajtjes

- [Stack Teknologjik ](#stack-teknologjik)
- [Arkitektura ](#arkitektura)
- [Kërkesat ](#kërkesat)
- [Setup i Shpejtë — Docker Compose](#setup-i-shpejtë--docker-compose)
- [Setup i Plotë — Kubernetes ](#setup-i-plotë--kubernetes)
- [CI/CD Pipeline — Jenkins ](#cicd-pipeline--jenkins)
- [Endpointet API ](#endpointet-api)
- [Siguria ](#siguria)
- [Variablat e Mjedisit ](#variablat-e-mjedisit)
- [Testet ](#testet)

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
| Logging           | Pino (structured JSON logging)                  |
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
5. Prit derisa ikona të bëhet jeshile

Verifiko:

```powershell
kubectl get nodes
# NAME                    STATUS   ROLES           VERSION
# desktop-control-plane   Ready    control-plane   v1.34.x
```

### Hapi 2 — Krijo Namespace dhe Sekrete

```powershell
kubectl apply -f k8s/namespace.yaml

kubectl create secret generic auth-secrets `
  --namespace=auth-service `
  --from-literal=JWT_ACCESS_SECRET="vlera_jote_e_sigurt" `
  --from-literal=JWT_REFRESH_SECRET="vlera_jote_e_sigurt" `
  --from-literal=INTERNAL_API_KEY="vlera_jote_e_sigurt" `
  --from-literal=POSTGRES_USER="postgres" `
  --from-literal=POSTGRES_PASSWORD="vlera_jote_e_sigurt" `
  --from-literal=REDIS_PASSWORD="vlera_jote_e_sigurt"

kubectl get secret auth-secrets -n auth-service
```

> `secret.yaml` nuk ekziston në repo me qëllim — sekrete krijohen direkt me kubectl.

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
```

### Hapi 5 — Port Forward dhe Testo

```powershell
# Terminal 1
kubectl port-forward service/auth-service 30500:5000 -n auth-service

# Terminal 2
curl http://localhost:30500/health
```

---

## CI/CD Pipeline — Jenkins

### Hapi 1 — Ndërto imazhin custom Jenkins

```powershell
docker build -f Dockerfile.jenkins -t jenkins-custom:latest .
```

### Hapi 2 — Aktivizo Docker TCP në Docker Desktop

**Docker Desktop → Settings → General → Expose daemon on tcp://localhost:2375 without TLS**

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
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Hap **http://localhost:8080**, fut passwordin, instalo plugin-et e sugjeruara.

### Çfarë bën Pipeline-i

```
1. Checkout          → klonon kodin nga GitHub
2. Setup Kubeconfig  → rregullon host.docker.internal
3. Install Deps      → npm install
4. Run Tests         → 114 teste (unit + integration)
5. Build Image       → docker build 2af-auth-service:build-XX
6. Deploy K8s        → kubectl apply + rollout
```

---

## Endpointet API

### Auth

| Metoda | Endpoint            | Përshkrimi                      | Auth   |
| ------ | ------------------- | ------------------------------- | ------ |
| POST   | `/auth/register`    | Regjistrim                      | —      |
| POST   | `/auth/login`       | Login                           | —      |
| POST   | `/auth/login/2fa`   | Verifikim 2FA                   | —      |
| POST   | `/auth/2fa/init`    | Fillo setup 2FA                 | Bearer |
| POST   | `/auth/2fa/confirm` | Konfirmo setup 2FA              | Bearer |
| POST   | `/auth/2fa/disable` | Çaktivizo 2FA (kërkon password) | Bearer |
| POST   | `/auth/refresh`     | Rinovim token (rotation)        | Cookie |
| POST   | `/auth/logout`      | Logout nga pajisja aktuale      | Bearer |
| POST   | `/auth/logout-all`  | Logout nga të gjitha pajisjet   | Bearer |

### Admin

| Metoda | Endpoint                                | Përshkrimi           | Auth                |
| ------ | --------------------------------------- | -------------------- | ------------------- |
| GET    | `/admin/audit-logs`                     | Audit logs me filtra | Admin Bearer        |
| GET    | `/admin/debug/redis/health`             | Status Redis         | Admin + InternalKey |
| GET    | `/admin/debug/login-challenge/:id`      | Debug challenge      | Admin + InternalKey |
| GET    | `/admin/debug/2fa-setup/:userId/:token` | Debug 2FA setup      | Admin + InternalKey |

> Debug endpoints kërkojnë edhe header `x-internal-api-key`.

### Health

| Metoda | Endpoint  | Përshkrimi                                      |
| ------ | --------- | ----------------------------------------------- |
| GET    | `/health` | Status i shërbimit + PostgreSQL, Redis, MongoDB |

### Shembuj

```powershell
# Register
curl -X POST http://localhost:5000/auth/register `
  -H "Content-Type: application/json" `
  -d '{"fullName":"Getuar Jakupi","email":"getuar@test.com","password":"Password123"}'

# Login
curl -X POST http://localhost:5000/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"getuar@test.com","password":"Password123"}'

# Logout nga të gjitha pajisjet
curl -X POST http://localhost:5000/auth/logout-all `
  -H "Authorization: Bearer <accessToken>"

# Health check
curl http://localhost:5000/health
```

---

## Siguria

| Feature                | Përshkrimi                                                     |
| ---------------------- | -------------------------------------------------------------- |
| JWT Blacklist          | Access token invalidohet menjëherë pas logout                  |
| Refresh Token Rotation | Çdo refresh lëshon token të ri, i vjetri invalidohet           |
| Logout All Devices     | Invalidon të gjitha session-et aktive nëpërmjet generation key |
| 2FA TOTP               | Google Authenticator / çdo TOTP app                            |
| Rate Limiting          | Login: 10/15min, Register: 5/orë, 2FA: 5/5min                  |
| Helmet.js              | 12 HTTP security headers (CSP, HSTS, X-Frame-Options etj)      |
| Input Validation       | Validim i fushave para use case (required, type, length)       |
| Audit Logs me IP       | Çdo veprim regjistron userId, email, IP, User-Agent            |
| internalAuth           | Debug endpoints kërkojnë API key shtesë                        |

---

## Tokens

| Token          | Transport                      | TTL       | Ku ruhet          |
| -------------- | ------------------------------ | --------- | ----------------- |
| `accessToken`  | `Authorization: Bearer` header | 15 minuta | Memory (frontend) |
| `refreshToken` | `Set-Cookie: HttpOnly Strict`  | 7 ditë    | Cookie (browser)  |
| Blacklist      | Redis                          | 15 min    | Redis             |
| Generation Key | Redis                          | 7 ditë    | Redis             |

---

## Variablat e Mjedisit

| Variabla                 | Përshkrimi                      | Default  |
| ------------------------ | ------------------------------- | -------- |
| `APP_RUNTIME_MODE`       | `memory` ose `production`       | `memory` |
| `PORT`                   | Porta e serverit                | `5000`   |
| `JWT_ACCESS_SECRET`      | Sekret për access token         | —        |
| `JWT_REFRESH_SECRET`     | Sekret për refresh token        | —        |
| `INTERNAL_API_KEY`       | Çelës për debug endpoints       | —        |
| `POSTGRES_URL`           | URL e PostgreSQL                | —        |
| `REDIS_URL`              | URL e Redis                     | —        |
| `MONGODB_URL`            | URL e MongoDB                   | —        |
| `KAFKA_BROKERS`          | Adresat e Kafka brokerëve       | —        |
| `KAFKA_ENABLED`          | Aktivizo Kafka (`true`/`false`) | `false`  |
| `ADMIN_EMAILS`           | Emailat admin (ndarë me presje) | —        |
| `TWO_FA_EXPIRES_SECONDS` | TTL i setup-it 2FA              | `300`    |

---

## Testet

```powershell
# Ekzekuto të gjitha testet
npm test

# Vetëm unit teste
npm test -- tests/unit

# Vetëm integration teste
npm test -- tests/integration

# Me coverage
npm run test:coverage
```

### Rezultati

```
Test Suites: 15 passed
Tests:       114 passed
Coverage:    100% (app/domain)
```

### Struktura e Testeve

```
tests/
├── unit/
│   ├── domain/auth/          # Policy tests
│   └── app/usecases/         # Use case tests (100% coverage)
└── integration/
    ├── auth.routes.spec.ts   # Auth endpoint tests
    └── admin.routes.spec.ts  # Admin endpoint tests
```

---

## Troubleshooting

**Jenkins nuk lidhet me Docker:**

```powershell
# Docker Desktop → Settings → General
# Aktivizo: Expose daemon on tcp://localhost:2375 without TLS
```

**Pod nuk starton (ImagePullBackOff):**

```powershell
kubectl describe pod -n auth-service | grep -A5 "Events"
# Sigurohu që imagePullPolicy është IfNotPresent
```

**Sekret mungon:**

```powershell
kubectl get secret auth-secrets -n auth-service
# Nëse nuk ekziston, ekzekuto Hapin 2 të Setup Kubernetes
```

**Health check kthen 503:**

```powershell
curl http://localhost:5000/health
# Kontrollo cilat shërbime janë degraded: postgres/redis/mongodb
```
