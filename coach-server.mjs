// Mini-servizio che espone la funzione serverless api/coach.js (stile Vercel)
// come endpoint Express. La firma handler(req,res) usa req.method/req.body e
// res.status().json(): API compatibili con Express, quindi il wrapper e' diretto.
import express from "express";
import handler from "./api/coach.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.all("/api/coach", (req, res) => handler(req, res));
app.get("/api/health", (_req, res) => res.json({ status: "ok", coach: Boolean(process.env.GEMINI_API_KEY) }));

const port = process.env.PORT || 4100;
app.listen(port, () => console.log(`[atleta360-coach] su http://localhost:${port}`));
