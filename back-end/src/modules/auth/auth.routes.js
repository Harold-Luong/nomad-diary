import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { authRateLimiter } from "../../middleware/rate-limit.js";
import validate from "../../middleware/validate.js";
import * as authController from "./auth.controller.js";
import {
    changePasswordSchema,
    deleteAccountSchema,
    loginSchema,
    refreshTokenSchema,
    registerSchema,
    updateProfileSchema,
} from "./auth.schema.js";

const router = Router();

router.post("/register", authRateLimiter, validate(registerSchema), authController.register);
router.post("/login", authRateLimiter, validate(loginSchema), authController.login);
router.post(
    "/refresh-token",
    authRateLimiter,
    validate(refreshTokenSchema),
    authController.refreshToken,
);
router.post("/logout", authenticate, authController.logout);

router.get("/me", authenticate, authController.getMe);
router.patch("/me", authenticate, validate(updateProfileSchema), authController.updateMe);
router.patch(
    "/change-password",
    authenticate,
    validate(changePasswordSchema),
    authController.changePassword,
);
router.delete(
    "/account",
    authenticate,
    validate(deleteAccountSchema),
    authController.deleteAccount,
);

export default router;
