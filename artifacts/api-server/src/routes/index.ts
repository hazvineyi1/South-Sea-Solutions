import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import fleetRouter from "./fleet";
import driversRouter from "./drivers";
import alertsRouter from "./alerts";
import setupRouter from "./setup";
import trainingRouter from "./training";
import platformRouter from "./platform";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(fleetRouter);
router.use(driversRouter);
router.use(alertsRouter);
router.use(setupRouter);
router.use(trainingRouter);
router.use(platformRouter);

export default router;
