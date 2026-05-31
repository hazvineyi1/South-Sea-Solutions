import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import fleetRouter from "./fleet";
import driversRouter from "./drivers";
import alertsRouter from "./alerts";
import setupRouter from "./setup";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(fleetRouter);
router.use(driversRouter);
router.use(alertsRouter);
router.use(setupRouter);

export default router;
