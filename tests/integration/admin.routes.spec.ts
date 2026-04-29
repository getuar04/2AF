import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../src/app";
import { env } from "../../src/infra/config/env";
import { authAuditRepository, cacheProvider } from "../../src/di";

function signToken(payload: {
  userId: string;
  email: string;
  role: "admin" | "user";
}) {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: "1h" });
}

describe("Admin routes", () => {
  const app = createApp();

  const adminToken = signToken({
    userId: "admin-user-id",
    email: "admin@example.com",
    role: "admin",
  });

  const userToken = signToken({
    userId: "normal-user-id",
    email: "user@example.com",
    role: "user",
  });

  beforeEach(async () => {
    if (
      "logs" in authAuditRepository &&
      Array.isArray((authAuditRepository as any).logs)
    ) {
      (authAuditRepository as any).logs.length = 0;
    }

    if (
      "store" in cacheProvider &&
      (cacheProvider as any).store instanceof Map
    ) {
      (cacheProvider as any).store.clear();
    }

    if (typeof authAuditRepository.create === "function") {
      await authAuditRepository.create({
        id: "log-1",
        userId: "u1",
        email: "admin@example.com",
        action: "LOGIN",
        status: "SUCCESS",
        reason: "Login successful",
        metadata: { viaTwoFactor: false },
        createdAt: new Date("2026-04-22T10:00:00.000Z"),
      });

      await authAuditRepository.create({
        id: "log-2",
        userId: "u2",
        email: "user@example.com",
        action: "REGISTER",
        status: "SUCCESS",
        reason: "User registered",
        metadata: {},
        createdAt: new Date("2026-04-22T11:00:00.000Z"),
      });
    }
  });

  describe("GET /admin/audit-logs", () => {
    it("should return 401 when authorization header is missing", async () => {
      const response = await request(app).get("/admin/audit-logs");
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: {
          message: "Missing or invalid authorization header",
          code: "UNAUTHORIZED",
        },
      });
    });

    it("should return 403 when authenticated user is not admin", async () => {
      const response = await request(app)
        .get("/admin/audit-logs")
        .set("Authorization", `Bearer ${userToken}`);
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: {
          message: "Admin access required",
          code: "FORBIDDEN",
        },
      });
    });

    it("should return audit logs for admin", async () => {
      const response = await request(app)
        .get("/admin/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items).toHaveLength(2);
    });

    it("should filter audit logs by email", async () => {
      const response = await request(app)
        .get("/admin/audit-logs?email=admin@example.com")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.items[0].email).toBe("admin@example.com");
      expect(response.body.items[0].action).toBe("LOGIN");
    });

    it("should filter audit logs by action", async () => {
      const response = await request(app)
        .get("/admin/audit-logs?action=REGISTER")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.items[0].action).toBe("REGISTER");
    });

    it("should paginate audit logs", async () => {
      const response = await request(app)
        .get("/admin/audit-logs?page=1&limit=1")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(1);
      expect(response.body.items).toHaveLength(1);
    });
  });

  describe("GET /admin/debug/redis/health", () => {
    it("should return 403 for non-admin user", async () => {
      const response = await request(app)
        .get("/admin/debug/redis/health")
        .set("Authorization", `Bearer ${userToken}`);
      expect(response.status).toBe(403);
    });

    it("should return redis health for admin", async () => {
      const response = await request(app)
        .get("/admin/debug/redis/health")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("x-internal-api-key", env.app.internalApiKey);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
    });
  });

  describe("GET /admin/debug/login-challenge/:challengeId", () => {
    it("should return exists=false when challenge is missing", async () => {
      const response = await request(app)
        .get("/admin/debug/login-challenge/missing-challenge")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("x-internal-api-key", env.app.internalApiKey); // shto këtë
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        type: "LOGIN_CHALLENGE",
        key: "2fa:login:missing-challenge",
        exists: false,
        ttlSeconds: null,
      });
    });

    it("should return exists=true when challenge exists", async () => {
      await cacheProvider.set(
        "2fa:login:test-challenge",
        JSON.stringify({
          challengeId: "test-challenge",
          userId: "u1",
          email: "admin@example.com",
          createdAt: new Date().toISOString(),
        }),
        { ttlSeconds: 300 },
      );
      const response = await request(app)
        .get("/admin/debug/login-challenge/test-challenge")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("x-internal-api-key", env.app.internalApiKey); // shto këtë
      expect(response.status).toBe(200);
      expect(response.body.type).toBe("LOGIN_CHALLENGE");
      expect(response.body.key).toBe("2fa:login:test-challenge");
      expect(response.body.exists).toBe(true);
      expect(
        typeof response.body.ttlSeconds === "number" ||
          response.body.ttlSeconds === null,
      ).toBe(true);
    });
  });

  describe("GET /admin/debug/2fa-setup/:userId/:setupToken", () => {
    it("should return exists=false when setup token is missing", async () => {
      const response = await request(app)
        .get("/admin/debug/2fa-setup/u1/token123")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("x-internal-api-key", env.app.internalApiKey); // shto këtë
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        type: "TWO_FACTOR_SETUP",
        key: "2fa:setup:u1:token123",
        exists: false,
        ttlSeconds: null,
      });
    });

    it("should return exists=true when setup token exists", async () => {
      await cacheProvider.set(
        "2fa:setup:u1:token123",
        JSON.stringify({
          userId: "u1",
          secret: "SECRET",
          setupToken: "token123",
        }),
        { ttlSeconds: 300 },
      );
      const response = await request(app)
        .get("/admin/debug/2fa-setup/u1/token123")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("x-internal-api-key", env.app.internalApiKey); // shto këtë
      expect(response.status).toBe(200);
      expect(response.body.type).toBe("TWO_FACTOR_SETUP");
      expect(response.body.key).toBe("2fa:setup:u1:token123");
      expect(response.body.exists).toBe(true);
      expect(
        typeof response.body.ttlSeconds === "number" ||
          response.body.ttlSeconds === null,
      ).toBe(true);
    });
  });
});
