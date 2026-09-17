import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import jobsRouter from "./jobs.js";
import profilesRouter from "./profiles.js";
import applicationsRouter from "./applications.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(jobsRouter);
router.use(profilesRouter);
router.use(applicationsRouter);

export default router;
