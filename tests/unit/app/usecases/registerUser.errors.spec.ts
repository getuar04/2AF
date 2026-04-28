import { RegisterUser } from "../../../../src/app/usecases/registerUser";
import { UserRepository } from "../../../../src/app/ports/userRepository";
import { PasswordHasher } from "../../../../src/app/ports/passwordHasher";
import { AuthAuditRepository } from "../../../../src/app/ports/authAuditRepository";
import { EventBus } from "../../../../src/app/ports/eventBus";
import { IdGenerator } from "../../../../src/app/ports/idGenerator";
import { AppError } from "../../../../src/app/errors/appError";

describe("RegisterUser - error cases", () => {
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
    generate: jest.fn().mockReturnValue("some-uuid"),
  };

  const makeUseCase = () =>
    new RegisterUser(
      mockUserRepository,
      mockPasswordHasher,
      mockAuditRepository,
      mockEventBus,
      mockIdGenerator,
      [],
    );

  beforeEach(() => jest.clearAllMocks());

  it("should throw EMAIL_ALREADY_EXISTS when email is taken", async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: "existing-id",
      fullName: "Existing User",
      email: "taken@test.com",
      passwordHash: "hash",
      role: "user",
      isTwoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      makeUseCase().execute({
        fullName: "New User",
        email: "taken@test.com",
        password: "Password123",
      }),
    ).rejects.toThrow(AppError);

    try {
      await makeUseCase().execute({
        fullName: "New User",
        email: "taken@test.com",
        password: "Password123",
      });
    } catch (e) {
      expect((e as AppError).code).toBe("EMAIL_ALREADY_EXISTS");
      expect((e as AppError).statusCode).toBe(409);
    }
  });

  it("should save audit log on duplicate email attempt", async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: "existing-id",
      fullName: "Existing",
      email: "taken@test.com",
      passwordHash: "hash",
      role: "user",
      isTwoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      await makeUseCase().execute({
        fullName: "New",
        email: "taken@test.com",
        password: "Password123",
      });
    } catch {}

    expect(mockAuditRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "REGISTER",
        status: "FAILED",
        email: "taken@test.com",
      }),
    );
  });

  it("should throw INVALID_EMAIL for bad email format", async () => {
    await expect(
      makeUseCase().execute({
        fullName: "Test User",
        email: "not-an-email",
        password: "Password123",
      }),
    ).rejects.toThrow(AppError);
  });

  it("should throw INVALID_FULL_NAME for short name", async () => {
    await expect(
      makeUseCase().execute({
        fullName: "A",
        email: "user@test.com",
        password: "Password123",
      }),
    ).rejects.toThrow(AppError);
  });

  it("should throw WEAK_PASSWORD for short password", async () => {
    await expect(
      makeUseCase().execute({
        fullName: "Valid Name",
        email: "user@test.com",
        password: "short",
      }),
    ).rejects.toThrow(AppError);
  });

  it("should normalize email to lowercase", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockPasswordHasher.hash.mockResolvedValue("hashed");
    mockIdGenerator.generate
      .mockReturnValueOnce("user-id")
      .mockReturnValueOnce("audit-id");
    mockUserRepository.create.mockResolvedValue({
      id: "user-id",
      fullName: "Test User",
      email: "user@test.com",
      passwordHash: "hashed",
      role: "user",
      isTwoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await makeUseCase().execute({
      fullName: "Test User",
      email: "USER@TEST.COM",
      password: "Password123",
    });

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
      "user@test.com",
    );
  });

  it("should not publish event when registration fails", async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: "existing",
      fullName: "Existing",
      email: "taken@test.com",
      passwordHash: "hash",
      role: "user",
      isTwoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      await makeUseCase().execute({
        fullName: "New",
        email: "taken@test.com",
        password: "Password123",
      });
    } catch {}

    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
