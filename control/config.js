import { Router } from "express";
import axios from "axios";

const router = Router();

router.get("/config", (req, res) => {
  // Create a copy of process.env instead of modifying the original
  const config = { ...process.env };

  // Now delete from the copy, not the original
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

  //console.log(token);

  if (!token) {
    return res.status(400).json({ success: false, message: "Missing token" });
  }

  try {
    const ip =
      req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

    let formData = new FormData();
    formData.append("secret", TURNSTILE_SECRET);
    formData.append("response", token);
    formData.append("remoteip", ip);

    const response = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    //console.log(response.data);

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
