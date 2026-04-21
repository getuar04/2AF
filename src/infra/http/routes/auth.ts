import { Router } from "express";
import { authController } from "../../../di";

const router = Router();

router.post("/register", authController.register);
router.post("/2fa/init", authController.enableTwoFactorInit);
router.post("/2fa/confirm", authController.enableTwoFactorConfirm);
router.post("/login", authController.login);
router.post("/login/2fa", authController.verifyLoginTwoFactor);

export default router;
