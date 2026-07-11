import { Router } from "express";
import { createKeys, readKeys, updateKeys } from "../controllers/crypto-key.controller";
import { requireApiAuth } from "../middleware/auth.middleware";
import { cryptoRateLimit } from "../middleware/rate-limit.middleware";
import { asyncHandler } from "../utils/async-handler";

export const cryptoKeyRouter = Router();

cryptoKeyRouter.use(requireApiAuth);
cryptoKeyRouter.use(cryptoRateLimit);
cryptoKeyRouter.get("/keys", asyncHandler(readKeys));
cryptoKeyRouter.post("/keys", asyncHandler(createKeys));
cryptoKeyRouter.put("/keys", asyncHandler(updateKeys));
