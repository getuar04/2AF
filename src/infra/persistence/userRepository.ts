import { v4 as uuidv4 } from "uuid";
import {
  CreateUserInput,
  UserRepository,
} from "../../app/ports/userRepository";
import { User } from "../../app/types/auth";

export class UserRepositoryImpl implements UserRepository {
  private users: User[] = [];

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) || null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const user: User = {
      id: uuidv4(),
      fullName: input.fullName,
      email: input.email,
      passwordHash: input.passwordHash,
      isTwoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.push(user);
    return user;
  }

  async savePendingTwoFactorSecret(
    userId: string,
    secret: string,
  ): Promise<void> {
    const user = await this.findById(userId);
    if (user) {
      user.twoFactorSecret = secret;
    }
  }

  async enableTwoFactor(input: { userId: string; secret: string }): Promise<void> {
    const user = this.users.find((u) => u.id === input.userId);

    if (!user) return;

      user.twoFactorSecret = input.secret;
      user.isTwoFactorEnabled = true;
    
  }

  async clearPendingTwoFactorSecret(userId: string): Promise<void> {
    const user = await this.findById(userId);
    if (user) {
      user.twoFactorSecret = undefined;
    }
  }
}
