import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { ReplitConnectors } from "@replit/connectors-sdk";
import type { Request } from "express";

const DEFAULT_FROM =
  "Houston Workforce Radar <updates@sheignitesociety.com>";

type EncryptedEmail = {
  emailCiphertext: string;
  emailIv: string;
  emailAuthTag: string;
};

export type RadarEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl?: string;
};

export type SectorUpdateEmailContent = {
  to: string;
  sectorName: string;
  period: string;
  summary: string;
  scope: string;
  sourceUrl: string;
  preliminary: boolean;
  unsubscribeUrl: string;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createEmailDigest(email: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(normalizeEmail(email))
    .digest("hex");
}

function deriveEncryptionKey(secret: string): Buffer {
  return createHmac("sha256", secret)
    .update("houston-workforce-radar/email-encryption/v1")
    .digest();
}

export function encryptEmail(email: string, secret: string): EncryptedEmail {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    deriveEncryptionKey(secret),
    iv,
  );
  const ciphertext = Buffer.concat([
    cipher.update(normalizeEmail(email), "utf8"),
    cipher.final(),
  ]);

  return {
    emailCiphertext: ciphertext.toString("base64"),
    emailIv: iv.toString("base64"),
    emailAuthTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptEmail(
  encrypted: Pick<
    EncryptedEmail,
    "emailCiphertext" | "emailIv" | "emailAuthTag"
  >,
  secret: string,
): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveEncryptionKey(secret),
    Buffer.from(encrypted.emailIv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(encrypted.emailAuthTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.emailCiphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function createUnsubscribeToken(
  followId: number,
  emailDigest: string,
  secret: string,
): string {
  const signature = createHmac("sha256", secret)
    .update(`houston-workforce-radar/unsubscribe/v1:${followId}:${emailDigest}`)
    .digest("base64url");
  return `${followId}.${signature}`;
}

export function getUnsubscribeFollowId(token: string): number | null {
  const match = /^([1-9]\d*)\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return null;
  const followId = Number(match[1]);
  return Number.isSafeInteger(followId) ? followId : null;
}

export function isValidUnsubscribeToken(
  token: string,
  followId: number,
  emailDigest: string,
  secret: string,
): boolean {
  const tokenFollowId = getUnsubscribeFollowId(token);
  if (tokenFollowId !== followId) return false;
  const signature = token.split(".")[1];
  if (!signature) return false;
  const expected = Buffer.from(
    createHmac("sha256", secret)
      .update(
        `houston-workforce-radar/unsubscribe/v1:${followId}:${emailDigest}`,
      )
      .digest("base64url"),
    "base64url",
  );
  const supplied = Buffer.from(signature, "base64url");
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

export function getRequestPublicOrigin(req: Request): string {
  const host = req.get("host");
  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
    throw new Error("A valid public host is required for unsubscribe links.");
  }

  const forwardedProtocol = req
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim()
    .toLowerCase();
  const protocol =
    forwardedProtocol === "https" || req.secure ? "https" : "http";
  return `${protocol}://${host}`;
}

export function createUnsubscribeUrl(
  publicOrigin: string,
  followId: number,
  emailDigest: string,
  secret: string,
): string {
  const parsedOrigin = new URL(publicOrigin);
  if (
    !["http:", "https:"].includes(parsedOrigin.protocol) ||
    parsedOrigin.username ||
    parsedOrigin.password
  ) {
    throw new Error("A valid public origin is required for unsubscribe links.");
  }
  const token = createUnsubscribeToken(followId, emailDigest, secret);
  return `${parsedOrigin.origin}/api/follow/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

function emailLayout(
  heading: string,
  content: string,
  unsubscribeUrl: string,
  sectorName: string,
): string {
  const year = new Date().getFullYear();
  return `<div style="margin:0 auto;max-width:620px;padding:32px 24px;color:#17212b;font-family:Arial,sans-serif;line-height:1.6">
    <p style="margin:0 0 20px;color:#39716b;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Houston Workforce Radar</p>
    <h1 style="margin:0 0 20px;font-size:28px;line-height:1.2">${escapeHtml(heading)}</h1>
    ${content}
    <hr style="margin:28px 0;border:0;border-top:1px solid #d9e0df" />
    <p style="font-size:12px;color:#53605f">Your email address is used only to send Houston Workforce Radar updates about ${escapeHtml(sectorName)}, the sector you followed. It is not used for workforce research or other marketing, and it is not shown publicly.</p>
    <p style="font-size:12px"><a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe from this sector</a></p>
    <p style="font-size:11px;color:#687372">© ${year} SheIgnite Society LLC. All rights reserved.</p>
  </div>`;
}

export function createFollowConfirmationEmail(
  to: string,
  sectorName: string,
  unsubscribeUrl: string,
): RadarEmail {
  const safeSectorName = escapeHtml(sectorName);
  const html = emailLayout(
    `You’re following ${sectorName}`,
    `<p>You’re now following <strong>${safeSectorName}</strong> on Houston Workforce Radar. While your opt-in is active, we’ll email you source-backed updates about this sector when available.</p>`,
    unsubscribeUrl,
    sectorName,
  );
  const year = new Date().getFullYear();

  return {
    to,
    subject: `You’re following ${sectorName} | Houston Workforce Radar`,
    html,
    text: `You’re now following ${sectorName} on Houston Workforce Radar. While your opt-in is active, we’ll email you source-backed updates about this sector when available.\n\nYour email address is used only to send Houston Workforce Radar updates about ${sectorName}, the sector you followed. It is not used for workforce research or other marketing, and it is not shown publicly.\n\nUnsubscribe from this sector: ${unsubscribeUrl}\n\n© ${year} SheIgnite Society LLC. All rights reserved.`,
    unsubscribeUrl,
  };
}

export function createSectorUpdateEmail(
  update: SectorUpdateEmailContent,
): RadarEmail {
  const html = emailLayout(
    `${update.sectorName}: ${update.period}`,
    `<p>${escapeHtml(update.summary)}</p>
    <p><strong>What this measures:</strong> ${escapeHtml(update.scope)}</p>
    ${update.preliminary ? "<p><strong>Preliminary:</strong> BLS marks the latest month preliminary.</p>" : ""}
    <p><a href="${escapeHtml(update.sourceUrl)}">View the Bureau of Labor Statistics source</a></p>`,
    update.unsubscribeUrl,
    update.sectorName,
  );
  const year = new Date().getFullYear();

  return {
    to: update.to,
    subject: `${update.sectorName}: ${update.period} employment update`,
    html,
    text: `${update.summary}\n\nWhat this measures: ${update.scope}${update.preliminary ? "\n\nBLS marks the latest month preliminary." : ""}\n\nBureau of Labor Statistics source: ${update.sourceUrl}\n\nYour email address is used only to send Houston Workforce Radar updates about ${update.sectorName}, the sector you followed. It is not used for workforce research or other marketing, and it is not shown publicly.\n\nUnsubscribe from this sector: ${update.unsubscribeUrl}\n\n© ${year} SheIgnite Society LLC. All rights reserved.`,
    unsubscribeUrl: update.unsubscribeUrl,
  };
}

export function areRadarEmailsEnabled(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.RADAR_ALLOW_PREVIEW_EMAILS === "true"
  );
}

export async function sendRadarEmail(email: RadarEmail): Promise<void> {
  if (!areRadarEmailsEnabled()) {
    throw new Error("Sector email delivery is disabled outside production.");
  }
  if (
    process.env.NODE_ENV !== "production" &&
    (!process.env.RADAR_PREVIEW_RECIPIENT ||
      normalizeEmail(email.to) !==
        normalizeEmail(process.env.RADAR_PREVIEW_RECIPIENT))
  ) {
    throw new Error("Preview email recipient is not allowlisted.");
  }

  const from = process.env.RADAR_FROM_EMAIL?.trim() || DEFAULT_FROM;
  const connectors = new ReplitConnectors();
  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(email.unsubscribeUrl
        ? {
            headers: {
              "List-Unsubscribe": `<${email.unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }
        : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend responded with HTTP ${response.status}.`);
  }
}