import { Router } from "express";
import { authController } from "../../../di";
import { requireAuth } from "../middlewares/requireAuth";
import {
  loginRateLimiter,
  registerRateLimiter,
  twoFactorRateLimiter,
} from "../middlewares/rateLimiter";

const router = Router();

router.post("/register", registerRateLimiter, authController.register);
router.post("/login", loginRateLimiter, authController.login);
router.post(
  "/login/2fa",
  twoFactorRateLimiter,
  authController.verifyLoginTwoFactor,
);
router.post("/2fa/init", requireAuth, authController.enableTwoFactorInit);
router.post("/2fa/confirm", requireAuth, authController.enableTwoFactorConfirm);
router.post("/2fa/disable", requireAuth, authController.disableTwoFactor);
router.post("/refresh", authController.refresh);
router.post("/logout", requireAuth, authController.logout);

export default router;
