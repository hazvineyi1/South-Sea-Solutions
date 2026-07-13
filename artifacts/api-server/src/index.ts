import app from "./app";
import { logger } from "./lib/logger";

/**
 * Start the public site's server.
 *
 * Boot used to seed Aftrak's training modules into the database before listening.
 * There is no training centre any more, so there is nothing to seed, and the
 * server starts by starting.
 */

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

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
