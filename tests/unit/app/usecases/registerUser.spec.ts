import { RegisterUser } from "../../../../src/app/usecases/registerUser";
import { UserRepository } from "../../../../src/app/ports/userRepository";
import { PasswordHasher } from "../../../../src/app/ports/passwordHasher";
import { AuthAuditRepository } from "../../../../src/app/ports/authAuditRepository";
import { EventBus } from "../../../../src/app/ports/eventBus";
import { IdGenerator } from "../../../../src/app/ports/idGenerator";

describe("RegisterUser", () => {
  const mockUserRepository: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    enableTwoFactor: jest.fn(),
disableTwoFactor: jest.fn(),
  };

  const mockPasswordHasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const mockAuditRepository: jest.Mocked<AuthAuditRepository> = {
    create: jest.fn(),
    findAll: jest.fn(),
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

  it("should register a user with role=user and publish event", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockPasswordHasher.hash.mockResolvedValue("hashed-password");
    mockIdGenerator.generate.mockReturnValueOnce("user-uuid").mockReturnValueOnce("audit-uuid");
    mockUserRepository.create.mockResolvedValue({
      id: "user-uuid",
      fullName: "Getuar",
      email: "getuar@test.com",
      passwordHash: "hashed-password",
      role: "user",
      isTwoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const useCase = new RegisterUser(
      mockUserRepository, mockPasswordHasher, mockAuditRepository, mockEventBus, mockIdGenerator, []
    );

    const result = await useCase.execute({ fullName: "Getuar", email: "getuar@test.com", password: "Password123" });

    expect(result.role).toBe("user");
    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ eventName: "user.registered" }));
  });

  it("should register with role=admin when email is in adminEmails", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockPasswordHasher.hash.mockResolvedValue("hashed-password");
    mockIdGenerator.generate.mockReturnValueOnce("admin-uuid").mockReturnValueOnce("audit-uuid");
    mockUserRepository.create.mockResolvedValue({
      id: "admin-uuid",
      fullName: "Admin",
      email: "admin@test.com",
      passwordHash: "hashed-password",
      role: "admin",
      isTwoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const useCase = new RegisterUser(
      mockUserRepository, mockPasswordHasher, mockAuditRepository, mockEventBus, mockIdGenerator, ["admin@test.com"]
    );

    const result = await useCase.execute({ fullName: "Admin", email: "admin@test.com", password: "Password123" });

    expect(result.role).toBe("admin");
  });
});
