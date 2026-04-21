import speakeasy from "speakeasy";
import { GenerateSecretInput, TwoFactorProvider, TwoFactorSecret } from "../../app/ports/twoFactorProvider";

export class SpeakeasyTwoFactorProvider implements TwoFactorProvider {
  generateSecret(input: GenerateSecretInput): TwoFactorSecret {
    const secret = speakeasy.generateSecret({ issuer: input.issuer, name: input.label, length: 20 });
    if (!secret.otpauth_url) {
      throw new Error("Failed to generate otpauth URL");
    }
    return { base32: secret.base32, otpauthUrl: secret.otpauth_url };
  }

  verifyCode(secret: string, code: string): boolean {
    return speakeasy.totp.verify({ secret, encoding: "base32", token: code, window: 1 });
  }
}
