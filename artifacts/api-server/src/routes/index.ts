import { Router, type IRouter } from "express";
import healthRouter from "./health";
import houstonEmploymentRouter from "./houston-employment";
import radarRouter from "./radar";
import sectorUpdatesRouter from "./sector-updates";

const router: IRouter = Router();

router.use(healthRouter);
router.use(houstonEmploymentRouter);
router.use(sectorUpdatesRouter);
router.use(radarRouter);

export default router;
