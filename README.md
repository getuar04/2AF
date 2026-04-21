# 2AF — Authentication Service with 2FA

Authentication microservice i ndërtuar me **TypeScript**, **Node.js** dhe **Express**. Mbështet regjistrim, login dhe autentifikim me dy faktorë (2FA) duke përdorur Google Authenticator.

---

## Arkitektura

```
src/
├── app/
│   ├── usecases/        # Logjika e biznesit (Register, Login, 2FA)
│   ├── services/        # Auth & Audit services
│   ├── ports/           # Interfejset (abstraksionet)
│   └── errors/          # Gabimet e aplikacionit
├── domain/
│   └── auth/            # Politikat e domenës (validime)
└── infra/
    ├── http/            # Controllers, Routes, Middlewares
    ├── persistence/     # PostgreSQL, MongoDB, Memory
    ├── messaging/       # Kafka event bus
    ├── cache/           # Redis
    └── security/        # JWT, Bcrypt, TOTP (2FA)
```

---

## Teknologjitë

| Teknologjia   | Përdorimi                 |
| ------------- | ------------------------- |
| Node.js 20    | Runtime                   |
| TypeScript    | Gjuha e programimit       |
| Express       | HTTP server               |
| PostgreSQL 16 | Databaza kryesore (users) |
| MongoDB 7     | Audit logs                |
| Redis 7       | Cache (2FA challenges)    |
| Kafka         | Event bus (auth events)   |
| Docker        | Containerizim             |
| Kubernetes    | Orkestrimi                |
| Jenkins       | CI/CD Pipeline            |

---

## API Endpoints

| Method | Endpoint            | Përshkrimi                         |
| ------ | ------------------- | ---------------------------------- |
| GET    | `/health`           | Kontrollo statusin e shërbimit     |
| POST   | `/auth/register`    | Regjistro user të ri               |
| POST   | `/auth/login`       | Login (kthen token ose kërkon 2FA) |
| POST   | `/auth/2fa/init`    | Inicializo 2FA setup               |
| POST   | `/auth/2fa/confirm` | Konfirmo 2FA me kod                |
| POST   | `/auth/login/2fa`   | Verifiko login me kod 2FA          |

### Shembuj

**Register:**

```json
POST /auth/register
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Login:**

```json
POST /auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Login me 2FA aktiv — kthehet:**

```json
{ "status": "REQUIRE_2FA", "challengeId": "..." }
```

**Verifiko 2FA:**

```json
POST /auth/login/2fa
{
  "challengeId": "...",
  "code": "123456"
}
```

---

## Variablat e Mjedisit

```env
NODE_ENV=development
PORT=5000
APP_RUNTIME_MODE=production   # "memory" për teste, "production" për infra të plotë

JWT_SECRET=supersecret
JWT_EXPIRES_IN=1h
INTERNAL_API_KEY=local-internal-key

REDIS_URL=redis://localhost:6379

KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=authentication-service
KAFKA_AUTH_TOPIC=auth.events

POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/2af

MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=authentication_service
MONGODB_AUDIT_COLLECTION=auth_audit_logs

TWO_FA_EXPIRES_SECONDS=300
```

---

## Kërkesat

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (me Kubernetes të aktivizuar)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Node.js 20+](https://nodejs.org/)
- [ngrok](https://ngrok.com/) (për webhook)

---

## Setup i Shpejtë me Docker Compose

### 1. Klono projektin

```bash
git clone https://github.com/getuar04/2AF.git
cd 2AF
```

### 2. Nis të gjitha shërbimet

```bash
docker compose up -d
```

### 3. Kontrollo statusin

```bash
docker ps
```

Duhet të shohësh 6 kontejnerë me status `healthy`:

- `auth-service`
- `auth-postgres`
- `auth-mongodb`
- `auth-redis`
- `auth-kafka`
- `auth-zookeeper`

### 4. Testo

```bash
curl http://localhost:5000/health
```

### 5. Ndalo

```bash
docker compose down -v
```

---

## Setup me Kubernetes (Docker Desktop)

### 1. Aktivizo Kubernetes

Docker Desktop → Settings → Kubernetes → **Enable Kubernetes** → Apply & Restart

### 2. Verifiko

```bash
kubectl get nodes
# NAME             STATUS   ROLES
# docker-desktop   Ready    ...
```

### 3. Krijo secret.yaml (nuk është në Git)

Krijo fajllin `k8s/secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: auth-secrets
  namespace: auth-service
type: Opaque
stringData:
  JWT_SECRET: supersecret
  INTERNAL_API_KEY: local-internal-key
  POSTGRES_PASSWORD: postgres
```

### 4. Build imazhin

```bash
docker --context default build -t 2af-auth-service:latest .
```

### 5. Deploy në Kubernetes

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/kafka.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

### 6. Kontrollo pods

```bash
kubectl get pods -n auth-service
# Prit derisa të gjithë të jenë Running
```

### 7. Testo me port-forward

```bash
kubectl port-forward service/auth-service 5000:5000 -n auth-service
curl http://localhost:5000/health
```

---

## Setup Jenkins CI/CD

### 1. Nis Jenkins

```bash
docker run -d \
  --name jenkins \
  --restart=on-failure \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts-jdk17
```

### 2. Merr passwordin fillestar

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### 3. Hap Jenkins

Shko te `http://localhost:8080` dhe:

- Vendos passwordin
- Instalo **Install suggested plugins**
- Krijo admin user

### 4. Instalo tools brenda Jenkins

```bash
# Docker CLI
docker exec -u root jenkins bash -c "apt-get update && apt-get install -y docker.io nodejs npm"

# Jep leje Docker socket
docker exec -u root jenkins bash -c "chmod 666 /var/run/docker.sock"

# kubectl
docker exec -u root jenkins bash -c "curl -LO https://dl.k8s.io/release/v1.29.0/bin/linux/amd64/kubectl && chmod +x kubectl && mv kubectl /usr/local/bin/"
```

### 5. Konfiguro kubeconfig

```bash
# Nis kubectl proxy (mbaje hapur gjatë build-eve)
kubectl proxy --port=8001 --address=0.0.0.0 --accept-hosts=.*

# Në terminal tjetër:
docker exec -u root jenkins mkdir -p /root/.kube
docker cp "$HOME/.kube/config" jenkins:/root/.kube/config

# Ndrysho URL për t'u aksesuar nga brenda Docker
docker exec -u root jenkins bash -c "sed -i 's/127.0.0.1/host.docker.internal/g' /root/.kube/config"
docker exec -u root jenkins bash -c "sed -i 's|https://host.docker.internal:[0-9]*/|http://host.docker.internal:8001/|g' /root/.kube/config"

# Kopjo te jenkins user
docker exec -u root jenkins bash -c "mkdir -p /var/jenkins_home/.kube && cp /root/.kube/config /var/jenkins_home/.kube/config && chown jenkins:jenkins /var/jenkins_home/.kube/config"

# Verifiko
docker exec jenkins kubectl get nodes
```

### 6. Kopjo secret.yaml në Jenkins workspace

```bash
docker cp k8s/secret.yaml jenkins:/var/jenkins_home/workspace/2AF-Pipeline/k8s/secret.yaml
```

### 7. Krijo Pipeline Job

- Jenkins → **New Item** → `2AF-Pipeline` → **Pipeline** → OK
- **Build Triggers** → ✅ GitHub hook trigger for GITScm polling
- **Pipeline** → Pipeline script from SCM → Git
  - URL: `https://github.com/getuar04/2AF.git`
  - Branch: `*/main`
  - Script Path: `Jenkinsfile`
- **Save**

### 8. Konfiguro GitHub Webhook (me ngrok)

```bash
ngrok http 8080
```

Shko te GitHub → repo → Settings → Webhooks → Add webhook:

- Payload URL: `https://YOUR-NGROK-URL/github-webhook/`
- Content type: `application/json`
- Trigger: Just the push event

---

## Workflow CI/CD

```
git push → GitHub Webhook → Jenkins Pipeline
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
                Checkout        npm test        Docker Build
                  Git                               │
                                                    ▼
                                            kubectl deploy
                                            (Kubernetes)
```

Çdo `git push` në `main`:

1. GitHub dërgon webhook te Jenkins
2. Jenkins klonon kodin
3. Instalo dependencies
4. Ekzekuto testet (4 teste)
5. Build Docker image me tag `build-N`
6. Deploy në Kubernetes me rolling update

---

## Testet

```bash
# Ekzekuto të gjitha testet
npm test

# Me coverage
npm run test:coverage
```

**Coverage aktuale:**

- Statements: 78.21%
- Functions: 84.84%
- Lines: 78.21%

---

## Shënime të Rëndësishme

- `k8s/secret.yaml` është në `.gitignore` — mos e commit-o kurrë
- `kubectl proxy` duhet të jetë duke punuar gjatë Jenkins build-eve
- Me Docker Desktop, NodePort nuk funksionon direkt — përdor `port-forward`
- `APP_RUNTIME_MODE=memory` kalon infra-n e plotë (për teste të shpejta)
