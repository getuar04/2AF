import { LoginChallenge } from "../types/auth";

export class LoginChallengeService {
  static serialize(challenge: LoginChallenge): string {
    return JSON.stringify(challenge);
  }

  static deserialize(value: string): LoginChallenge {
    return JSON.parse(value) as LoginChallenge;
  }
}
