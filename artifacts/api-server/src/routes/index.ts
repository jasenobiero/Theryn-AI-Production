import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import openaiRouter from "./openai/index";
import anthropicRouter from "./anthropic/index";
import openrouterRouter from "./openrouter/index";
import agentsRouter from "./agents/index";
import elevenLabsRouter from "./elevenlabs/index";
import settingsRouter from "./settings";
import studioRouter from "./studio/index";
import shieldRouter from "./shield/index";
import subscriptionRouter from "./subscription";
import founderRouter from "./founders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use("/openai", openaiRouter);
router.use("/anthropic", anthropicRouter);
router.use("/openrouter", openrouterRouter);
router.use("/agents", agentsRouter);
router.use("/elevenlabs", elevenLabsRouter);
router.use("/studio", studioRouter);
router.use("/shield", shieldRouter);
router.use(subscriptionRouter);
router.use(founderRouter);
router.use(settingsRouter);

export default router;
