import { ListTiresResponse } from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import { getTireCatalog } from "../lib/tire-catalog";

const router: IRouter = Router();

router.get("/tires", async (req, res): Promise<void> => {
  try {
    const catalog = await getTireCatalog();
    res.json(ListTiresResponse.parse(catalog));
  } catch (error) {
    req.log.error({ err: error }, "Failed to load tire catalog");
    res.status(502).json({ error: "Не удалось загрузить каталог шин." });
  }
});

export default router;
