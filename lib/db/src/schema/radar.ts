import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const sectorFollowsTable = pgTable(
  "sector_follows",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sectorId: text("sector_id").notNull(),
    emailDigest: text("email_digest").notNull(),
    emailCiphertext: text("email_ciphertext"),
    emailIv: text("email_iv"),
    emailAuthTag: text("email_auth_tag"),
    publicOrigin: text("public_origin"),
    confirmationEmailStatus: text("confirmation_email_status")
      .notNull()
      .default("not_sent"),
    confirmationSentAt: timestamp("confirmation_sent_at", {
      withTimezone: true,
    }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    subscribedAt: timestamp("subscribed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sector_follows_sector_email_unique").on(
      table.sectorId,
      table.emailDigest,
    ),
    index("sector_follows_sector_idx").on(table.sectorId),
  ],
);

export const sectorUpdatesTable = pgTable(
  "sector_updates",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sectorId: text("sector_id").notNull(),
    period: text("period").notNull(),
    comparisonPeriod: text("comparison_period").notNull(),
    blsIndustry: text("bls_industry").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    scope: text("scope").notNull(),
    employmentThousands: doublePrecision("employment_thousands").notNull(),
    changeThousands: doublePrecision("change_thousands").notNull(),
    changePercent: doublePrecision("change_percent").notNull(),
    preliminary: boolean("preliminary").notNull(),
    sourceUrl: text("source_url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sector_updates_sector_period_unique").on(
      table.sectorId,
      table.period,
    ),
    index("sector_updates_published_idx").on(table.publishedAt),
  ],
);

export const sectorUpdateDeliveriesTable = pgTable(
  "sector_update_deliveries",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    updateId: integer("update_id")
      .notNull()
      .references(() => sectorUpdatesTable.id, { onDelete: "cascade" }),
    followId: integer("follow_id")
      .notNull()
      .references(() => sectorFollowsTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sector_update_deliveries_update_follow_unique").on(
      table.updateId,
      table.followId,
    ),
    index("sector_update_deliveries_status_idx").on(table.status),
  ],
);

export const skillSignalsTable = pgTable(
  "skill_signals",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    skillIds: text("skill_ids").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("skill_signals_created_at_idx").on(table.createdAt)],
);

export type SectorFollow = typeof sectorFollowsTable.$inferSelect;
export type SectorUpdate = typeof sectorUpdatesTable.$inferSelect;
export type SectorUpdateDelivery =
  typeof sectorUpdateDeliveriesTable.$inferSelect;
export type SkillSignal = typeof skillSignalsTable.$inferSelect;