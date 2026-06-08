import { Router } from "express";
import pipelineRouter from "./pipeline";
import articlesRouter from "./articles";
import healthRouter from "./health";

const router = Router();

router.use(healthRouter);
router.use(pipelineRouter);
router.use(articlesRouter);

export default router;
