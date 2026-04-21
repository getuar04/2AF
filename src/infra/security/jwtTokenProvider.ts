import jwt, { SignOptions } from "jsonwebtoken";
import { TokenPayload, TokenProvider } from "../../app/ports/tokenProvider";
import { env } from "../config/env";

export class JwtTokenProvider implements TokenProvider {
  async generateAccessToken(payload: TokenPayload): Promise<string> {
    const options: SignOptions = {
      expiresIn: env.jwt.expiresIn as SignOptions["expiresIn"],
      subject: payload.userId,
    };

    return jwt.sign(payload, env.jwt.secret, options);
  }
}
