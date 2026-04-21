import { RegisterPolicy } from "../../domain/auth/registerPolicy";
import { RegisterUserInputDto, RegisterUserOutputDto } from "../dtos/authDtos";
import { AppError } from "../errors/appError";
import { UserRegisteredEvent } from "../events/userRegisteredEvent";
import { AuthAuditRepository } from "../ports/authAuditRepository";
import { EventBus } from "../ports/eventBus";
import { IdGenerator } from "../ports/idGenerator";
import { PasswordHasher } from "../ports/passwordHasher";
import { UserRepository } from "../ports/userRepository";
import { AuditService } from "../services/auditService";

export class RegisterUser {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly authAuditRepository: AuthAuditRepository,
    private readonly eventBus: EventBus,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(input: RegisterUserInputDto): Promise<RegisterUserOutputDto> {
    const fullName = input.fullName.trim();
    const email = input.email.trim().toLowerCase();
    const password = input.password;

    RegisterPolicy.validateFullName(fullName);
    RegisterPolicy.validateEmail(email);
    RegisterPolicy.validatePassword(password);

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      await this.authAuditRepository.create({
        id: this.idGenerator.generate(),
        email,
        action: "REGISTER",
        status: "FAILED",
        reason: "EMAIL_ALREADY_EXISTS",
        metadata: AuditService.buildMetadata({ email }),
        createdAt: new Date()
      });
      throw new AppError("Email already exists", 409, "EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await this.passwordHasher.hash(password);
    const userId = this.idGenerator.generate();
    const createdUser = await this.userRepository.create({ id: userId, fullName, email, passwordHash });

    await this.authAuditRepository.create({
      id: this.idGenerator.generate(),
      userId: createdUser.id,
      email: createdUser.email,
      action: "REGISTER",
      status: "SUCCESS",
      metadata: AuditService.buildMetadata({ fullName: createdUser.fullName }),
      createdAt: new Date()
    });

    const event: UserRegisteredEvent = {
      eventName: "user.registered",
      payload: {
        userId: createdUser.id,
        fullName: createdUser.fullName,
        email: createdUser.email,
        createdAt: createdUser.createdAt.toISOString()
      }
    };

    await this.eventBus.publish(event);

    return {
      id: createdUser.id,
      fullName: createdUser.fullName,
      email: createdUser.email,
      isTwoFactorEnabled: createdUser.isTwoFactorEnabled
    };
  }
}
