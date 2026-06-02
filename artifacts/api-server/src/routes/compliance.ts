import { Router, type IRouter } from "express";
import { GetComplianceHosResponse } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { buildComplianceHos } from "../lib/telematics";

const router: IRouter = Router();

router.get("/compliance/hos", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const rows = await buildComplianceHos(req.auth!.orgId!);
  res.json(GetComplianceHosResponse.parse(rows));
});

export default router;
