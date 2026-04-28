import { onAuthEvent } from "../messaging/kafkaConsumer";

// Handler: user.registered
// Mund të triggeroj: email welcome, analytics, provisioning në sisteme të tjera
function handleUserRegistered(payload: Record<string, unknown>): void {
  console.log(`[Event] user.registered — userId: ${payload.userId}, email: ${payload.email}`);
  // TODO: dërgo email welcome, njoftim analytics, etj.
}

// Handler: user.logged_in
// Mund të triggeroj: session tracking, anomaly detection, audit dashboard
function handleUserLoggedIn(payload: Record<string, unknown>): void {
  const via2fa = payload.viaTwoFactor ? "me 2FA" : "pa 2FA";
  console.log(`[Event] user.logged_in — userId: ${payload.userId} (${via2fa})`);
  // TODO: session tracking, anomaly detection
}

// Handler: user.two_factor_enabled
// Mund të triggeroj: email konfirmim, security alert
function handleTwoFactorEnabled(payload: Record<string, unknown>): void {
  console.log(`[Event] user.two_factor_enabled — userId: ${payload.userId}, email: ${payload.email}`);
  // TODO: email konfirmim aktivizimi 2FA
}

// Handler wildcard — log të gjithë eventet e paregistruara
function handleUnknownEvent(eventName: string, payload: Record<string, unknown>): void {
  console.log(`[Event] event i panjohur: ${eventName}`, payload);
}

export function registerAuthEventHandlers(): void {
  onAuthEvent("user.registered", async ({ payload }) => handleUserRegistered(payload));
  onAuthEvent("user.logged_in", async ({ payload }) => handleUserLoggedIn(payload));
  onAuthEvent("user.two_factor_enabled", async ({ payload }) => handleTwoFactorEnabled(payload));

  // Wildcard — kap çdo event tjetër
  onAuthEvent("*", async ({ eventName, payload }) => {
    const knownEvents = ["user.registered", "user.logged_in", "user.two_factor_enabled"];
    if (!knownEvents.includes(eventName)) {
      handleUnknownEvent(eventName, payload);
    }
  });

  console.log("[AuthEventHandlers] Handlers të regjistruar.");
}
