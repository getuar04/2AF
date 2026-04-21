export interface UserRegisteredEvent {
  eventName: "user.registered";
  payload: {
    userId: string;
    fullName: string;
    email: string;
    createdAt: string;
  };
}
