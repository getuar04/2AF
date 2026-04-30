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
    await request(app).post("/auth/register").send({
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
    await request(app).post("/auth/register").send({
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

  it("logout invalidates token and clears cookie", async () => {
    await request(app).post("/auth/register").send({
      fullName: "Logout Test",
      email: "logouttest@example.com",
      password: "Password123",
    });

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: "logouttest@example.com", password: "Password123" })
      .expect(200);

    const accessToken = loginRes.body.accessToken as string;
    const setCookie = loginRes.headers["set-cookie"] as unknown as string[];
    const refreshCookie =
      setCookie.find((c: string) => c.startsWith("refreshToken=")) ?? "";

    const logoutRes = await request(app)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Cookie", refreshCookie)
      .expect(200);

    expect(logoutRes.body.message).toBeTruthy();

    // Token i logout-uar nuk duhet të funksionojë më
    await request(app)
      .post("/auth/2fa/init")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(401);
  });

  it("refresh token rotation: reusing an old refresh token should fail", async () => {
    await request(app).post("/auth/register").send({
      fullName: "Rotation Test",
      email: "rotation@example.com",
      password: "Password123",
    });

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: "rotation@example.com", password: "Password123" })
      .expect(200);

    const setCookie = loginRes.headers["set-cookie"] as unknown as string[];
    const oldRefreshCookie =
      setCookie.find((c: string) => c.startsWith("refreshToken=")) ?? "";

    // Perdor token-in e pare
    await request(app)
      .post("/auth/refresh")
      .set("Cookie", oldRefreshCookie)
      .expect(200);

    // Tentativë e dytë me token-in e vjetër duhet të dështojë
    const secondRes = await request(app)
      .post("/auth/refresh")
      .set("Cookie", oldRefreshCookie)
      .expect(401);

    expect(secondRes.body.error.code).toBe("REFRESH_TOKEN_REUSED");
  });

  it("disable 2FA requires valid password", async () => {
    const registerRes = await request(app)
      .post("/auth/register")
      .send({
        fullName: "Disable 2FA Test",
        email: "disable2fa@example.com",
        password: "Password123",
      })
      .expect(201);

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: "disable2fa@example.com", password: "Password123" })
      .expect(200);
    const accessToken = loginRes.body.accessToken as string;

    // Aktivizo 2FA
    const initRes = await request(app)
      .post("/auth/2fa/init")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ userId: registerRes.body.id })
      .expect(200);

    const { manualEntryKey, setupToken } = initRes.body as {
      manualEntryKey: string;
      setupToken: string;
    };

    const speakeasy = require("speakeasy");
    const code = speakeasy.totp({ secret: manualEntryKey, encoding: "base32" });

    await request(app)
      .post("/auth/2fa/confirm")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ userId: registerRes.body.id, code, setupToken })
      .expect(200);

    // Provo me fjalëkalim të gabuar
    await request(app)
      .post("/auth/2fa/disable")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ password: "WrongPassword!" })
      .expect(401);

    // Çaktivizo me fjalëkalim të saktë
    const disableRes = await request(app)
      .post("/auth/2fa/disable")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ password: "Password123" })
      .expect(200);

    expect(disableRes.body.isTwoFactorEnabled).toBe(false);
  });

  it("registers, enables 2FA, logs in and verifies 2FA with tokens", async () => {
    const registerRes = await request(app)
      .post("/auth/register")
      .send({
        fullName: "Getuar Test",
        email: "getuar2fa@example.com",
        password: "Password123",
      })
      .expect(201);

    const userId = registerRes.body.id as string;

    // Login per te marre accessToken per 2FA init
    const loginForToken = await request(app)
      .post("/auth/login")
      .send({ email: "getuar2fa@example.com", password: "Password123" })
      .expect(200);
    const accessToken = loginForToken.body.accessToken as string;

    const initRes = await request(app)
      .post("/auth/2fa/init")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ userId })
      .expect(200);

    const { manualEntryKey, setupToken } = initRes.body as {
      manualEntryKey: string;
      setupToken: string;
    };

    const firstCode = speakeasy.totp({
      secret: manualEntryKey,
      encoding: "base32",
    });
    await request(app)
      .post("/auth/2fa/confirm")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ userId, code: firstCode, setupToken })
      .expect(200);

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: "getuar2fa@example.com", password: "Password123" })
      .expect(202);

    expect(loginRes.body.status).toBe("REQUIRE_2FA");
    const { challengeId } = loginRes.body as { challengeId: string };

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
  it("logout-all invalidates all sessions", async () => {
    await request(app).post("/auth/register").send({
      fullName: "Logout All Test",
      email: "logoutall@example.com",
      password: "Password123",
    });

    // Login nga "pajisja 1"
    const login1 = await request(app)
      .post("/auth/login")
      .send({ email: "logoutall@example.com", password: "Password123" })
      .expect(200);

    const accessToken = login1.body.accessToken as string;
    const setCookie1 = login1.headers["set-cookie"] as unknown as string[];
    const refreshCookie1 =
      setCookie1.find((c: string) => c.startsWith("refreshToken=")) ?? "";

    // Login nga "pajisja 2"
    const login2 = await request(app)
      .post("/auth/login")
      .send({ email: "logoutall@example.com", password: "Password123" })
      .expect(200);

    const setCookie2 = login2.headers["set-cookie"] as unknown as string[];
    const refreshCookie2 =
      setCookie2.find((c: string) => c.startsWith("refreshToken=")) ?? "";

    // Logout nga të gjitha pajisjet
    const logoutAllRes = await request(app)
      .post("/auth/logout-all")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(logoutAllRes.body.message).toMatch(/all devices/i);

    // Pajisja 1 — refresh duhet të dështojë (SESSION_INVALIDATED)
    const refresh1 = await request(app)
      .post("/auth/refresh")
      .set("Cookie", refreshCookie1)
      .expect(401);

    expect(refresh1.body.error.code).toBe("SESSION_INVALIDATED");

    // Pajisja 2 — refresh duhet të dështojë gjithashtu
    const refresh2 = await request(app)
      .post("/auth/refresh")
      .set("Cookie", refreshCookie2)
      .expect(401);

    expect(refresh2.body.error.code).toBe("SESSION_INVALIDATED");
  });

  it("logout-all requires authentication", async () => {
    await request(app).post("/auth/logout-all").expect(401);
  });
});
