import { LogoutUser } from "../../../../src/app/usecases/logoutUser";
import { CacheProvider } from "../../../../src/app/ports/cacheProvider";
import { AuthAuditRepository } from "../../../../src/app/ports/authAuditRepository";
import { IdGenerator } from "../../../../src/app/ports/idGenerator";

describe("LogoutUser", () => {
  const mockCacheProvider: jest.Mocked<CacheProvider> = {
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
    deleteByPrefix: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditRepository: jest.Mocked<AuthAuditRepository> = {
    create: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn().mockResolvedValue([]),
  };

  const mockIdGenerator: jest.Mocked<IdGenerator> = {
    generate: jest.fn().mockReturnValue("audit-id"),
  };

  const makeUseCase = (ttl = 900) =>
    new LogoutUser(mockCacheProvider, mockAuditRepository, mockIdGenerator, ttl);

  beforeEach(() => jest.clearAllMocks());

  it("should blacklist the access token and return success message", async () => {
    const result = await makeUseCase().execute("user-1", "user@test.com", "valid-token");

    expect(mockCacheProvider.set).toHaveBeenCalledWith(
      "auth:blacklist:valid-token",
      "1",
      { ttlSeconds: 900 },
    );
    expect(result.message).toMatch(/logged out/i);
  });

  it("should create an audit log with LOGOUT action", async () => {
    await makeUseCase().execute("user-1", "user@test.com", "valid-token");

    expect(mockAuditRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        email: "user@test.com",
        action: "LOGOUT",
        status: "SUCCESS",
      }),
    );
  });

  it("should throw TOKEN_REQUIRED when accessToken is empty", async () => {
    await expect(
      makeUseCase().execute("user-1", "user@test.com", ""),
    ).rejects.toMatchObject({ code: "TOKEN_REQUIRED" });
  });

  it("should not call cacheProvider when token is missing", async () => {
    try {
      await makeUseCase().execute("user-1", "user@test.com", "");
    } catch {}

    expect(mockCacheProvider.set).not.toHaveBeenCalled();
  });

  it("should use the provided TTL for blacklisting", async () => {
    await makeUseCase(300).execute("user-1", "user@test.com", "my-token");

    expect(mockCacheProvider.set).toHaveBeenCalledWith(
      expect.any(String),
      "1",
      { ttlSeconds: 300 },
    );
  });
});
