import request from "supertest";
import speakeasy from "speakeasy";
import { createApp } from "../../src/app";

describe("Auth routes", () => {
  const app = createApp();

  it("registers a user and returns role=user", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        fullName: "Normal User",
        email: "user@example.com",
        password: "Password123",
      })
      .expect(201);
    expect(res.body.role).toBe("user");
    expect(res.body.isTwoFactorEnabled).toBe(false);
  });

  it("registers an admin email and returns role=admin", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        fullName: "Admin User",
        email: "admin@test.com",
        password: "Password123",
      })
      .expect(201);
    expect(res.body.role).toBe("admin");
  });

  it("login returns accessToken and sets refreshToken cookie", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        fullName: "Login Test",
        email: "logintest@example.com",
        password: "Password123",
      });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "logintest@example.com", password: "Password123" })
      .expect(200);
    expect(res.body.status).toBe("SUCCESS");
    expect(res.body.accessToken).toBeTruthy();
    const setCookie = res.headers["set-cookie"] as unknown as string[];
    expect(setCookie).toBeDefined();
    expect(setCookie[0]).toContain("refreshToken");
  });

  it("refresh token returns new accessToken", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        fullName: "Refresh Test",
        email: "refreshtest@example.com",
        password: "Password123",
      });
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: "refreshtest@example.com", password: "Password123" })
      .expect(200);
    const setCookie = loginRes.headers["set-cookie"] as unknown as string[];
    const refreshCookie =
      setCookie.find((c: string) => c.startsWith("refreshToken=")) ?? "";
    const refreshRes = await request(app)
      .post("/auth/refresh")
      .set("Cookie", refreshCookie)
      .expect(200);
    expect(refreshRes.body.accessToken).toBeTruthy();
  });

  it("registers, enables 2FA, logs in and verifies 2FA with tokens", async () => {
    // 1. Register
    const registerRes = await request(app)
      .post("/auth/register")
      .send({
        fullName: "Getuar Test",
        email: "getuar2fa@example.com",
        password: "Password123",
      })
      .expect(201);

    // 2. Login për të marrë accessToken
    const loginForToken = await request(app)
      .post("/auth/login")
      .send({ email: "getuar2fa@example.com", password: "Password123" })
      .expect(200);
    const accessToken = loginForToken.body.accessToken as string;

    // 3. Init 2FA me Bearer token
    const initRes = await request(app)
      .post("/auth/2fa/init")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    const { manualEntryKey, setupToken } = initRes.body as {
      manualEntryKey: string;
      setupToken: string;
    };

    // 4. Konfirmo 2FA me Bearer token
    const firstCode = speakeasy.totp({
      secret: manualEntryKey,
      encoding: "base32",
    });
    await request(app)
      .post("/auth/2fa/confirm")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ code: firstCode, setupToken })
      .expect(200);

    // 5. Login tani kërkon 2FA
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: "getuar2fa@example.com", password: "Password123" })
      .expect(202);
    expect(loginRes.body.status).toBe("REQUIRE_2FA");
    const { challengeId } = loginRes.body as { challengeId: string };

    // 6. Verifiko kodin 2FA
    const secondCode = speakeasy.totp({
      secret: manualEntryKey,
      encoding: "base32",
    });
    const verifyRes = await request(app)
      .post("/auth/login/2fa")
      .send({ email: "getuar2fa@example.com", challengeId, code: secondCode })
      .expect(200);
    expect(verifyRes.body.accessToken).toBeTruthy();
    const verifyCookies = verifyRes.headers[
      "set-cookie"
    ] as unknown as string[];
    expect(verifyCookies).toBeDefined();
    expect(verifyCookies[0]).toContain("refreshToken");
  });
});
