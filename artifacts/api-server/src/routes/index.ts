import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contactRouter from "./contact";

/**
 * The public site's API surface. Two routes, both unauthenticated.
 *
 * This used to mount auth, fleet, drivers, alerts, setup, training and platform:
 * the entire Aftrak portal. All of it is gone. Beltari is the product now, and it
 * runs on its own deployment with its own database, so nothing here needs a login
 * at all.
 *
 * If a future route needs authentication, that is a signal to think hard rather
 * than to reinstate what was removed. A marketing site that grows an auth system
 * is usually a product wearing a marketing site as a disguise.
 */
const router: IRouter = Router();

router.use(healthRouter);
router.use(contactRouter);

export default router;
