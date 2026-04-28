import rateLimit from "express-rate-limit";

const isTest = process.env.NODE_ENV === "test";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 10,
  message: {
    error: {
      message: "Shumë tentativa login. Provo pas 15 minutave.",
      code: "TOO_MANY_LOGIN_ATTEMPTS"
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isTest ? 1000 : 5,
  message: {
    error: {
      message: "Shumë tentativa regjistrim. Provo pas 1 ore.",
      code: "TOO_MANY_REGISTER_ATTEMPTS"
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const twoFactorRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isTest ? 1000 : 5,
  message: {
    error: {
      message: "Shumë tentativa 2FA. Provo pas 5 minutave.",
      code: "TOO_MANY_2FA_ATTEMPTS"
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});