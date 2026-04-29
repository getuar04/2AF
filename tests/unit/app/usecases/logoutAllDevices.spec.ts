import { LogoutAllDevices } from "../../../../src/app/usecases/logoutAllDevices";
import { CacheProvider } from "../../../../src/app/ports/cacheProvider";
import { AuthAuditRepository } from "../../../../src/app/ports/authAuditRepository";
import { IdGenerator } from "../../../../src/app/ports/idGenerator";

describe("LogoutAllDevices", () => {
  const mockCache: jest.Mocked<CacheProvider> = {
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
    deleteByPrefix: jest.fn().mockResolvedValue(undefined),
  };

  const mockAudit: jest.Mocked<AuthAuditRepository> = {
    create: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn(),
  };

  const mockIdGen: jest.Mocked<IdGenerator> = {
    generate: jest.fn().mockReturnValue("id-1"),
  };

  const makeUseCase = () =>
    new LogoutAllDevices(mockCache, mockAudit, mockIdGen);

  beforeEach(() => jest.clearAllMocks());

  it("should set a new generation key in cache", async () => {
    const result = await makeUseCase().execute("user-1", "user@test.com");

    expect(mockCache.set).toHaveBeenCalledWith(
      "auth:session:generation:user-1",
      expect.any(String),
      { ttlSeconds: 7 * 24 * 60 * 60 },
    );
    expect(result.message).toMatch(/all devices/i);
  });

  it("should create audit log with LOGOUT_ALL_DEVICES action", async () => {
    await makeUseCase().execute("user-1", "user@test.com");

    expect(mockAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        email: "user@test.com",
        action: "LOGOUT_ALL_DEVICES",
        status: "SUCCESS",
      }),
    );
  });

  it("should throw USER_ID_REQUIRED when userId is empty", async () => {
    await expect(
      makeUseCase().execute("", "user@test.com"),
    ).rejects.toMatchObject({ code: "USER_ID_REQUIRED" });
  });
});
