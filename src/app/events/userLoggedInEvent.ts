export interface UserLoggedInEvent {
  eventName: "user.logged_in";
  payload: {
    userId: string;
    email: string;
    loggedInAt: string;
    viaTwoFactor: boolean;
  };
}
