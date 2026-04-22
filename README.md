# 2AF — Authentication Service

## Si të startosh projektin në Kubernetes (Docker Desktop)

---

## ✅ Kërkesat paraprake

Sigurohu që ke të instaluar:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) me **Kubernetes të aktivizuar**
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Postman](https://www.postman.com/downloads/) (për testim)

### Aktivizo Kubernetes në Docker Desktop

1. Hap **Docker Desktop**
2. Shko te **Settings → Kubernetes**
3. Aktivizo **"Enable Kubernetes"**
4. Kliko **"Apply & Restart"**
5. Prit derisa ikona e Kubernetes të bëhet **jeshile** ✅

---

## 🚀 Hapat e nisjes

### Hapi 1 — Build image-in

Hap terminal në folderin e projektit dhe ekzekuto:

```powershell
cd C:\path\to\2AF
docker build -t 2af-auth-service:latest .
```

> ⚠️ Duhet ta build-osh çdo herë që ndryshon kodin!

---

### Hapi 2 — Apliko Kubernetes manifests

```powershell
kubectl apply -f k8s/
```

Kjo krijon:

- **Namespace** `auth-service`
- **Postgres** — database kryesore
- **Redis** — cache për 2FA tokens
- **MongoDB** — audit logs
- **Kafka + Zookeeper** — event bus
- **Auth Service** — aplikacioni ynë

---

### Hapi 3 — Krijo tabelën në Postgres

> Duhet vetëm herën e parë ose pas fshirjes së namespace-it

```powershell
kubectl exec -n auth-service deployment/postgres -- psql -U postgres -d 2af -c "CREATE TABLE IF NOT EXISTS users (id VARCHAR(36) PRIMARY KEY, full_name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, is_two_factor_enabled BOOLEAN DEFAULT false, two_factor_secret VARCHAR(255), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());"
```

---

### Hapi 4 — Kontrollo statusin e pods

```powershell
kubectl get pods -n auth-service
```

Prit derisa të gjitha pods të kenë statusin **Running**:

```
NAME                            READY   STATUS
auth-service-xxx                1/1     Running   ✅
kafka-xxx                       1/1     Running   ✅
mongodb-xxx                     1/1     Running   ✅
postgres-xxx                    1/1     Running   ✅
redis-xxx                       1/1     Running   ✅
zookeeper-xxx                   1/1     Running   ✅
```

> ⏳ Hera e parë mund të duhet 2-3 minuta

---

### Hapi 5 — Hap Port Forward

Hap një terminal të dedikuar dhe lëre **gjithmonë hapur**:

```powershell
kubectl port-forward service/auth-service 30500:5000 -n auth-service
```

> 🔴 Mos e mbyll këtë terminal — pa të, API nuk është i arritshëm!

---

## 🧪 Testimi me Postman

Base URL: `http://localhost:30500`

---

### GET `/health`

Kontrollo nëse aplikacioni punon.

```
GET http://localhost:30500/health
```

**Përgjigje e suksesshme:**

```json
{
  "status": "ok",
  "service": "authentication-service",
  "runtimeMode": "production"
}
```

---

### POST `/auth/register`

Regjistro një user të ri.

```
POST http://localhost:30500/auth/register
Content-Type: application/json
```

```json
{
  "fullName": "Test User",
  "email": "test@test.com",
  "password": "Test1234!"
}
```

**Përgjigje e suksesshme:**

```json
{
  "id": "uuid-këtu",
  "fullName": "Test User",
  "email": "test@test.com",
  "isTwoFactorEnabled": false
}
```

---

### POST `/auth/login`

Login me email dhe password.

```
POST http://localhost:30500/auth/login
Content-Type: application/json
```

```json
{
  "email": "test@test.com",
  "password": "Test1234!"
}
```

**Përgjigje (pa 2FA):**

```json
{
  "status": "SUCCESS",
  "token": "jwt-token-këtu"
}
```

**Përgjigje (me 2FA aktive):**

```json
{
  "status": "REQUIRE_2FA",
  "challengeToken": "token-këtu"
}
```

---

### POST `/auth/2fa/init`

Fillo konfigurimin e 2FA për një user.

```
POST http://localhost:30500/auth/2fa/init
Content-Type: application/json
```

```json
{
  "userId": "id-nga-register"
}
```

**Përgjigje:**

```json
{
  "qrCode": "data:image/png;base64,...",
  "pendingToken": "token-këtu"
}
```

> 📱 Skano QR Code me **Google Authenticator** ose **Authy**

---

### POST `/auth/2fa/confirm`

Konfirmo 2FA me kodin nga aplikacioni.

```
POST http://localhost:30500/auth/2fa/confirm
Content-Type: application/json
```

```json
{
  "pendingToken": "token-nga-init",
  "code": "123456"
}
```

---

### POST `/auth/login/2fa`

Login i dytë me kodin 2FA.

```
POST http://localhost:30500/auth/login/2fa
Content-Type: application/json
```

```json
{
  "challengeToken": "token-nga-login",
  "code": "123456"
}
```

**Përgjigje e suksesshme:**

```json
{
  "status": "SUCCESS",
  "token": "jwt-token-këtu"
}
```

---

## 🔍 Komanda të dobishme

```powershell
# Shiko të gjitha pods
kubectl get pods -n auth-service

# Shiko logjet live
kubectl logs -n auth-service deployment/auth-service --follow

# Shiko të dhënat në Postgres
kubectl exec -n auth-service deployment/postgres -- psql -U postgres -d 2af -c "SELECT * FROM users;"

# Shiko statusin e services
kubectl get services -n auth-service

# Describe pod nëse ka problem
kubectl describe pod -n auth-service
```

---

## 🧹 Fshi gjithçka (reset i plotë)

```powershell
kubectl delete namespace auth-service
```

Pastaj për të rifilluar nga zero:

```powershell
kubectl apply -f k8s/
```

---

## ⚠️ Probleme të zakonshme

| Problem                           | Zgjidhja                                                                  |
| --------------------------------- | ------------------------------------------------------------------------- |
| Pod në `ImagePullBackOff`         | Ri-build image-in: `docker build -t 2af-auth-service:latest .`            |
| `relation "users" does not exist` | Ekzekuto SQL-in e Hapi 3                                                  |
| Port-forward nuk funksionon       | Kontrollo nëse porta 30500 është e lirë: `netstat -ano \| findstr :30500` |
| Pods në `Pending`                 | Prit 2-3 minuta ose kontrollo: `kubectl describe pod -n auth-service`     |
| Të dhënat fshihen pas restart     | Apliko PersistentVolume në `k8s/postgres.yaml`                            |
