import { Router } from "express";

const router = Router();

router.get("/config", (req, res) => {
  const config = process.env;
  delete config.panel_key;
  delete config.webhook;
  delete config.sk_privkey;
  delete config.secret_key;
  delete config.LS_COLORS;
  delete config.password;
  delete config.PATH;

  res.json({ success: true, config });
});

export default router;
