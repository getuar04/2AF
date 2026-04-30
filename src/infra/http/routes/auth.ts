import { Router } from "express";
import { authController } from "../../../di";
import { requireAuth } from "../middlewares/requireAuth";
import {
  loginRateLimiter,
  registerRateLimiter,
  twoFactorRateLimiter,
  userIdRateLimiter,
} from "../middlewares/rateLimiter";
import { validateBody } from "../middlewares/validateBody";

const router = Router();

router.post(
  "/register",
  registerRateLimiter,
  validateBody({
    fullName: { required: true, type: "string", minLength: 2, maxLength: 100 },
    email: { required: true, type: "email" },
    password: { required: true, type: "string", minLength: 8, maxLength: 128 },
  }),
  authController.register,
);

router.post(
  "/login",
  loginRateLimiter,
  userIdRateLimiter,
  validateBody({
    email: { required: true, type: "email" },
    password: { required: true, type: "string" },
  }),
  authController.login,
);

router.post(
  "/login/2fa",
  twoFactorRateLimiter,
  validateBody({
    email: { required: true, type: "email" },
    code: { required: true, type: "string", minLength: 6, maxLength: 6 },
    challengeId: { required: true, type: "string", minLength: 8 },
  }),
  authController.verifyLoginTwoFactor,
);

router.post("/2fa/init", requireAuth, authController.enableTwoFactorInit);

router.post(
  "/2fa/confirm",
  requireAuth,
  validateBody({
    code: { required: true, type: "string", minLength: 6, maxLength: 6 },
    setupToken: { required: true, type: "string", minLength: 8 },
  }),
  authController.enableTwoFactorConfirm,
);

router.post(
  "/2fa/disable",
  requireAuth,
  validateBody({
    password: { required: true, type: "string" },
  }),
  authController.disableTwoFactor,
);

router.post("/refresh", authController.refresh);

router.post("/logout", requireAuth, authController.logout);
router.post("/logout-all", requireAuth, authController.logoutAllDevices);

export default router;
