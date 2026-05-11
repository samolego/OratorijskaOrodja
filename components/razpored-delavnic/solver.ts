export interface Workshop {
  name: string;
  cap: number;
  age: "/" | "m" | "s";
  dur: 1 | 2;
}

export type AgeGroup = "m" | "s" | "v";

export function isCompat(groupAge: AgeGroup, workshopAge: Workshop["age"]): boolean {
  if (workshopAge === "/") return true;
  if (workshopAge === "m" && groupAge === "s") return false;
  if (workshopAge === "s" && groupAge === "m") return false;
  return true;
}

export function computeGroupAges(
  numGroups: number,
  numKids: number,
  mladsiCount: number,
  starejsiCount: number,
): AgeGroup[] {
  const groupSize = Math.ceil(numKids / numGroups);
  const ages: AgeGroup[] = [];
  for (let g = 0; g < numGroups; g++) {
    const start = g * groupSize;
    if (start + groupSize <= mladsiCount) ages.push("m");
    else if (start >= numKids - starejsiCount) ages.push("s");
    else ages.push("v");
  }
  return ages;
}

/**
 * Solver v3 — ločeno obravnava 1h in 2h delavnice.
 *
 * Omejitve:
 *  1. Vsaka skupina vidi vsako kompatibilno delavnico vsaj 1× v D dneh
 *  2. Vsaka skupina ima vsak dan vsaj MIN_1H (3) enournih delavnic
 *  3. Vsaka skupina ima max MAX_2H (2) dvournih delavnic na dan
 *  4. Na vsako delavnico pride max maxGpd skupin na dan (kapaciteta)
 *  5. Razporeditev je čim bolj uravnotežena po dnevih
 */
export function solve(
  workshops: Workshop[],
  numGroups: number,
  numDays: number,
  groupAges: AgeGroup[],
  attempts: number = 400,
): number[][] {
  const W = workshops.length;
  const MIN_1H = 3;
  const MAX_2H = 2;

  const maxGpd = workshops.map((w) => {
    const eff = w.dur === 1 ? w.cap * 2 : w.cap;
    return Math.max(Math.ceil(numGroups / numDays), Math.ceil(eff / 2));
  });

  const pairs1h: [number, number][] = [];
  const pairs2h: [number, number][] = [];
  for (let g = 0; g < numGroups; g++) {
    for (let w = 0; w < W; w++) {
      if (isCompat(groupAges[g], workshops[w].age)) {
        if (workshops[w].dur === 1) pairs1h.push([g, w]);
        else pairs2h.push([g, w]);
      }
    }
  }

  let best: number[][] | null = null;
  let bestScore = Infinity;

  for (let att = 0; att < attempts; att++) {
    // Fisher-Yates shuffle
    for (let i = pairs1h.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [pairs1h[i], pairs1h[j]] = [pairs1h[j], pairs1h[i]];
    }
    for (let i = pairs2h.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [pairs2h[i], pairs2h[j]] = [pairs2h[j], pairs2h[i]];
    }

    const g1h = Array.from({ length: numGroups }, () => new Array(numDays).fill(0));
    const g2h = Array.from({ length: numGroups }, () => new Array(numDays).fill(0));
    const wpd = Array.from({ length: W }, () => new Array(numDays).fill(0));
    const mx = Array.from({ length: numGroups }, () => new Array(W).fill(0));

    // Pass 1: 1h workshops
    for (const [g, w] of pairs1h) {
      let bd = -1, bs = Infinity;
      for (let d = 0; d < numDays; d++) {
        if (wpd[w][d] >= maxGpd[w]) continue;
        const sc = g1h[g][d] * 5 + wpd[w][d];
        if (sc < bs) { bs = sc; bd = d; }
      }
      if (bd === -1) {
        let mn = Infinity;
        for (let d = 0; d < numDays; d++) {
          if (wpd[w][d] < mn) { mn = wpd[w][d]; bd = d; }
        }
      }
      mx[g][w] = bd + 1;
      g1h[g][bd]++;
      wpd[w][bd]++;
    }

    // Pass 2: 2h workshops
    for (const [g, w] of pairs2h) {
      let bd = -1, bs = Infinity;
      for (let d = 0; d < numDays; d++) {
        if (wpd[w][d] >= maxGpd[w]) continue;
        if (g2h[g][d] >= MAX_2H) continue;
        const tot = g1h[g][d] + g2h[g][d];
        const sc = tot * 3 + g2h[g][d] * 10 + wpd[w][d];
        if (sc < bs) { bs = sc; bd = d; }
      }
      if (bd === -1) {
        let mn = Infinity;
        for (let d = 0; d < numDays; d++) {
          const v = g2h[g][d] * 100 + wpd[w][d];
          if (v < mn) { mn = v; bd = d; }
        }
      }
      mx[g][w] = bd + 1;
      g2h[g][bd]++;
      wpd[w][bd]++;
    }

    // Score
    let score = 0;
    for (let g = 0; g < numGroups; g++) {
      const tp: number[] = [];
      for (let d = 0; d < numDays; d++) tp.push(g1h[g][d] + g2h[g][d]);
      score += (Math.max(...tp) - Math.min(...tp)) ** 2;
      for (let d = 0; d < numDays; d++) {
        if (g1h[g][d] < MIN_1H) score += (MIN_1H - g1h[g][d]) * 50;
      }
    }
    for (let w = 0; w < W; w++) {
      score += (Math.max(...wpd[w]) - Math.min(...wpd[w])) ** 2;
    }

    if (score < bestScore) {
      bestScore = score;
      best = mx.map((r) => [...r]);
    }
  }

  return best!;
}

export interface VerifyResult {
  ok: boolean;
  missingPairs: [number, number][];
  groupCounts: number[][];
  groupCounts1h: number[][];
  groupCounts2h: number[][];
  workshopCounts: number[][];
}

export function verify(
  matrix: number[][],
  workshops: Workshop[],
  numGroups: number,
  numDays: number,
  groupAges: AgeGroup[],
): VerifyResult {
  const W = workshops.length;
  const result: VerifyResult = {
    ok: true,
    missingPairs: [],
    groupCounts: [],
    groupCounts1h: [],
    groupCounts2h: [],
    workshopCounts: [],
  };

  for (let g = 0; g < numGroups; g++) {
    const pd = new Array(numDays).fill(0);
    const p1 = new Array(numDays).fill(0);
    const p2 = new Array(numDays).fill(0);
    for (let w = 0; w < W; w++) {
      if (!isCompat(groupAges[g], workshops[w].age)) continue;
      if (matrix[g][w] === 0) {
        result.ok = false;
        result.missingPairs.push([g, w]);
      } else {
        const d = matrix[g][w] - 1;
        pd[d]++;
        if (workshops[w].dur === 1) p1[d]++;
        else p2[d]++;
      }
    }
    result.groupCounts.push(pd);
    result.groupCounts1h.push(p1);
    result.groupCounts2h.push(p2);
  }

  for (let w = 0; w < W; w++) {
    const pd = new Array(numDays).fill(0);
    for (let g = 0; g < numGroups; g++) {
      if (matrix[g][w] > 0) pd[matrix[g][w] - 1]++;
    }
    result.workshopCounts.push(pd);
  }

  return result;
}
