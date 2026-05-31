import app from "./app";
import { logger } from "./lib/logger";
import { db, ensureTrainingModules } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main(): Promise<void> {
  // Ensure the platform training content exists before we start serving, so a
  // fresh or production database never shows an empty training center. This is
  // idempotent and non-fatal: a failure is logged but does not block startup.
  try {
    const { inserted } = await ensureTrainingModules(db);
    if (inserted > 0) {
      logger.info({ inserted }, "Loaded missing platform training modules");
    }
  } catch (err) {
    logger.error({ err }, "Failed to ensure platform training modules");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

void main();
