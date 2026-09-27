export type SignalStatus = 'Growing' | 'Steady' | 'Watch';

export type DemoIndustryId =
  | 'energy-transition'
  | 'digital-infrastructure'
  | 'health-life-sciences'
  | 'construction'
  | 'advanced-logistics'
  | 'commercial-space';

export type DemoIndustry = {
  id: DemoIndustryId;
  name: string;
  status: SignalStatus;
  x: number;
  y: number;
  color: string;
  synonyms: string[];
  connectionExplanation: string;
  additionalRequirements: string;
};

export const DEMO_INDUSTRIES: DemoIndustry[] = [
  {
    id: 'energy-transition',
    name: 'Energy & Climate',
    status: 'Growing',
    x: 30,
    y: 28,
    color: 'hsl(175 80% 53%)',
    synonyms: ['energy', 'energy transition', 'hydrogen', 'carbon', 'sustainability', 'renewable energy', 'renewables', 'environment', 'climate', 'compliance', 'regulatory compliance', 'risk management', 'oil and gas', 'emissions', 'safety management'],
    connectionExplanation: 'These strengths can support work that plans, builds, or manages lower-carbon energy and environmental projects.',
    additionalRequirements: 'Depending on the role, employers may also ask for energy-sector or regulatory experience, safety training, or specialized technical tools.',
  },
  {
    id: 'digital-infrastructure',
    name: 'Technology & Digital Infrastructure',
    status: 'Growing',
    x: 70,
    y: 31,
    color: 'hsl(39 92% 61%)',
    synonyms: ['technology', 'tech', 'digital infrastructure', 'digital technology', 'information technology', 'it support', 'data', 'data analysis', 'analytics', 'cybersecurity', 'cyber security', 'systems', 'cloud', 'engineering', 'software', 'software development', 'technical support', 'troubleshooting', 'communication', 'problem solving'],
    connectionExplanation: 'These strengths can contribute to building, supporting, or operating software, networks, data systems, and other digital services.',
    additionalRequirements: 'Depending on the role, employers may also ask for hands-on experience with specific systems, networking or cloud tools, or industry certifications.',
  },
  {
    id: 'health-life-sciences',
    name: 'Health & life sciences',
    status: 'Steady',
    x: 76,
    y: 63,
    color: 'hsl(281 62% 71%)',
    synonyms: ['health', 'healthcare', 'patient', 'clinical', 'medical', 'life sciences', 'science', 'patient care', 'patient advocacy', 'care coordination', 'teaching', 'teacher', 'instruction', 'training', 'clinical research', 'medical billing', 'healthcare administration', 'customer service'],
    connectionExplanation: 'These strengths can be useful in work supporting patient care, clinical or life-science teams, and health-service operations.',
    additionalRequirements: 'Depending on the role, employers may also require clinical credentials, privacy training, or experience with specialized care or research systems.',
  },
  {
    id: 'construction',
    name: 'Construction',
    status: 'Growing',
    x: 38,
    y: 75,
    color: 'hsl(12 82% 67%)',
    synonyms: ['construction', 'construction industry', 'construction management', 'commercial construction', 'general contracting', 'contractor', 'building', 'building maintenance', 'carpentry', 'electrical', 'plumbing', 'welding', 'estimating', 'blueprint reading', 'site management', 'safety management', 'project management', 'project manager', 'project coordination', 'people management', 'team management', 'manager', 'leadership', 'team leadership', 'facilities management', 'finance', 'financial analysis', 'budgeting', 'financial planning', 'relationship building'],
    connectionExplanation: 'These strengths can support building, renovating, or managing construction projects and work sites.',
    additionalRequirements: 'Depending on the role, employers may ask for trade-specific experience or licenses, safety training, equipment experience, or the ability to read plans and follow building codes.',
  },
  {
    id: 'advanced-logistics',
    name: 'Advanced logistics',
    status: 'Steady',
    x: 17,
    y: 58,
    color: 'hsl(145 57% 63%)',
    synonyms: ['logistics', 'supply chain', 'inventory', 'inventory management', 'inventory control', 'operations', 'warehouse', 'shipping', 'distribution', 'dispatch', 'procurement', 'vendor management', 'process improvement', 'problem solving', 'relationship building', 'customer service'],
    connectionExplanation: 'These strengths can help move, track, and coordinate goods, inventory, suppliers, and day-to-day operations.',
    additionalRequirements: 'Depending on the role, employers may also ask for experience with warehouse or transport systems, safety training, or role-specific licenses.',
  },
  {
    id: 'commercial-space',
    name: 'Aerospace',
    status: 'Watch',
    x: 53,
    y: 16,
    color: 'hsl(205 88% 70%)',
    synonyms: ['space', 'aerospace', 'nasa', 'satellite', 'aviation', 'research', 'quality assurance', 'quality control', 'program management', 'aerospace engineering', 'mission operations'],
    connectionExplanation: 'These strengths can contribute to aerospace, satellite, and mission-related programs, where teams coordinate research, quality, and technical operations.',
    additionalRequirements: 'Depending on the role, employers may also ask for aerospace domain experience, familiarity with quality standards, security clearance, or specialized technical tools.',
  },
];

const TRANSFERABLE_SKILL_THEMES = [
  { label: 'People & service', synonyms: ['communication', 'customer service', 'client service', 'sales', 'relationship building', 'relationship management', 'customer relations', 'client relations', 'patient care', 'patient advocacy', 'stakeholder engagement', 'teaching', 'teacher', 'instruction', 'training', 'facilitation', 'coaching', 'conflict resolution', 'public speaking', 'negotiation'] },
  { label: 'Leadership & coordination', synonyms: ['leadership', 'team leadership', 'management', 'manager', 'people management', 'staff management', 'team management', 'project management', 'project manager', 'project coordination', 'program management', 'team lead', 'supervisor', 'supervision', 'team coordination', 'organizing teams'] },
  { label: 'Analysis & planning', synonyms: ['analysis', 'analytical', 'financial analysis', 'data analysis', 'business analysis', 'research', 'budgeting', 'forecasting', 'planning', 'strategic planning', 'risk management', 'problem solving', 'critical thinking', 'financial planning'] },
  { label: 'Operations & delivery', synonyms: ['operations', 'process improvement', 'workflow management', 'inventory management', 'supply chain', 'procurement', 'scheduling', 'organization', 'organized', 'administrative support', 'administrative coordination', 'office administration', 'care coordination', 'project delivery', 'quality assurance', 'logistics', 'dispatch', 'vendor management'] },
  { label: 'Digital & technical', synonyms: ['technology', 'tech', 'software', 'software development', 'it support', 'information technology', 'technical support', 'data', 'cybersecurity', 'cloud', 'systems', 'engineering', 'troubleshooting', 'automation', 'excel'] },
];

function normalizedWords(value: string) {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function normalizeSkill(value: string) {
  return normalizedWords(value).join(' ');
}

function phraseMatches(input: string, alias: string) {
  const words = normalizedWords(input);
  const phrase = normalizedWords(alias);
  if (phrase.length === 1 && ['management', 'manager'].includes(phrase[0]) && words.length > 1) return false;
  return words.some((_, start) => phrase.every((word, offset) => words[start + offset] === word));
}

export function findTransferableThemes(inputs: string[]): string[] {
  return TRANSFERABLE_SKILL_THEMES
    .filter((theme) => theme.synonyms.some((synonym) => inputs.some((input) => phraseMatches(input, synonym))))
    .map((theme) => theme.label);
}

export function findConnection(inputs: string[]): { industry: DemoIndustry; strength: 'Strong connection' | 'Moderate connection' | 'Potential connection'; matchedSkills: string[] } | null {
  const distinctInputs = inputs
    .map((input) => input.trim())
    .filter((input, index, all) => {
      const normalized = normalizeSkill(input);
      return normalized.length > 0 &&
        all.findIndex((candidate) => normalizeSkill(candidate) === normalized) === index;
    });
  const matches = DEMO_INDUSTRIES.map((industry) => ({
    industry,
    matchedSkills: distinctInputs.filter((input) =>
      industry.synonyms.some((synonym) => phraseMatches(input, synonym)),
    ),
  }))
    .filter((item) => item.matchedSkills.length > 0)
    .sort((a, b) => b.matchedSkills.length - a.matchedSkills.length);
  if (!matches.length) return null;
  const winner = matches[0];
  if (matches[1]?.matchedSkills.length === winner.matchedSkills.length) return null;
  return {
    industry: winner.industry,
    strength: winner.matchedSkills.length >= 2
      ? 'Strong connection'
      : winner.industry.status === 'Watch'
        ? 'Potential connection'
        : 'Moderate connection',
    matchedSkills: winner.matchedSkills,
  };
}