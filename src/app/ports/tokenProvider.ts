export interface TokenPayload {
  userId: string;
  email: string;
  role: "user" | "admin";
}

export interface TokenProvider {
  generateAccessToken(payload: TokenPayload): Promise<string>;
  generateRefreshToken(payload: TokenPayload): Promise<string>;
  verifyRefreshToken(token: string): Promise<TokenPayload>;
}
