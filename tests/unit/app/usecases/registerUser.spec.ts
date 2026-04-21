import { RegisterUser } from "../../../../src/app/usecases/registerUser";
import { PasswordHasher } from "../../../../src/app/ports/passwordHasher";
import { UserRepository } from "../../../../src/app/ports/userRepository";
import { AuthAuditRepository } from "../../../../src/app/ports/authAuditRepository";
import { EventBus } from "../../../../src/app/ports/eventBus";
import { IdGenerator } from "../../../../src/app/ports/idGenerator";

describe("RegisterUser", () => {
  const mockUserRepository: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    enableTwoFactor: jest.fn(),
  };

  const mockPasswordHasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const mockAuditRepository: jest.Mocked<AuthAuditRepository> = {
    create: jest.fn(),
  };

  const mockEventBus: jest.Mocked<EventBus> = {
    publish: jest.fn(),
  };

  const mockIdGenerator: jest.Mocked<IdGenerator> = {
    generate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should register a user and publish user.registered event", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockPasswordHasher.hash.mockResolvedValue("hashed-password");
    mockIdGenerator.generate
      .mockReturnValueOnce("user-id-123")
      .mockReturnValueOnce("audit-id-123");

    mockUserRepository.create.mockResolvedValue({
      id: "user-id-123",
      fullName: "Getuar",
      email: "getaur@test.ts",
      passwordHash: "hashed-password",
      isTwoFactorEnabled: false,
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
      updatedAt: new Date("2026-01-01T10:00:00.000Z"),
    });

    const useCase = new RegisterUser(
      mockUserRepository,
      mockPasswordHasher,
      mockAuditRepository,
      mockEventBus,
      mockIdGenerator,
    );

    const result = await useCase.execute({
      fullName: "Getuar",
      email: "getaur@test.ts",
      password: "12345678",
    });

    expect(result).toEqual({
      id: "user-id-123",
      fullName: "Getuar",
      email: "getaur@test.ts",
      isTwoFactorEnabled: false,
    });

    expect(mockPasswordHasher.hash).toHaveBeenCalledWith("12345678");
    expect(mockUserRepository.create).toHaveBeenCalled();
    expect(mockAuditRepository.create).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "user.registered",
      }),
    );
  });
});
