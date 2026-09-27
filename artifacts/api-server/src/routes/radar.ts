/*
 * Houston Emerging Sector Radar
 * © 2026 SheIgnite Society LLC. All rights reserved.
 * Proprietary and confidential. No license is granted to copy, modify,
 * or distribute this code without written permission.
 */
import { and, count, eq, isNotNull, isNull } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import {
  CreateFollowBody,
  CreateFollowResponse,
  CreateSkillSignalBody,
  CreateSkillSignalResponse,
  GetRadarResponse,
} from "@workspace/api-zod";
import { db, sectorFollowsTable, skillSignalsTable } from "@workspace/db";
import { RADAR_FOLLOW_SECTORS, SECTORS, SKILLS } from "../lib/radar-data";
import {
  areRadarEmailsEnabled,
  createEmailDigest,
  createFollowConfirmationEmail,
  createUnsubscribeUrl,
  encryptEmail,
  escapeHtml,
  getUnsubscribeFollowId,
  getRequestPublicOrigin,
  isValidUnsubscribeToken,
  normalizeEmail,
  sendRadarEmail,
} from "../lib/radar-email";

const router: IRouter = Router();
const validSkillIds = new Set<string>(SKILLS.map((skill) => skill.id));

function getToken(req: Request): string {
  const queryToken = req.query.token;
  const bodyToken = req.body?.token;
  return typeof queryToken === "string"
    ? queryToken
    : typeof bodyToken === "string"
      ? bodyToken
      : "";
}

function unsubscribePage(
  title: string,
  message: string,
  token?: string,
): string {
  const form = token
    ? `<form method="post"><input type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit" style="margin-top:20px;padding:12px 18px;border:0;border-radius:8px;background:#28746c;color:white;font-weight:700;cursor:pointer">Unsubscribe</button></form>`
    : "";
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | Houston Workforce Radar</title><body style="margin:0;background:#f4f6f5;color:#17212b;font-family:Arial,sans-serif"><main style="max-width:560px;margin:10vh auto;padding:32px;background:white;border:1px solid #d9e0df;border-radius:16px"><p style="color:#39716b;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Houston Workforce Radar</p><h1 style="font-size:28px">${escapeHtml(title)}</h1><p style="line-height:1.6">${escapeHtml(message)}</p>${form}<p style="margin-top:28px;color:#687372;font-size:12px">© ${new Date().getFullYear()} SheIgnite Society LLC. All rights reserved.</p></main></body></html>`;
}

router.get("/radar", async (_req, res): Promise<void> => {
  const totals = await db
    .select({
      sectorId: sectorFollowsTable.sectorId,
      followers: count(),
    })
    .from(sectorFollowsTable)
    .where(
      and(
        isNull(sectorFollowsTable.unsubscribedAt),
        isNotNull(sectorFollowsTable.emailCiphertext),
      ),
    )
    .groupBy(sectorFollowsTable.sectorId);
  const followCounts = new Map(
    totals.map((entry) => [entry.sectorId, entry.followers]),
  );
  const sectors = SECTORS.map((sector) => ({
    ...sector,
    followers: followCounts.get(sector.id) ?? 0,
  }));

  res.json(
    GetRadarResponse.parse({
      skills: SKILLS,
      sectors,
      summary: {
        totalSectors: sectors.length,
        accelerating: sectors.filter((sector) => sector.momentum === "accelerating").length,
        rising: sectors.filter((sector) => sector.momentum === "rising").length,
        emerging: sectors.filter((sector) => sector.momentum === "emerging").length,
        totalFollows: totals.reduce((sum, entry) => sum + entry.followers, 0),
      },
    }),
  );
});

router.post("/follow", async (req, res): Promise<void> => {
  const parsed = CreateFollowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email address and sector." });
    return;
  }

  const { sectorId, email, consent } = parsed.data;
  if (!RADAR_FOLLOW_SECTORS.some((sector) => sector.id === sectorId)) {
    res.status(400).json({ error: "Choose a sector to follow." });
    return;
  }
  if (consent !== true) {
    res.status(400).json({ error: "Consent is required to record a follow." });
    return;
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    res.status(503).json({ error: "Follow service is not configured." });
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const emailDigest = createEmailDigest(normalizedEmail, secret);
  const encryptedEmail = encryptEmail(normalizedEmail, secret);
  const publicOrigin = getRequestPublicOrigin(req);
  const inserted = await db
    .insert(sectorFollowsTable)
    .values({
      sectorId,
      emailDigest,
      ...encryptedEmail,
      publicOrigin,
      confirmationEmailStatus: "pending",
    })
    .onConflictDoNothing({
      target: [sectorFollowsTable.sectorId, sectorFollowsTable.emailDigest],
    })
    .returning({ id: sectorFollowsTable.id });
  let followId = inserted[0]?.id;
  let already = inserted.length === 0;
  let confirmationEmailStatus: "sent" | "failed" | "not_sent" = "not_sent";

  if (!followId) {
    const [existing] = await db
      .select({
        id: sectorFollowsTable.id,
        emailCiphertext: sectorFollowsTable.emailCiphertext,
        unsubscribedAt: sectorFollowsTable.unsubscribedAt,
        confirmationEmailStatus: sectorFollowsTable.confirmationEmailStatus,
      })
      .from(sectorFollowsTable)
      .where(
        and(
          eq(sectorFollowsTable.sectorId, sectorId),
          eq(sectorFollowsTable.emailDigest, emailDigest),
        ),
      )
      .limit(1);

    if (!existing) {
      res.status(503).json({ error: "We could not save that preference. Please try again." });
      return;
    }

    followId = existing.id;
    confirmationEmailStatus =
      existing.confirmationEmailStatus === "failed" ? "failed" : "not_sent";

    if (existing.unsubscribedAt) {
      const [reactivated] = await db
        .update(sectorFollowsTable)
        .set({
          ...encryptedEmail,
          publicOrigin,
          unsubscribedAt: null,
          subscribedAt: new Date(),
          confirmationEmailStatus: "pending",
          confirmationSentAt: null,
        })
        .where(
          and(
            eq(sectorFollowsTable.id, existing.id),
            isNotNull(sectorFollowsTable.unsubscribedAt),
          ),
        )
        .returning({ id: sectorFollowsTable.id });
      if (reactivated) {
        already = false;
        followId = reactivated.id;
      }
    } else {
      await db
        .update(sectorFollowsTable)
        .set({ ...encryptedEmail, publicOrigin })
        .where(eq(sectorFollowsTable.id, existing.id));
    }
  } else {
    already = false;
  }

  if (!already && followId !== undefined && !areRadarEmailsEnabled()) {
    confirmationEmailStatus = "not_sent";
    await db
      .update(sectorFollowsTable)
      .set({ confirmationEmailStatus: "not_sent" })
      .where(eq(sectorFollowsTable.id, followId));
  } else if (!already && followId !== undefined) {
    try {
      const unsubscribeUrl = createUnsubscribeUrl(
        publicOrigin,
        followId,
        emailDigest,
        secret,
      );
      await sendRadarEmail(
        createFollowConfirmationEmail(
          normalizedEmail,
          RADAR_FOLLOW_SECTORS.find((sector) => sector.id === sectorId)?.name ??
            sectorId,
          unsubscribeUrl,
        ),
      );
      confirmationEmailStatus = "sent";
      await db
        .update(sectorFollowsTable)
        .set({
          confirmationEmailStatus: "sent",
          confirmationSentAt: new Date(),
        })
        .where(eq(sectorFollowsTable.id, followId));
    } catch (error) {
      confirmationEmailStatus = "failed";
      req.log.warn(
        { err: error, followId, sectorId },
        "Unable to send sector follow confirmation email",
      );
      await db
        .update(sectorFollowsTable)
        .set({ confirmationEmailStatus: "failed" })
        .where(eq(sectorFollowsTable.id, followId));
    }
  }

  const [followerCount] = await db
    .select({ value: count() })
    .from(sectorFollowsTable)
    .where(
      and(
        eq(sectorFollowsTable.sectorId, sectorId),
        isNull(sectorFollowsTable.unsubscribedAt),
        isNotNull(sectorFollowsTable.emailCiphertext),
      ),
    );

  res.json(
    CreateFollowResponse.parse({
      ok: true,
      already,
      followers: followerCount?.value ?? 0,
      confirmationEmailStatus,
    }),
  );
});

router.get("/follow/unsubscribe", async (req, res): Promise<void> => {
  const token = getToken(req);
  const followId = getUnsubscribeFollowId(token);
  if (!followId || !token) {
    res
      .status(400)
      .type("html")
      .send(unsubscribePage("Link not valid", "This unsubscribe link is incomplete."));
    return;
  }

  const [follow] = await db
    .select({
      id: sectorFollowsTable.id,
      emailDigest: sectorFollowsTable.emailDigest,
      unsubscribedAt: sectorFollowsTable.unsubscribedAt,
    })
    .from(sectorFollowsTable)
    .where(eq(sectorFollowsTable.id, followId))
    .limit(1);
  if (
    !follow ||
    !process.env.SESSION_SECRET ||
    !isValidUnsubscribeToken(
      token,
      follow.id,
      follow.emailDigest,
      process.env.SESSION_SECRET,
    )
  ) {
    res
      .status(404)
      .type("html")
      .send(unsubscribePage("Link not valid", "This unsubscribe link could not be verified."));
    return;
  }

  if (follow.unsubscribedAt) {
    res
      .type("html")
      .send(unsubscribePage("Already unsubscribed", "You will not receive further email updates for this sector."));
    return;
  }

  res
    .type("html")
    .send(
      unsubscribePage(
        "Unsubscribe from sector updates?",
        "Confirm below to stop receiving email updates for this sector.",
        token,
      ),
    );
});

router.post("/follow/unsubscribe", async (req, res): Promise<void> => {
  const token = getToken(req);
  const followId = getUnsubscribeFollowId(token);
  const secret = process.env.SESSION_SECRET;
  if (!followId || !token || !secret) {
    res
      .status(400)
      .type("html")
      .send(unsubscribePage("Link not valid", "This unsubscribe link could not be verified."));
    return;
  }

  const [follow] = await db
    .select({
      id: sectorFollowsTable.id,
      emailDigest: sectorFollowsTable.emailDigest,
    })
    .from(sectorFollowsTable)
    .where(eq(sectorFollowsTable.id, followId))
    .limit(1);
  if (
    !follow ||
    !isValidUnsubscribeToken(token, follow.id, follow.emailDigest, secret)
  ) {
    res
      .status(404)
      .type("html")
      .send(unsubscribePage("Link not valid", "This unsubscribe link could not be verified."));
    return;
  }

  await db
    .update(sectorFollowsTable)
    .set({ unsubscribedAt: new Date() })
    .where(
      and(
        eq(sectorFollowsTable.id, follow.id),
        isNull(sectorFollowsTable.unsubscribedAt),
      ),
    );
  res
    .type("html")
    .send(unsubscribePage("You’re unsubscribed", "You will not receive further email updates for this sector."));
});

router.post("/signal", async (req, res): Promise<void> => {
  const parsed = CreateSkillSignalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Select one or more valid skill areas." });
    return;
  }

  const skills = [...new Set(parsed.data.skills)].filter((id) =>
    validSkillIds.has(id),
  );
  if (skills.length === 0) {
    res.status(400).json({ error: "Select one or more valid skill areas." });
    return;
  }

  await db.insert(skillSignalsTable).values({ skillIds: skills });
  res.json(CreateSkillSignalResponse.parse({ ok: true }));
});

export default router;