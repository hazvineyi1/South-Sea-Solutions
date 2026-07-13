import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

// Single-service deploy: this server hosts both the /api routes and the built
// frontend (see static serving below). Deployed on Railway with Node 22.
const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve the built frontend (single-service deploy). The web app builds to
// artifacts/south-sea-solutions/dist/public; the API bundle runs from
// artifacts/api-server/dist, so the default path is two levels up. Override
// with WEB_DIST_DIR if the layout differs. When the directory is absent (for
// example in tests, which import this app without a web build) static serving
// and the SPA fallback are skipped, so the API still works on its own.
const webDistDir =
  process.env["WEB_DIST_DIR"] ??
  path.resolve(__dirname, "..", "..", "south-sea-solutions", "dist", "public");

if (fs.existsSync(webDistDir)) {
  const indexHtml = path.join(webDistDir, "index.html");
  app.use(express.static(webDistDir));
  // SPA fallback: any non-/api GET that is not a static file returns index.html
  // so the client-side route ("/") resolves. The portal and console routes that
  // used to live here (/login, /portal/*, /console/*) were Aftrak and are gone.
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(indexHtml);
  });
  logger.info({ webDistDir }, "Serving static frontend");
} else {
  logger.warn({ webDistDir }, "Web dist directory not found; serving API only");
}

export default app;
