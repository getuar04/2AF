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

## 🔁 CI/CD me Jenkins

Pipeline automatikisht ekzekutohet çdo herë që bën **push në GitHub**.

### Hapat e njëhershëm (vetëm herën e parë)

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

**4 — Kopjo kubeconfig brenda Jenkins:**

```powershell
docker exec -u root jenkins mkdir -p /root/.kube
docker cp "$env:USERPROFILE\.kube\config" jenkins:/root/.kube/config
docker exec -u root jenkins sed -i 's/127.0.0.1/host.docker.internal/g' /root/.kube/config
docker exec -u root jenkins bash -c "kubectl config set-cluster docker-desktop --insecure-skip-tls-verify=true"
```

**5 — Apliko secrets në Kubernetes (vetëm herën e parë):**

```powershell
kubectl apply -f k8s/secret.yaml
```

> ⚠️ `secret.yaml` nuk është në GitHub — duhet aplikuar manualisht!

**6 — Konfiguro pipeline në Jenkins UI:**

1. Shko te `http://localhost:8080`
2. Krijo **New Item → Pipeline**
3. Te **Pipeline → Definition** zgjidh `Pipeline script from SCM`
4. **SCM:** Git
5. **Repository URL:** `https://github.com/getuar04/2AF.git`
6. **Branch:** `*/main`
7. **Script Path:** `Jenkinsfile`
8. Kliko **Save**

---

### Si funksionon pipeline-i

Çdo herë që bën `git push origin main`, Jenkins automatikisht:

```
✅ Checkout      — merr kodin nga GitHub
✅ npm install   — instalo dependencies
✅ npm test      — ekzekuto të gjitha testet
✅ docker pull   — pre-pull base image
✅ docker build  — build image të re me tag build-N
✅ kubectl apply — deploy në Kubernetes
✅ rollout       — prit derisa deployment të përfundojë
```

---

### Trigger manual

Nëse dëshiron ta ekzekutosh pa push:

1. Shko te `http://localhost:8080`
2. Kliko pipeline **2AF-Pipeline**
3. Kliko **Build Now**

---

### Shiko rezultatin

```powershell
# Shiko nëse Jenkins po punon
docker ps | findstr jenkins

# Shiko logjet e Jenkins
docker logs jenkins --tail 50
```

Ose shko te `http://localhost:8080` → **2AF-Pipeline** → **Console Output**

---

## ⚠️ Probleme të zakonshme

| Problem                                  | Zgjidhja                                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| Pod në `ImagePullBackOff`                | Ri-build image-in: `docker build -t 2af-auth-service:latest .`                                |
| `relation "users" does not exist`        | Ekzekuto SQL-in e Hapi 3                                                                      |
| Port-forward nuk funksionon              | Kontrollo nëse porta 30500 është e lirë: `netstat -ano \| findstr :30500`                     |
| Pods në `Pending`                        | Prit 2-3 minuta ose kontrollo: `kubectl describe pod -n auth-service`                         |
| Të dhënat fshihen pas restart            | Apliko PersistentVolume në `k8s/postgres.yaml`                                                |
| Jenkins: `permission denied docker.sock` | Sigurohu që ke `-v /var/run/docker.sock:/var/run/docker.sock` në docker run                   |
| Jenkins: `npm not found`                 | Ekzekuto Hapin 2 të seksionit CI/CD për të instaluar Node.js                                  |
| Jenkins: `kubectl connection refused`    | Ri-ekzekuto Hapin 4 të seksionit CI/CD për kubeconfig                                         |
| Jenkins: `secret.yaml does not exist`    | Ekzekuto `kubectl apply -f k8s/secret.yaml` manualisht                                        |
| Jenkins: `fatal: not in a git directory` | Fshi workspace: `docker exec -u root jenkins rm -rf /var/jenkins_home/workspace/2AF-Pipeline` |
2