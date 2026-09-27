import type { DemoIndustryId } from './demoRadar';

export type IndustryProjection = {
  industryCategory: string;
  geography: string;
  baseYear: number;
  projectedYear: number;
  netChangeJobs: number;
  percentChange: number;
  coverage: 'broad-industry' | 'related-subsector';
  scope: string;
};

export const BLS_PROJECTION_SOURCE = {
  name: 'U.S. Bureau of Labor Statistics',
  title: 'Employment and output by industry',
  url: 'https://www.bls.gov/emp/tables/industry-employment-and-output.htm',
  published: 'August 27, 2026',
  dataset: '2025 National Employment Matrix',
} as const;

export const INDUSTRY_PROJECTIONS = {
  'energy-transition': {
    industryCategory: 'Solar electric power generation',
    geography: 'United States',
    baseYear: 2025,
    projectedYear: 2035,
    netChangeJobs: 26_200,
    percentChange: 152.9,
    coverage: 'related-subsector',
    scope:
      'A narrow related subsector covering solar electric power generation only; it is not a projection for all energy or climate work.',
  },
  'digital-infrastructure': {
    industryCategory: 'Information',
    geography: 'United States',
    baseYear: 2025,
    projectedYear: 2035,
    netChangeJobs: 151_000,
    percentChange: 5.3,
    coverage: 'broad-industry',
    scope:
      'A broad information-services category that includes telecommunications and data processing; it does not measure all technology or digital-infrastructure work.',
  },
  'health-life-sciences': {
    industryCategory: 'Healthcare and social assistance',
    geography: 'United States',
    baseYear: 2025,
    projectedYear: 2035,
    netChangeJobs: 2_249_800,
    percentChange: 9.2,
    coverage: 'broad-industry',
    scope:
      'Covers healthcare and social assistance services, not the full life-sciences sector or all medical research and manufacturing.',
  },
  construction: {
    industryCategory: 'Construction',
    geography: 'United States',
    baseYear: 2025,
    projectedYear: 2035,
    netChangeJobs: 410_700,
    percentChange: 5.0,
    coverage: 'broad-industry',
    scope:
      'Covers construction-industry employment nationally; it is not specific to Houston or to individual construction trades.',
  },
  'advanced-logistics': {
    industryCategory: 'Transportation and warehousing',
    geography: 'United States',
    baseYear: 2025,
    projectedYear: 2035,
    netChangeJobs: 207_300,
    percentChange: 3.1,
    coverage: 'broad-industry',
    scope:
      'Covers transportation and warehousing; it excludes some logistics-related employment in wholesale trade, retail, and utilities.',
  },
  'commercial-space': {
    industryCategory: 'Aerospace product and parts manufacturing',
    geography: 'United States',
    baseYear: 2025,
    projectedYear: 2035,
    netChangeJobs: 57_200,
    percentChange: 10.1,
    coverage: 'broad-industry',
    scope:
      'Aerospace product and parts manufacturing can include government and defense work; it is not a measure of employment across the full aerospace industry.',
  },
} satisfies Record<DemoIndustryId, IndustryProjection>;