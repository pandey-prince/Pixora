import { Router } from "express";
import { createKeys, readKeys, updateKeys } from "../controllers/crypto-key.controller";
import { requireApiAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const cryptoKeyRouter = Router();

cryptoKeyRouter.use(requireApiAuth);
cryptoKeyRouter.get("/keys", asyncHandler(readKeys));
cryptoKeyRouter.post("/keys", asyncHandler(createKeys));
cryptoKeyRouter.put("/keys", asyncHandler(updateKeys));
