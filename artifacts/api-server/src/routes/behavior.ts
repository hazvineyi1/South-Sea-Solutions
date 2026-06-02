import { Router, type IRouter } from "express";
import { GetBehaviorOverviewResponse } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { buildBehaviorOverview } from "../lib/telematics";

const router: IRouter = Router();

router.get("/behavior", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const overview = await buildBehaviorOverview(req.auth!.orgId!);
  res.json(GetBehaviorOverviewResponse.parse(overview));
});

export default router;
