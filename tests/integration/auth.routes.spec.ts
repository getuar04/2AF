import request from "supertest";
import speakeasy from "speakeasy";
import { createApp } from "../../src/app";

describe("Auth routes", () => {
  const app = createApp();

  it("registers, enables 2fa, logs in and verifies 2fa", async () => {
    const registerResponse = await request(app)
      .post("/auth/register")
      .send({ fullName: "Getuar Test", email: "getuar@example.com", password: "Password123" })
      .expect(201);

    const userId = registerResponse.body.id as string;
    expect(userId).toBeTruthy();

    const initResponse = await request(app)
      .post("/auth/2fa/init")
      .send({ userId })
      .expect(200);

    expect(initResponse.body.qrCodeDataUrl).toContain("data:image/png;base64");
    const manualEntryKey = initResponse.body.manualEntryKey as string;
    const setupToken = initResponse.body.setupToken as string;

    const firstCode = speakeasy.totp({ secret: manualEntryKey, encoding: "base32" });

    await request(app)
      .post("/auth/2fa/confirm")
      .send({ userId, code: firstCode, setupToken })
      .expect(200);

    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ email: "getuar@example.com", password: "Password123" })
      .expect(202);

    expect(loginResponse.body.status).toBe("REQUIRE_2FA");
    const challengeId = loginResponse.body.challengeId as string;

    const secondCode = speakeasy.totp({ secret: manualEntryKey, encoding: "base32" });

    const verifyResponse = await request(app)
      .post("/auth/login/2fa")
      .send({ email: "getuar@example.com", challengeId, code: secondCode })
      .expect(200);

    expect(verifyResponse.body.accessToken).toBeTruthy();
  });
});
