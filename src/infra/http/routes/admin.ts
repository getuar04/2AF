import { Router } from "express";
import { adminController } from "../../../di";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

router.use(requireAdmin);

router.get("/audit-logs", adminController.getAuditLogs);
router.get("/debug/login-challenge/:id", adminController.getLoginChallengeDebug);
router.get("/debug/2fa-setup/:userId/:token", adminController.getTwoFaSetupDebug);
router.get("/debug/redis/health", adminController.getRedisHealth);

export default router;
