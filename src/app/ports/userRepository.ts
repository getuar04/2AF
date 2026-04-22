import { User } from "../types/auth";

export interface CreateUserInput {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: "user" | "admin";
}

export interface EnableUserTwoFactorInput {
  userId: string;
  secret: string;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  enableTwoFactor(input: EnableUserTwoFactorInput): Promise<void>;
}
