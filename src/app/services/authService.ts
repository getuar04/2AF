export class AuthService {
  static buildTwoFactorSetupCacheKey(userId: string, setupToken: string): string {
    return `auth:2fa:setup:${userId}:${setupToken}`;
  }

  static buildLoginChallengeCacheKey(challengeId: string): string {
    return `auth:login:challenge:${challengeId}`;
  }
}
