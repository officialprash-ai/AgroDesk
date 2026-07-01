// Canonical tractor brand catalog shared by the seed script and the
// onboarding "brands you sell" step. Kept in one place so the two never
// drift, and so the onboarding route can self-heal (see routes/onboarding.ts)
// if the brands table is ever empty in an environment where seeding wasn't run.
export const TRACTOR_BRANDS = [
  'Mahindra', 'Swaraj', 'John Deere', 'Sonalika', 'Eicher', 'TAFE',
  'Massey Ferguson', 'New Holland', 'Kubota', 'Force Motors', 'Farmtrac',
  'Powertrac', 'Escorts', 'VST Shakti', 'Preet', 'Indo Farm', 'Captain',
];
