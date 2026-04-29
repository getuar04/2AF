import { Router } from "express";
import { adminController } from "../../../di";
import { requireAdmin } from "../middlewares/requireAdmin";
import { internalAuth } from "../middlewares/internalAuth";

const router = Router();

router.use(requireAdmin);

router.get("/audit-logs", adminController.getAuditLogs);
router.get(
  "/debug/login-challenge/:id",
  internalAuth,
  adminController.getLoginChallengeDebug,
);
router.get(
  "/debug/2fa-setup/:userId/:token",
  internalAuth,
  adminController.getTwoFaSetupDebug,
);
router.get("/debug/redis/health", internalAuth, adminController.getRedisHealth);

export default router;
