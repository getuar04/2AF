export interface GenerateSecretInput {
  label: string;
  issuer: string;
}

export interface TwoFactorSecret {
  base32: string;
  otpauthUrl: string;
}

export interface TwoFactorProvider {
  generateSecret(input: GenerateSecretInput): TwoFactorSecret;
  verifyCode(secret: string, code: string): boolean;
}
