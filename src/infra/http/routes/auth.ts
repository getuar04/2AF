import { Router } from "express";
import { authController } from "../../../di";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/login/2fa", authController.verifyLoginTwoFactor);
router.post("/2fa/init", requireAuth, authController.enableTwoFactorInit);
router.post("/2fa/confirm", requireAuth, authController.enableTwoFactorConfirm);
router.post("/refresh", authController.refresh);
router.post("/logout", requireAuth, authController.logout);

export default router;
