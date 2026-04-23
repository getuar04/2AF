# 2AF — Authentication Service
## Dokumentacion i Plotë — Setup, Testim dhe CI/CD

---

## ✅ Kërkesat paraprake

Sigurohu që ke të instaluar:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) me **Kubernetes të aktivizuar**
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Postman](https://www.postman.com/downloads/) për testim
- [Google Authenticator](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2) për 2FA

### Aktivizo Kubernetes në Docker Desktop
1. Hap **Docker Desktop**
2. Shko te **Settings → Kubernetes**
3. Aktivizo **"Enable Kubernetes"**
4. Kliko **"Apply & Restart"**
5. Prit derisa ikona e Kubernetes të bëhet **jeshile** ✅

---

## 🚀 Hapat e nisjes (Herën e Parë)

### Hapi 1 — Build image-in
```powershell
cd C:\path\to\2AF
docker build -t 2af-auth-service:latest .
```
> ⚠️ Duhet ta ri-build-osh çdo herë që ndryshon kodin!

---

### Hapi 2 — Apliko Secrets (vetëm herën e parë)
```powershell
kubectl apply -f k8s/secret.yaml
```
> ⚠️ `secret.yaml` nuk është në GitHub — duhet aplikuar manualisht çdo herë që fshi namespace-in!

---

### Hapi 3 — Apliko të gjitha Kubernetes manifests
```powershell
kubectl apply -f k8s/
```
Kjo krijon:
- **Namespace** `auth-service`
- **Postgres** — database kryesore për users
- **Redis** — cache për 2FA tokens dhe login challenges
- **MongoDB** — audit logs
- **Kafka + Zookeeper** — event bus për events
- **Auth Service** — aplikacioni kryesor

---

### Hapi 4 — Krijo tabelën users në Postgres
> Duhet vetëm herën e parë ose pas fshirjes së namespace-it

```powershell
kubectl exec -n auth-service deployment/postgres -- psql -U postgres -d 2af -c "CREATE TABLE IF NOT EXISTS users (id VARCHAR(36) PRIMARY KEY, full_name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) NOT NULL DEFAULT 'user', is_two_factor_enabled BOOLEAN DEFAULT false, two_factor_secret VARCHAR(255), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());"
```

Nëse tabela ekzistonte pa kolonën `role`, shto atë:
```powershell
kubectl exec -n auth-service deployment/postgres -- psql -U postgres -d 2af -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';"
```

---

### Hapi 5 — Kontrollo statusin e pods
```powershell
kubectl get pods -n auth-service -w
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

### Hapi 6 — Hap Port Forward
Hap një terminal të dedikuar dhe lëre **gjithmonë hapur**:
```powershell
kubectl port-forward service/auth-service 30500:5000 -n auth-service
```
> 🔴 Mos e mbyll këtë terminal — pa të, API nuk është i arritshëm!

---

## 🔧 Konfigurimi i Admin Email

Admin-i identifikohet nëpërmjet email-it në ConfigMap. Ndrysho emailin tënd:
```powershell
kubectl edit configmap auth-config -n auth-service
```
Gjej rreshtin `ADMIN_EMAILS` dhe vendos emailin tënd:
```yaml
ADMIN_EMAILS: "emaili_yt@test.com"
```
Pastaj restart:
```powershell
kubectl rollout restart deployment/auth-service -n auth-service
```

---

## 🧪 Testimi i plotë me Postman

**Base URL:** `http://localhost:30500`

Për endpoints të admin duhet të shtosh header:
```
Authorization: Bearer ACCESS_TOKEN
```

---

### 1. GET `/health`
Kontrollo nëse aplikacioni punon — nuk kërkon token.

**Request:**
```
GET http://localhost:30500/health
```

**Përgjigje e suksesshme:**
```json
{
  "status": "ok",
  "service": "authentication-service",
  "environment": "development",
  "runtimeMode": "production",
  "kafkaEnabled": true
}
```

---

### 2. POST `/auth/register`
Regjistro user të ri. Nëse email është në `ADMIN_EMAILS`, roli është `admin`, përndryshe `user`.

**Request:**
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

**Përgjigje e suksesshme `201`:**
```json
{
  "id": "uuid-këtu",
  "fullName": "Test User",
  "email": "test@test.com",
  "role": "user",
  "isTwoFactorEnabled": false
}
```

**Përgjigje gabim `409`:**
```json
{
  "error": {
    "message": "Email already exists",
    "code": "EMAIL_ALREADY_EXISTS"
  }
}
```

> 💡 Për të regjistruar admin, përdor emailin që është te `ADMIN_EMAILS` në ConfigMap.

---

### 3. POST `/auth/login`
Login me email dhe password.

**Request:**
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

**Përgjigje pa 2FA `200`:**
```json
{
  "status": "SUCCESS",
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Përgjigje me 2FA aktive `202`:**
```json
{
  "status": "REQUIRE_2FA",
  "challengeId": "uuid-këtu",
  "userId": "uuid-këtu",
  "email": "test@test.com",
  "message": "Two-factor authentication is required"
}
```
> 💡 Ruaj `accessToken`, `refreshToken` dhe `challengeId` — do t'i duhen për hapat tjerë.

---

### 4. POST `/auth/refresh`
Merr `accessToken` të ri duke përdorur `refreshToken`. Përdoret kur `accessToken` skadon (pas 15 min).

**Request:**
```
POST http://localhost:30500/auth/refresh
Content-Type: application/json
```
```json
{
  "refreshToken": "eyJ..."
}
```

**Përgjigje e suksesshme `200`:**
```json
{
  "accessToken": "eyJ..."
}
```

**Përgjigje gabim `401`:**
```json
{
  "error": {
    "message": "Invalid or expired refresh token",
    "code": "INVALID_REFRESH_TOKEN"
  }
}
```

---

### 5. POST `/auth/2fa/init`
Fillo konfigurimin e 2FA. Kthen QR code për Google Authenticator.

**Request:**
```
POST http://localhost:30500/auth/2fa/init
Content-Type: application/json
```
```json
{
  "userId": "id-nga-register"
}
```

**Përgjigje e suksesshme `200`:**
```json
{
  "qrCodeDataUrl": "data:image/png;base64,...",
  "manualEntryKey": "BASE32SECRET",
  "setupToken": "uuid-këtu"
}
```
> 📱 Skano `qrCodeDataUrl` me **Google Authenticator** ose shkruaj `manualEntryKey` manualisht. Ruaj `setupToken` për hapin tjetër.

---

### 6. POST `/auth/2fa/confirm`
Konfirmo 2FA me kodin 6-shifror nga Google Authenticator.

**Request:**
```
POST http://localhost:30500/auth/2fa/confirm
Content-Type: application/json
```
```json
{
  "userId": "id-nga-register",
  "setupToken": "token-nga-init",
  "code": "123456"
}
```

**Përgjigje e suksesshme `200`:**
```json
{
  "message": "Two-factor authentication enabled successfully",
  "isTwoFactorEnabled": true
}
```

**Përgjigje gabim `400` — sesioni skadoi:**
```json
{
  "error": {
    "message": "2FA setup session expired or not found",
    "code": "SETUP_SESSION_EXPIRED"
  }
}
```

**Përgjigje gabim `401` — kodi gabim:**
```json
{
  "error": {
    "message": "Invalid 2FA code",
    "code": "INVALID_2FA_CODE"
  }
}
```

---

### 7. POST `/auth/login/2fa`
Verifiko login me kod 2FA pasi login ktheu `REQUIRE_2FA`.

**Request:**
```
POST http://localhost:30500/auth/login/2fa
Content-Type: application/json
```
```json
{
  "email": "test@test.com",
  "challengeId": "challenge-id-nga-login",
  "code": "123456"
}
```

**Përgjigje e suksesshme `200`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Përgjigje gabim `400` — challenge skadoi:**
```json
{
  "error": {
    "message": "Login challenge expired or not found",
    "code": "LOGIN_CHALLENGE_EXPIRED"
  }
}
```

---

### 8. GET `/admin/audit-logs`
Merr të gjitha audit logs me pagination dhe filter. **Kërkon token admin.**

**Request:**
```
GET http://localhost:30500/admin/audit-logs
Authorization: Bearer ACCESS_TOKEN_ADMIN
```

**Me filter dhe pagination:**
```
GET http://localhost:30500/admin/audit-logs?action=LOGIN&status=SUCCESS&page=1&limit=10
GET http://localhost:30500/admin/audit-logs?email=user@test.com
GET http://localhost:30500/admin/audit-logs?fromDate=2026-01-01&toDate=2026-12-31
```

**Parametrat e mundshëm:**

| Parametër | Tipi | Përshkrim |
|-----------|------|-----------|
| `page` | number | Faqja (default: 1) |
| `limit` | number | Numri i rezultateve (default: 20) |
| `email` | string | Filter sipas email |
| `action` | string | LOGIN, REGISTER, VERIFY_LOGIN_2FA, etj. |
| `status` | string | SUCCESS, FAILED, INFO |
| `fromDate` | date | Data fillestare |
| `toDate` | date | Data përfundimtare |

**Përgjigje e suksesshme `200`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "email": "admin@test.ts",
      "action": "LOGIN",
      "status": "SUCCESS",
      "metadata": { "viaTwoFactor": false, "role": "admin" },
      "createdAt": "2026-04-22T11:17:16.598Z"
    }
  ],
  "total": 23,
  "page": 1,
  "limit": 20
}
```

**Përgjigje gabim `401`:**
```json
{
  "error": {
    "message": "Missing or invalid authorization header",
    "code": "UNAUTHORIZED"
  }
}
```

**Përgjigje gabim `403`:**
```json
{
  "error": {
    "message": "Admin access required",
    "code": "FORBIDDEN"
  }
}
```

---

### 9. GET `/admin/debug/redis/health`
Kontrollo nëse Redis është i lidhur. **Kërkon token admin.**

**Request:**
```
GET http://localhost:30500/admin/debug/redis/health
Authorization: Bearer ACCESS_TOKEN_ADMIN
```

**Përgjigje e suksesshme `200`:**
```json
{
  "status": "ok",
  "connected": true
}
```

---

### 10. GET `/admin/debug/login-challenge/:id`
Kontrollo nëse një login challenge ekziston në Redis dhe sa kohë ka mbetur (TTL). **Kërkon token admin.**

**Si ta përdorësh:**
1. Bëj login me user që ka 2FA aktive
2. Merr `challengeId` nga përgjigja
3. Menjëherë testo endpoint-in (challenge skadon pas 300 sekonda)

**Request:**
```
GET http://localhost:30500/admin/debug/login-challenge/CHALLENGE_ID
Authorization: Bearer ACCESS_TOKEN_ADMIN
```

**Përgjigje kur ekziston `200`:**
```json
{
  "type": "LOGIN_CHALLENGE",
  "key": "2fa:login:uuid-këtu",
  "exists": true,
  "ttlSeconds": 286
}
```

**Përgjigje kur nuk ekziston ose skadoi `200`:**
```json
{
  "type": "LOGIN_CHALLENGE",
  "key": "2fa:login:uuid-këtu",
  "exists": false,
  "ttlSeconds": null
}
```

---

### 11. GET `/admin/debug/2fa-setup/:userId/:token`
Kontrollo nëse një 2FA setup session ekziston në Redis dhe sa kohë ka mbetur. **Kërkon token admin.**

**Si ta përdorësh:**
1. Bëj `POST /auth/2fa/init` për të marrë `setupToken` dhe `userId`
2. Menjëherë testo endpoint-in (session skadon pas 300 sekonda)

**Request:**
```
GET http://localhost:30500/admin/debug/2fa-setup/USER_ID/SETUP_TOKEN
Authorization: Bearer ACCESS_TOKEN_ADMIN
```

**Përgjigje kur ekziston `200`:**
```json
{
  "type": "TWO_FACTOR_SETUP",
  "key": "2fa:setup:userId:setupToken",
  "exists": true,
  "ttlSeconds": 185
}
```

---

## 📋 Rendi i rekomanduar i testimit në Postman

```
1.  GET  /health                          → Verifiko që app punon
2.  POST /auth/register                   → Regjistro user normal
3.  POST /auth/register (admin email)     → Regjistro admin
4.  POST /auth/login                      → Login, ruaj tokens
5.  POST /auth/refresh                    → Testo refresh token
6.  POST /auth/2fa/init                   → Fillo 2FA setup
7.  POST /auth/2fa/confirm                → Konfirmo me Google Authenticator
8.  POST /auth/login                      → Login → kthen REQUIRE_2FA
9.  POST /auth/login/2fa                  → Verifiko me kod
10. GET  /admin/audit-logs                → Shiko të gjitha events
11. GET  /admin/debug/redis/health        → Kontrollo Redis
12. GET  /admin/debug/login-challenge/:id → Testo menjëherë pas login
13. GET  /admin/debug/2fa-setup/:u/:t     → Testo menjëherë pas 2fa/init
```

---

## 🔍 Komanda të dobishme

```powershell
# Shiko të gjitha pods
kubectl get pods -n auth-service

# Shiko logjet live
kubectl logs -n auth-service deployment/auth-service --follow

# Shiko logjet e fundit (PowerShell)
kubectl logs -n auth-service deployment/auth-service | Select-Object -Last 20

# Shiko të dhënat në Postgres
kubectl exec -n auth-service deployment/postgres -- psql -U postgres -d 2af -c "SELECT id, email, role, is_two_factor_enabled FROM users;"

# Fshi një user nga Postgres
kubectl exec -n auth-service deployment/postgres -- psql -U postgres -d 2af -c "DELETE FROM users WHERE email = 'test@test.com';"

# Shiko statusin e services
kubectl get services -n auth-service

# Shiko env variables të pod-it
kubectl exec -n auth-service deployment/auth-service -- env | findstr JWT
kubectl exec -n auth-service deployment/auth-service -- env | findstr ADMIN

# Describe pod nëse ka problem
kubectl describe pod -n auth-service

# Kontrollo SHA-n e image-it aktual
kubectl get pod -n auth-service -l app=auth-service -o jsonpath="{.items[0].status.containerStatuses[0].imageID}"

# Testo endpoint direkt brenda pod-it
kubectl exec -n auth-service deployment/auth-service -- wget -qO- http://localhost:5000/health
```

---

## 🧹 Fshi gjithçka (reset i plotë)

```powershell
kubectl delete namespace auth-service
```

Pastaj për të rifilluar nga zero:
```powershell
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/
```
Dhe ri-krijo tabelën (Hapi 4 nga setup).

---

## 🔁 CI/CD me Jenkins

Pipeline ekzekutohet automatikisht çdo herë që bën **push në GitHub**.

### Setup i njëhershëm (vetëm herën e parë)

**1 — Nis Jenkins kontejnerin:**
```powershell
docker run -d --name jenkins --restart=on-failure -p 8080:8080 -p 50000:50000 -v jenkins_home:/var/jenkins_home -v /var/run/docker.sock:/var/run/docker.sock -u root jenkins/jenkins:lts-jdk17
```

**2 — Instalo Docker CLI dhe Node.js brenda Jenkins:**
```powershell
docker exec -u root jenkins bash -c "apt-get update && apt-get install -y docker.io"
docker exec -u root jenkins bash -c "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs"
```

**3 — Instalo kubectl brenda Jenkins:**
```powershell
docker exec -u root jenkins bash -c "curl -LO https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl && chmod +x kubectl && mv kubectl /usr/local/bin/kubectl"
```

**4 — Kopjo kubeconfig dhe konfiguro:**
```powershell
docker exec -u root jenkins mkdir -p /root/.kube
docker cp "$env:USERPROFILE\.kube\config" jenkins:/root/.kube/config
docker exec -u root jenkins sed -i 's/127.0.0.1/host.docker.internal/g' /root/.kube/config
docker exec -u root jenkins bash -c "kubectl config set-cluster docker-desktop --insecure-skip-tls-verify=true"
```

**5 — Verifiko që Jenkins sheh Kubernetes:**
```powershell
docker exec -u root jenkins kubectl get nodes
```
Duhet të shohësh `desktop-control-plane Ready`.

**6 — Apliko secrets në Kubernetes:**
```powershell
kubectl apply -f k8s/secret.yaml
```

**7 — Konfiguro pipeline në Jenkins UI:**
1. Shko te `http://localhost:8080`
2. Krijo **New Item → Pipeline**
3. Te **Pipeline → Definition** zgjidh `Pipeline script from SCM`
4. **SCM:** Git
5. **Repository URL:** `https://github.com/getuar04/2AF.git`
6. **Branch:** `*/main`
7. **Script Path:** `Jenkinsfile`
8. Kliko **Save**

---

### Si funksionon pipeline-i automatik

Çdo `git push origin main` trigger-on:
```
✅ Checkout      — merr kodin nga GitHub
✅ npm install   — instalo dependencies
✅ npm test      — 21 teste (4 suites)
✅ docker pull   — pre-pull base image
✅ docker build  — build image me tag build-N
✅ kubectl apply — deploy në Kubernetes
✅ rollout       — prit derisa deployment të përfundojë
```

### Trigger manual
```
http://localhost:8080 → 2AF-Pipeline → Build Now
```

---

## ⚠️ Probleme të zakonshme dhe zgjidhjet

| Problem | Kur ndodh | Zgjidhja |
|---------|-----------|----------|
| `ImagePullBackOff` | Pod nuk gjen image | `docker build -t 2af-auth-service:latest .` pastaj `kubectl rollout restart deployment/auth-service -n auth-service` |
| `relation "users" does not exist` | Tabela nuk ekziston | Ekzekuto SQL-in e Hapi 4 |
| `role column missing` | Tabela e vjetër pa role | `kubectl exec -n auth-service deployment/postgres -- psql -U postgres -d 2af -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';"` |
| Port-forward nuk funksionon | Porta e zënë | `netstat -ano \| findstr :30500` pastaj `taskkill /PID XXXX /F` |
| Pod `Pending` | Resources ose secrets | `kubectl describe pod -n auth-service` — shiko Events |
| `couldn't find key JWT_SECRET` | Deployment i vjetër | `kubectl delete deployment auth-service -n auth-service` pastaj `kubectl apply -f k8s/deployment.yaml` |
| Kubernetes po përdor image të vjetër | Cache i Docker | `kubectl delete deployment auth-service -n auth-service` pastaj `kubectl apply -f k8s/deployment.yaml` |
| `Cannot GET /admin/...` | `index.ts` pa admin routes | Verifiko që `index.ts` ka `import adminRoutes` dhe `app.use("/admin", adminRoutes)` |
| `403 Forbidden` te admin endpoints | Token i user normal | Login me emailin e admin dhe përdor atë `accessToken` |
| `exists: false` te debug endpoints | Challenge/setup skadoi | Duhet testuar brenda 300 sekondave |
| Jenkins `permission denied docker.sock` | Socket nuk është montuar | Sigurohu që ke `-v /var/run/docker.sock:/var/run/docker.sock` |
| Jenkins `npm not found` | Node.js nuk është instaluar | Ekzekuto Hapin 2 të CI/CD setup |
| Jenkins `kubectl connection refused` | kubeconfig me IP të gabuar | Ri-ekzekuto Hapin 4 të CI/CD setup |
| Jenkins `fatal: not in a git directory` | Workspace i korruptuar | `docker exec -u root jenkins rm -rf /var/jenkins_home/workspace/2AF-Pipeline` |
| Jenkins rollout timeout | `imagePullPolicy: Always` + image lokal | Ndrysho në `imagePullPolicy: IfNotPresent` në `k8s/deployment.yaml` |
| Të dhënat fshihen pas restart | `emptyDir` në Postgres | Shto PersistentVolumeClaim në `k8s/postgres.yaml` |tea