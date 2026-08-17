// Mini-servizio che espone la funzione serverless api/coach.js (stile Vercel)
// come endpoint Express. La firma handler(req,res) usa req.method/req.body e
// res.status().json(): API compatibili con Express, quindi il wrapper e' diretto.
import express from "express";
import handler from "./api/coach.js";
import pushHandler from "./api/push.js";
import summaryHandler from "./api/summary.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.all("/api/coach", (req, res) => handler(req, res));
app.all("/api/push/dispatch", (req, res) => pushHandler(req, res));
app.all("/api/summary", (req, res) => summaryHandler(req, res));
app.get("/api/health", (_req, res) => res.json({
  status: "ok",
  coach: Boolean(process.env.GEMINI_API_KEY),
  push: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  summary: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
}));

const port = process.env.PORT || 4100;
app.listen(port, () => console.log(`[atleta360-coach] su http://localhost:${port}`));
