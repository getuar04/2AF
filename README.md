# Authentication Service TS

Backend with register, login and Google Authenticator 2FA.

## Runtime modes

- `APP_RUNTIME_MODE=memory` for local/dev/tests without external services.
- `APP_RUNTIME_MODE=production` to use PostgreSQL, Redis, MongoDB and Kafka.

## Main endpoints

- `POST /auth/register`
- `POST /auth/2fa/init`
- `POST /auth/2fa/confirm`
- `POST /auth/login`
- `POST /auth/login/2fa`
- `GET /health`

## PostgreSQL table

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_secret TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```
