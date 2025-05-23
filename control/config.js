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
  delete config.site_secret;

  res.json({ success: true, config });
});

const TURNSTILE_SECRET = process.env.site_secret; // From Cloudflare

router.post("/verify-turnstile", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: "Missing token" });
  }

  try {
    const response = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      new URLSearchParams({
        secret: TURNSTILE_SECRET,
        response: token,
        // remoteip: req.ip, // optional
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { success } = response.data;
    if (success) {
      res.json({ success: true, message: "Verification passed" });
    } else {
      res.status(403).json({ success: false, message: "Verification failed" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Error verifying token" });
  }
});

export default router;
