import { Router, type IRouter } from "express";
import {
  GetTelematicsOverviewResponse,
  GetVehicleHealthRowsResponse,
  GetVehicleHealthDetailParams,
  GetVehicleHealthDetailResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import {
  buildFleetIntelligence,
  buildVehicleHealthRows,
  buildVehicleHealthDetail,
} from "../lib/telematics";

const router: IRouter = Router();

router.get("/telematics/overview", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const overview = await buildFleetIntelligence(req.auth!.orgId!);
  res.json(GetTelematicsOverviewResponse.parse(overview));
});

router.get("/telematics/health", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const rows = await buildVehicleHealthRows(req.auth!.orgId!);
  res.json(GetVehicleHealthRowsResponse.parse(rows));
});

router.get("/telematics/health/:vehicleId", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const params = GetVehicleHealthDetailParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const detail = await buildVehicleHealthDetail(req.auth!.orgId!, params.data.vehicleId);
  if (!detail) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.json(GetVehicleHealthDetailResponse.parse(detail));
});

export default router;
