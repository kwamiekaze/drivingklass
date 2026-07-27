import { PACKAGES, type Package } from "@/data/packages";

/**
 * Resolve the best-fit package for a proposal based on total driving hours
 * and whether a road test is included.
 *
 * - If a road test is included, choose from the rdtest packages (1hr+rdtest / 2hr+rdtest)
 *   based on total driving hours (1hr for <=1, 2hr for >=2).
 * - Otherwise, choose the smallest standard package whose hour label covers
 *   the requested total. If nothing covers, use the largest available.
 */
export function resolvePackageForProposal(opts: {
  totalHours: number;
  includesRoadTest: boolean;
}): Package {
  const { totalHours, includesRoadTest } = opts;

  if (includesRoadTest) {
    const oneHr = PACKAGES.find(p => p.id === "1hr-rdtest")!;
    const twoHr = PACKAGES.find(p => p.id === "2hr-rdtest")!;
    return totalHours >= 2 ? twoHr : oneHr;
  }

  const standard = PACKAGES
    .filter(p => !p.id.includes("rdtest"))
    .map(p => ({ p, hrs: parseInt(p.id) }))
    .filter(x => Number.isFinite(x.hrs))
    .sort((a, b) => a.hrs - b.hrs);

  const covering = standard.find(x => x.hrs >= totalHours);
  return (covering ?? standard[standard.length - 1]).p;
}

export function sumProposalHours(items: Array<{ duration_minutes: number | string; session_type?: string }>): {
  totalHours: number;
  includesRoadTest: boolean;
} {
  let minutes = 0;
  let includesRoadTest = false;
  for (const it of items) {
    const d = typeof it.duration_minutes === "string" ? parseInt(it.duration_minutes) : it.duration_minutes;
    if (Number.isFinite(d)) minutes += d;
    if (it.session_type === "testing" || it.session_type === "Testing") includesRoadTest = true;
  }
  return { totalHours: minutes / 60, includesRoadTest };
}
