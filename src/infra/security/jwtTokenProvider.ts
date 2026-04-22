import jwt, { SignOptions } from "jsonwebtoken";
import { TokenPayload, TokenProvider } from "../../app/ports/tokenProvider";
import { env } from "../config/env";
import { AppError } from "../../app/errors/appError";

export class JwtTokenProvider implements TokenProvider {
  async generateAccessToken(payload: TokenPayload): Promise<string> {
    const options: SignOptions = {
      expiresIn: env.jwt.accessExpiresIn as SignOptions["expiresIn"],
      subject: payload.userId,
    };
    return jwt.sign(payload, env.jwt.accessSecret, options);
  }

  async generateRefreshToken(payload: TokenPayload): Promise<string> {
    const options: SignOptions = {
      expiresIn: env.jwt.refreshExpiresIn as SignOptions["expiresIn"],
      subject: payload.userId,
    };
    return jwt.sign(payload, env.jwt.refreshSecret, options);
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, env.jwt.refreshSecret) as TokenPayload;
      return decoded;
    } catch {
      throw new AppError("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN");
    }
  }
}
