export interface TwoFactorEnabledEvent {
  eventName: "user.two_factor_enabled";
  payload: {
    userId: string;
    email: string;
    enabledAt: string;
  };
}
