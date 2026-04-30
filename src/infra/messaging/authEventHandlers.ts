import { onAuthEvent } from "../messaging/kafkaConsumer";
import { logger } from "../logger/logger";

// Handler: user.registered
// Integrime të ardhshme: email welcome, analytics, provisioning
function handleUserRegistered(payload: Record<string, unknown>): void {
  logger.info(
    { event: "user.registered", userId: payload.userId, email: payload.email },
    "User i regjistruar — duke pritur integrim email/analytics",
  );
  // TODO: dërgo email welcome, njoftim analytics, etj.
}

// Handler: user.logged_in
// Integrime të ardhshme: session tracking, anomaly detection, audit dashboard
function handleUserLoggedIn(payload: Record<string, unknown>): void {
  logger.info(
    {
      event: "user.logged_in",
      userId: payload.userId,
      viaTwoFactor: payload.viaTwoFactor ?? false,
    },
    `User u identifikua ${payload.viaTwoFactor ? "me 2FA" : "pa 2FA"}`,
  );
  // TODO: session tracking, anomaly detection
}

// Handler: user.two_factor_enabled
// Integrime të ardhshme: email konfirmim, security alert
function handleTwoFactorEnabled(payload: Record<string, unknown>): void {
  logger.info(
    {
      event: "user.two_factor_enabled",
      userId: payload.userId,
      email: payload.email,
    },
    "2FA u aktivizua — duke pritur integrim email konfirmimi",
  );
  // TODO: email konfirmim aktivizimi 2FA
}

// Handler wildcard — log të gjithë eventet e paregistruara
function handleUnknownEvent(
  eventName: string,
  payload: Record<string, unknown>,
): void {
  logger.warn(
    { event: eventName, payload },
    "Event i panjohur i marrë nga Kafka",
  );
}

export function registerAuthEventHandlers(): void {
  onAuthEvent("user.registered", async ({ payload }) =>
    handleUserRegistered(payload),
  );
  onAuthEvent("user.logged_in", async ({ payload }) =>
    handleUserLoggedIn(payload),
  );
  onAuthEvent("user.two_factor_enabled", async ({ payload }) =>
    handleTwoFactorEnabled(payload),
  );

  // Wildcard — kap çdo event tjetër
  onAuthEvent("*", async ({ eventName, payload }) => {
    const knownEvents = [
      "user.registered",
      "user.logged_in",
      "user.two_factor_enabled",
    ];
    if (!knownEvents.includes(eventName)) {
      handleUnknownEvent(eventName, payload);
    }
  });

  logger.info("AuthEventHandlers: handlers të regjistruar me sukses.");
}
