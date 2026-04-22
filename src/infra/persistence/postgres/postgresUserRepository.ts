import { CreateUserInput, EnableUserTwoFactorInput, UserRepository } from "../../../app/ports/userRepository";
import { User } from "../../../app/types/auth";
import { getPostgresPool } from "./postgresClient";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: "user" | "admin";
  is_two_factor_enabled: boolean;
  two_factor_secret: string | null;
  created_at: Date;
  updated_at: Date;
}

export class PostgresUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const res = await getPostgresPool().query<UserRow>(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
    return res.rowCount ? this.map(res.rows[0]!) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const res = await getPostgresPool().query<UserRow>(`SELECT * FROM users WHERE email = $1 LIMIT 1`, [email]);
    return res.rowCount ? this.map(res.rows[0]!) : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const res = await getPostgresPool().query<UserRow>(
      `INSERT INTO users (id, full_name, email, password_hash, role, is_two_factor_enabled, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,false,NOW(),NOW()) RETURNING *`,
      [input.id, input.fullName, input.email, input.passwordHash, input.role]
    );
    return this.map(res.rows[0]!);
  }

  async enableTwoFactor(input: EnableUserTwoFactorInput): Promise<void> {
    await getPostgresPool().query(
      `UPDATE users SET is_two_factor_enabled = true, two_factor_secret = $2, updated_at = NOW() WHERE id = $1`,
      [input.userId, input.secret]
    );
  }

  private map(row: UserRow): User {
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role ?? "user",
      isTwoFactorEnabled: row.is_two_factor_enabled,
      twoFactorSecret: row.two_factor_secret ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
