import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { Router, type IRouter } from "express";
import { GetSectorUpdatesResponse } from "@workspace/api-zod";
import {
  db,
  sectorFollowsTable,
  sectorUpdateDeliveriesTable,
  sectorUpdatesTable,
} from "@workspace/db";
import { getHoustonEmploymentTrend, BLS_SOURCE_URL } from "../lib/bls-employment";
import { logger } from "../lib/logger";
import {
  createSectorUpdateEmail,
  createUnsubscribeUrl,
  decryptEmail,
  sendRadarEmail,
} from "../lib/radar-email";
import { RADAR_FOLLOW_SECTORS, SECTORS } from "../lib/radar-data";

const router: IRouter = Router();
const FEED_LIMIT = 30;
const DELIVERY_RETRY_DELAY_MS = 15 * 60 * 1000;
const SECTOR_SERIES_MATCHES = [
  { sectorId: "digital-infrastructure", radarIndustryId: "digital-infrastructure" },
  { sectorId: "health-life-sciences", radarIndustryId: "health-life-sciences" },
  { sectorId: "construction", radarIndustryId: "construction" },
  { sectorId: "commercial-space", radarIndustryId: "commercial-space" },
  { sectorId: "datacenters", radarIndustryId: "digital-infrastructure" },
  { sectorId: "healthtech", radarIndustryId: "health-life-sciences" },
  { sectorId: "resilience", radarIndustryId: "construction" },
  { sectorId: "resilient-infrastructure", radarIndustryId: "construction" },
  { sectorId: "space", radarIndustryId: "commercial-space" },
] as const;
const LEGACY_RADAR_FOLLOW_SECTORS = [
  { id: "resilient-infrastructure", name: "Resilient infrastructure" },
] as const;
const SECTOR_NAMES = new Map<string, string>(
  [...RADAR_FOLLOW_SECTORS, ...LEGACY_RADAR_FOLLOW_SECTORS, ...SECTORS].map((sector) => [
    sector.id,
    sector.name,
  ] as const),
);
let refreshInProgress: Promise<void> | undefined;

function makeSummary(trend: {
  period: string;
  comparisonPeriod: string;
  employmentThousands: number;
  changeThousands: number;
  changePercent: number;
  blsIndustry: string;
}): string {
  const direction = trend.changeThousands >= 0 ? "increased" : "decreased";
  const signedPercent =
    trend.changePercent > 0
      ? `+${trend.changePercent.toFixed(1)}%`
      : `${trend.changePercent.toFixed(1)}%`;
  return `In ${trend.period}, BLS measured ${trend.employmentThousands.toFixed(1)} thousand Houston-area payroll jobs in ${trend.blsIndustry}. Employment ${direction} by ${Math.abs(trend.changeThousands).toFixed(1)} thousand (${signedPercent}) compared with ${trend.comparisonPeriod}.`;
}

async function deliverUpdateEmails(
  updateId: number,
  publishedAt: Date,
  sectorId: string,
  sectorName: string,
  period: string,
  summary: string,
  scope: string,
  sourceUrl: string,
  preliminary: boolean,
): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    logger.error(
      { updateId, sectorId },
      "Cannot send sector update emails without the configured encryption secret",
    );
    return;
  }

  const followers = await db
    .select({
      id: sectorFollowsTable.id,
      emailDigest: sectorFollowsTable.emailDigest,
    })
    .from(sectorFollowsTable)
    .where(
      and(
        eq(sectorFollowsTable.sectorId, sectorId),
        isNull(sectorFollowsTable.unsubscribedAt),
        isNotNull(sectorFollowsTable.emailCiphertext),
        isNotNull(sectorFollowsTable.emailIv),
        isNotNull(sectorFollowsTable.emailAuthTag),
        isNotNull(sectorFollowsTable.publicOrigin),
        lte(sectorFollowsTable.subscribedAt, publishedAt),
      ),
    );

  if (followers.length === 0) return;

  await db
    .insert(sectorUpdateDeliveriesTable)
    .values(
      followers.map((follower) => ({
        updateId,
        followId: follower.id,
      })),
    )
    .onConflictDoNothing({
      target: [
        sectorUpdateDeliveriesTable.updateId,
        sectorUpdateDeliveriesTable.followId,
      ],
    });

  const retryBefore = new Date(Date.now() - DELIVERY_RETRY_DELAY_MS);
  const deliveries = await db
    .select({
      deliveryId: sectorUpdateDeliveriesTable.id,
      followId: sectorFollowsTable.id,
      emailDigest: sectorFollowsTable.emailDigest,
      emailCiphertext: sectorFollowsTable.emailCiphertext,
      emailIv: sectorFollowsTable.emailIv,
      emailAuthTag: sectorFollowsTable.emailAuthTag,
      publicOrigin: sectorFollowsTable.publicOrigin,
    })
    .from(sectorUpdateDeliveriesTable)
    .innerJoin(
      sectorFollowsTable,
      eq(sectorUpdateDeliveriesTable.followId, sectorFollowsTable.id),
    )
    .where(
      and(
        eq(sectorUpdateDeliveriesTable.updateId, updateId),
        inArray(sectorUpdateDeliveriesTable.status, ["pending", "failed"]),
        or(
          isNull(sectorUpdateDeliveriesTable.lastAttemptAt),
          lte(sectorUpdateDeliveriesTable.lastAttemptAt, retryBefore),
        ),
        isNull(sectorFollowsTable.unsubscribedAt),
        isNotNull(sectorFollowsTable.emailCiphertext),
        isNotNull(sectorFollowsTable.emailIv),
        isNotNull(sectorFollowsTable.emailAuthTag),
        isNotNull(sectorFollowsTable.publicOrigin),
        lte(sectorFollowsTable.subscribedAt, publishedAt),
      ),
    );

  let failureCount = 0;
  for (const delivery of deliveries) {
    const now = new Date();
    const [claimed] = await db
      .update(sectorUpdateDeliveriesTable)
      .set({
        status: "pending",
        attempts: sql`${sectorUpdateDeliveriesTable.attempts} + 1`,
        lastAttemptAt: now,
      })
      .where(
        and(
          eq(sectorUpdateDeliveriesTable.id, delivery.deliveryId),
          inArray(sectorUpdateDeliveriesTable.status, ["pending", "failed"]),
          or(
            isNull(sectorUpdateDeliveriesTable.lastAttemptAt),
            lte(sectorUpdateDeliveriesTable.lastAttemptAt, retryBefore),
          ),
        ),
      )
      .returning({ id: sectorUpdateDeliveriesTable.id });
    if (!claimed) continue;

    try {
      const { emailCiphertext, emailIv, emailAuthTag } = delivery;
      if (
        !emailCiphertext ||
        !emailIv ||
        !emailAuthTag ||
        !delivery.publicOrigin
      ) {
        continue;
      }
      const unsubscribeUrl = createUnsubscribeUrl(
        delivery.publicOrigin,
        delivery.followId,
        delivery.emailDigest,
        secret,
      );
      const to = decryptEmail(
        { emailCiphertext, emailIv, emailAuthTag },
        secret,
      );
      await sendRadarEmail(
        createSectorUpdateEmail({
          to,
          sectorName,
          period,
          summary,
          scope,
          sourceUrl,
          preliminary,
          unsubscribeUrl,
        }),
      );
      await db
        .update(sectorUpdateDeliveriesTable)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(sectorUpdateDeliveriesTable.id, delivery.deliveryId));
    } catch (error) {
      failureCount += 1;
      logger.warn(
        { err: error, updateId, followId: delivery.followId },
        "Unable to deliver published sector update email",
      );
      await db
        .update(sectorUpdateDeliveriesTable)
        .set({ status: "failed" })
        .where(eq(sectorUpdateDeliveriesTable.id, delivery.deliveryId));
    }
  }

  if (failureCount > 0) {
    logger.error(
      { updateId, sectorId, failureCount },
      "Some sector update emails failed; delivery records will be retried",
    );
  }
}

async function refreshSectorUpdateSource(): Promise<void> {
  const trendData = await getHoustonEmploymentTrend();

  for (const mapping of SECTOR_SERIES_MATCHES) {
    const trend = trendData.industryTrends.find(
      (item) => item.radarIndustryId === mapping.radarIndustryId,
    );
    const sectorName = SECTOR_NAMES.get(mapping.sectorId);
    if (!trend || !sectorName) continue;

    const summary = makeSummary(trend);
    const updateValues = {
      sectorId: mapping.sectorId,
      period: trend.period,
      comparisonPeriod: trend.comparisonPeriod,
      blsIndustry: trend.blsIndustry,
      title: `${trend.blsIndustry} payroll employment in Houston`,
      summary,
      scope: trend.scope,
      employmentThousands: trend.employmentThousands,
      changeThousands: trend.changeThousands,
      changePercent: trend.changePercent,
      preliminary: trend.preliminary,
      sourceUrl: BLS_SOURCE_URL,
    };

    const [inserted] = await db
      .insert(sectorUpdatesTable)
      .values(updateValues)
      .onConflictDoNothing({
        target: [sectorUpdatesTable.sectorId, sectorUpdatesTable.period],
      })
      .returning({ id: sectorUpdatesTable.id });
    const [update] = inserted
      ? await db
          .select()
          .from(sectorUpdatesTable)
          .where(eq(sectorUpdatesTable.id, inserted.id))
          .limit(1)
      : await db
          .update(sectorUpdatesTable)
          .set(updateValues)
          .where(
            and(
              eq(sectorUpdatesTable.sectorId, mapping.sectorId),
              eq(sectorUpdatesTable.period, trend.period),
            ),
          )
          .returning();

    if (!update) continue;
    await deliverUpdateEmails(
      update.id,
      update.publishedAt,
      mapping.sectorId,
      sectorName,
      update.period,
      update.summary,
      update.scope,
      update.sourceUrl,
      update.preliminary,
    );
  }
}

export function refreshSectorUpdates(): Promise<void> {
  if (!refreshInProgress) {
    refreshInProgress = refreshSectorUpdateSource().finally(() => {
      refreshInProgress = undefined;
    });
  }
  return refreshInProgress;
}

router.get("/sector-updates", async (_req, res): Promise<void> => {
  let sourceStatus: "current" | "unavailable" = "current";
  try {
    await refreshSectorUpdates();
  } catch (error) {
    sourceStatus = "unavailable";
    logger.warn(
      { err: error },
      "Unable to refresh source-backed sector updates",
    );
  }

  const updates = await db
    .select()
    .from(sectorUpdatesTable)
    .orderBy(desc(sectorUpdatesTable.publishedAt))
    .limit(FEED_LIMIT);
  res.json(
    GetSectorUpdatesResponse.parse({
      sourceStatus,
      updates: updates.map((update) => ({
        ...update,
        publishedAt: update.publishedAt.toISOString(),
        sectorName: SECTOR_NAMES.get(update.sectorId) ?? update.sectorId,
      })),
    }),
  );
});

export default router;