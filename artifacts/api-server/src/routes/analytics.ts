import { Router, type IRouter } from "express";
import { GetAnalyticsReportResponse } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { buildAnalyticsReport } from "../lib/telematics";

const router: IRouter = Router();

router.get("/analytics/report", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const report = await buildAnalyticsReport(req.auth!.orgId!);
  res.json(GetAnalyticsReportResponse.parse(report));
});

export default router;
