export interface TokenPayload {
  userId: string;
  email: string;
}

export interface TokenProvider {
  generateAccessToken(payload: TokenPayload): Promise<string>;
}
