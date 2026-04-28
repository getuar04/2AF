import { CreateUserInput, EnableUserTwoFactorInput, UserRepository } from "../../../app/ports/userRepository";
import { User } from "../../../app/types/auth";

export class MemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const now = new Date();
    const user: User = {
      id: input.id,
      fullName: input.fullName,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      isTwoFactorEnabled: false,
      createdAt: now,
      updatedAt: now
    };
    this.users.set(user.id, user);
    return user;
  }

  async enableTwoFactor(input: EnableUserTwoFactorInput): Promise<void> {
    const user = this.users.get(input.userId);
    if (!user) return;
    user.twoFactorSecret = input.secret;
    user.isTwoFactorEnabled = true;
    user.updatedAt = new Date();
  }

  async disableTwoFactor(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;
    user.twoFactorSecret = undefined;
    user.isTwoFactorEnabled = false;
    user.updatedAt = new Date();
  }
}