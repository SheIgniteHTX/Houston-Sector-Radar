import { GetHoustonEmploymentTrendResponse } from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import { getHoustonEmploymentTrends } from "../lib/bls-employment";

const router: IRouter = Router();

router.get("/houston-employment", async (req, res): Promise<void> => {
  try {
    const data = await getHoustonEmploymentTrends();
    res.json(GetHoustonEmploymentTrendResponse.parse(data));
  } catch (error) {
    req.log.warn({ err: error }, "Unable to load Houston employment data from BLS");
    res.status(502).json({
      error: "Houston employment data is temporarily unavailable.",
    });
  }
});

export default router;