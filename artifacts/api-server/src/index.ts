import app from "./app";
import { logger } from "./lib/logger";
import { refreshSectorUpdates } from "./routes/sector-updates";

const SECTOR_UPDATE_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
let sectorRefreshInProgress = false;

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

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");

  if (process.env.NODE_ENV !== "production") return;

  const refreshSectorUpdateFeed = async () => {
    if (sectorRefreshInProgress) return;
    sectorRefreshInProgress = true;
    try {
      await refreshSectorUpdates();
    } catch (err) {
      logger.warn({ err }, "Scheduled sector update refresh failed");
    } finally {
      sectorRefreshInProgress = false;
    }
  };

  void refreshSectorUpdateFeed();
  const refreshTimer = setInterval(
    () => void refreshSectorUpdateFeed(),
    SECTOR_UPDATE_REFRESH_INTERVAL_MS,
  );
  refreshTimer.unref();
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
