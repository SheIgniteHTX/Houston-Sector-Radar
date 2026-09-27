const BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
const BLS_SOURCE_NAME =
  "U.S. Bureau of Labor Statistics · Current Employment Statistics (CES)";
const HOUSTON_AREA_NAME = "Houston-The Woodlands-Sugar Land, TX MSA";
export const BLS_SOURCE_URL =
  "https://www.bls.gov/regions/southwest/data/employmentandunemploymentandwages_houston_table.htm";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type EmploymentTrend = {
  period: string;
  comparisonPeriod: string;
  employmentThousands: number;
  changeThousands: number;
  changePercent: number;
  preliminary: boolean;
};

type EmploymentPoint = {
  year: number;
  month: number;
  employmentThousands: number;
  preliminary: boolean;
};

type SeriesDefinition = {
  seriesId: string;
  category: string;
  naics: string;
  radarIndustryId: string;
  radarIndustryName: string;
  limitation: string;
};

const METRO_SERIES_ID = "SMU48264200000000001";
const INDUSTRY_SERIES: SeriesDefinition[] = [
  {
    radarIndustryId: "construction",
    radarIndustryName: "Construction",
    seriesId: "SMU48264202023700001",
    category: "Heavy and civil engineering construction",
    naics: "NAICS 237",
    limitation:
      "This is a construction subsector focused on heavy and civil engineering; it does not represent all construction employment, individual trades, or project purpose.",
  },
  {
    radarIndustryId: "advanced-logistics",
    radarIndustryName: "Advanced logistics",
    seriesId: "SMU48264204300000001",
    category: "Transportation and warehousing",
    naics: "NAICS 48–49",
    limitation:
      "This category covers transportation and warehousing payroll jobs; it does not capture supply-chain work in other industries or distinguish advanced logistics roles.",
  },
  {
    radarIndustryId: "health-life-sciences",
    radarIndustryName: "Health & life sciences",
    seriesId: "SMU48264206562000001",
    category: "Health care and social assistance",
    naics: "NAICS 62",
    limitation:
      "This category covers health care and social assistance, not life-sciences research, biotechnology, or education.",
  },
];

type EmploymentSource = {
  category: string;
  seriesId: string;
  sourceName: string;
  sourceUrl: string;
  limitation: string;
};

type HoustonIndustryEmploymentTrend = EmploymentSource & {
  radarIndustryId: string;
  radarIndustryName: string;
  naics: string;
  trend: EmploymentTrend;
};

type HoustonEmploymentResponse = {
  metro: EmploymentSource & { trend: EmploymentTrend };
  industries: HoustonIndustryEmploymentTrend[];
};

let cached:
  | { data: HoustonEmploymentResponse; expiresAt: number }
  | undefined;
let pendingRequest: Promise<HoustonEmploymentResponse> | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEmploymentPoint(value: unknown): EmploymentPoint | null {
  if (!isRecord(value)) return null;

  const year = Number(value.year);
  const period =
    typeof value.period === "string" ? /^M(0[1-9]|1[0-2])$/.exec(value.period) : null;
  const employmentThousands =
    typeof value.value === "string" ? Number(value.value) : Number.NaN;

  if (
    !Number.isInteger(year) ||
    !period ||
    !Number.isFinite(employmentThousands) ||
    employmentThousands <= 0
  ) {
    return null;
  }

  const footnotes = Array.isArray(value.footnotes) ? value.footnotes : [];
  return {
    year,
    month: Number(period[1]),
    employmentThousands,
    preliminary: footnotes.some(
      (footnote) => isRecord(footnote) && footnote.code === "P",
    ),
  };
}

function formatPeriod(point: EmploymentPoint): string {
  return `${MONTH_NAMES[point.month]} ${point.year}`;
}

function calculateTrend(
  series: Record<string, unknown>,
  seriesId: string,
): EmploymentTrend {
  if (!Array.isArray(series.data)) {
    throw new Error(`BLS returned no data for series ${seriesId}.`);
  }

  const points = series.data
    .map(parseEmploymentPoint)
    .filter((point): point is EmploymentPoint => point !== null);
  const pointsByPeriod = new Map(
    points.map((point) => [`${point.year}-${point.month}`, point]),
  );
  const latestComparablePoint = [...points]
    .sort((left, right) => right.year - left.year || right.month - left.month)
    .find((point) => pointsByPeriod.has(`${point.year - 1}-${point.month}`));

  if (!latestComparablePoint) {
    throw new Error(
      `BLS has no same-month prior-year comparison for series ${seriesId}.`,
    );
  }

  const comparisonPoint = pointsByPeriod.get(
    `${latestComparablePoint.year - 1}-${latestComparablePoint.month}`,
  );
  if (!comparisonPoint) {
    throw new Error(
      `BLS has no same-month prior-year comparison for series ${seriesId}.`,
    );
  }

  const changeThousands = Number(
    (
      latestComparablePoint.employmentThousands -
      comparisonPoint.employmentThousands
    ).toFixed(1),
  );

  return {
    period: formatPeriod(latestComparablePoint),
    comparisonPeriod: formatPeriod(comparisonPoint),
    employmentThousands: latestComparablePoint.employmentThousands,
    changeThousands,
    changePercent: Number(
      (
        ((latestComparablePoint.employmentThousands -
          comparisonPoint.employmentThousands) /
          comparisonPoint.employmentThousands) *
        100
      ).toFixed(1),
    ),
    preliminary: latestComparablePoint.preliminary,
  };
}

function sourceFor(
  seriesId: string,
  category: string,
  limitation: string,
): EmploymentSource {
  return {
    category,
    seriesId,
    sourceName: `${BLS_SOURCE_NAME} · ${HOUSTON_AREA_NAME}`,
    sourceUrl: `https://data.bls.gov/timeseries/${seriesId}`,
    limitation,
  };
}

async function fetchHoustonEmploymentTrends(): Promise<HoustonEmploymentResponse> {
  const currentYear = new Date().getFullYear();
  const seriesIds = [
    METRO_SERIES_ID,
    ...INDUSTRY_SERIES.map((definition) => definition.seriesId),
  ];
  const response = await fetch(BLS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seriesid: seriesIds,
      startyear: String(currentYear - 2),
      endyear: String(currentYear),
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`BLS returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || payload.status !== "REQUEST_SUCCEEDED") {
    throw new Error("BLS did not return a successful data response.");
  }

  const results = payload.Results;
  if (!isRecord(results) || !Array.isArray(results.series)) {
    throw new Error("BLS returned an unexpected response shape.");
  }

  const seriesById = new Map<string, Record<string, unknown>>();
  for (const item of results.series) {
    if (isRecord(item) && typeof item.seriesID === "string") {
      seriesById.set(item.seriesID, item);
    }
  }

  const metroSeries = seriesById.get(METRO_SERIES_ID);
  if (!metroSeries) {
    throw new Error("BLS did not return the Houston metro nonfarm series.");
  }

  const metro: HoustonEmploymentResponse["metro"] = {
    ...sourceFor(
      METRO_SERIES_ID,
      "Total nonfarm employment",
      "Metro-wide payroll employment across industries; it is not a sector-specific estimate, job openings count, or forecast.",
    ),
    trend: calculateTrend(metroSeries, METRO_SERIES_ID),
  };

  const industries = INDUSTRY_SERIES.map((definition) => {
    const series = seriesById.get(definition.seriesId);
    if (!series) {
      throw new Error(
        `BLS did not return the configured Houston industry series ${definition.seriesId}.`,
      );
    }

    return {
      ...sourceFor(
        definition.seriesId,
        definition.category,
        definition.limitation,
      ),
      radarIndustryId: definition.radarIndustryId,
      radarIndustryName: definition.radarIndustryName,
      naics: definition.naics,
      trend: calculateTrend(series, definition.seriesId),
    };
  });

  return { metro, industries };
}

export function getHoustonEmploymentTrends(): Promise<HoustonEmploymentResponse> {
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.data);
  }

  if (!pendingRequest) {
    pendingRequest = fetchHoustonEmploymentTrends()
      .then((data) => {
        cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };
        return data;
      })
      .finally(() => {
        pendingRequest = undefined;
      });
  }

  return pendingRequest;
}

type LegacyIndustryEmploymentTrend = EmploymentTrend & {
  radarIndustryId: string;
  blsIndustry: string;
  scope: string;
};

type LegacyHoustonEmploymentTrend = EmploymentTrend & {
  industryTrends: LegacyIndustryEmploymentTrend[];
};

// Keep the existing sector-update publisher working while the public scan API
// uses the richer metro/industries response shape.
export async function getHoustonEmploymentTrend(): Promise<LegacyHoustonEmploymentTrend> {
  const data = await getHoustonEmploymentTrends();
  return {
    ...data.metro.trend,
    industryTrends: data.industries.map((industry) => ({
      ...industry.trend,
      radarIndustryId: industry.radarIndustryId,
      blsIndustry: industry.category,
      scope: industry.limitation,
    })),
  };
}