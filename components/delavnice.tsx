"use client";
import { useMemo, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────
interface Workshop {
  name: string;
  cap: number;
  /** Free-form tag. Empty string = no restriction (matches any group). */
  tag: string;
  dur: 1 | 2;
}

interface Group {
  name: string;
  size: number;
  /** Free-form tag. Empty string = only matches untagged workshops. */
  tag: string;
}

interface SlotRef {
  day: number;
  /** 1 = first hour of the day, 2 = second hour. */
  hour: number;
}

// ─── Colors ───────────────────────────────────────────────────
const DC = [
  "#dbeafe",
  "#d1fae5",
  "#fef3c7",
  "#fce7f3",
  "#e0e7ff",
  "#fae8ff",
  "#ccfbf1",
  "#fee2e2",
];
const DT = [
  "#1e40af",
  "#065f46",
  "#92400e",
  "#9d174d",
  "#4338ca",
  "#7e22ce",
  "#134e4a",
  "#991b1b",
];

const TAB_ITEMS: [string, string][] = [
  ["input", "Vnos"],
  ["data", "Podatki"],
  ["summary", "Glavna matrika"],
  ["details", "Podrobno"],
  ["stats", "Statistika"],
];

// ─── Compatibility ────────────────────────────────────────────
/**
 * Tag matching rules:
 *  - Workshop with no tag → matches any group
 *  - Workshop with a tag → only groups with the same tag can attend
 *  - Group with no tag → can only attend untagged workshops
 */
function isCompat(groupTag: string, workshopTag: string): boolean {
  if (workshopTag === "") return true;
  if (groupTag === "") return false;
  return groupTag === workshopTag;
}

// ─── TSV Parsing ──────────────────────────────────────────────
function parseWorkshopsTSV(text: string): Workshop[] {
  if (!text.trim()) return [];
  return text
    .trim()
    .split("\n")
    .map((line) => {
      const c = line.split("\t").map((s) => s.trim());
      if (c.length < 2) return null;
      const name = c[0];
      if (!name || name.toLowerCase() === "ime") return null;
      const cap = parseInt(c[1]) || 12;
      let dur: 1 | 2 = 1;
      if (c[2]) {
        const d = c[2].toLowerCase().replace("h", "").trim();
        if (parseInt(d) === 2) dur = 2;
      }
      const tag = c[3]?.trim() ?? "";
      return { name, cap, tag, dur };
    })
    .filter((w): w is Workshop => w !== null);
}

function parseGroupsTSV(text: string): Group[] {
  if (!text.trim()) return [];
  return text
    .trim()
    .split("\n")
    .map((line) => {
      const c = line.split("\t").map((s) => s.trim());
      if (c.length < 2) return null;
      const name = c[0];
      if (!name || name.toLowerCase() === "ime") return null;
      const size = parseInt(c[1]) || 12;
      const tag = c[2]?.trim() ?? "";
      return { name, size, tag };
    })
    .filter((g): g is Group => g !== null);
}

// ─── SA Solver ────────────────────────────────────────────────
function evaluateCost(
  state: number[][][],
  workshops: Workshop[],
  numGroups: number,
  numSlots: number,
  gTags: string[],
): number {
  let cost = 0;
  const W = workshops.length;
  const coverage = Array.from({ length: numGroups }, () =>
    new Array(W).fill(0),
  );

  for (let s = 0; s < numSlots; s++) {
    const occupancy = new Array(W).fill(0);
    for (let g = 0; g < numGroups; g++) {
      for (let w = 0; w < W; w++) {
        const c = state[s][g][w];
        if (c <= 0) continue;

        if (!isCompat(gTags[g], workshops[w].tag)) {
          cost += 1000000;
        }

        occupancy[w] += c;
        coverage[g][w] += c;
        if (c === 1) cost += 1500;
        if (c > 3) cost += (c - 3) * 8000;
      }
    }
    for (let w = 0; w < W; w++) {
      if (occupancy[w] > workshops[w].cap) {
        cost += Math.pow(occupancy[w] - workshops[w].cap, 2) * 100000;
      }
    }
  }

  for (let g = 0; g < numGroups; g++) {
    for (let w = 0; w < W; w++) {
      if (isCompat(gTags[g], workshops[w].tag) && coverage[g][w] === 0) {
        cost += 200000;
      }
    }
  }
  return cost;
}

function optimizeSA(
  initialState: number[][][],
  workshops: Workshop[],
  numGroups: number,
  numDays: number,
  gTags: string[],
  iterations = 100000,
): { bestState: number[][][]; bestCost: number } {
  const W = workshops.length;
  const numSlots = numDays * 2;

  const groupCompatW = gTags.map((tag) =>
    workshops
      .map((w, idx) => (isCompat(tag, w.tag) ? idx : null))
      .filter((idx): idx is number => idx !== null),
  );

  let currentState = initialState.map((s) => s.map((g) => [...g]));
  let currentCost = evaluateCost(
    currentState,
    workshops,
    numGroups,
    numSlots,
    gTags,
  );
  let bestState = currentState.map((s) => s.map((g) => [...g]));
  let bestCost = currentCost;

  let temp = 1000.0;
  const cooling = Math.pow(0.001 / temp, 1 / iterations);

  for (let i = 0; i < iterations; i++) {
    const g = Math.floor(Math.random() * numGroups);
    const d = Math.floor(Math.random() * numDays);
    const h1 = d * 2;
    const h2 = d * 2 + 1;
    const moveCount = Math.random() < 0.8 ? 2 : 1;

    const validW1: number[] = [];
    const validW2: number[] = [];
    for (let w = 0; w < W; w++) {
      if (currentState[h1][g][w] >= moveCount) validW1.push(w);
      if (currentState[h2][g][w] >= moveCount) validW2.push(w);
    }
    if (validW1.length === 0 || validW2.length === 0) continue;

    const oldW1 = validW1[Math.floor(Math.random() * validW1.length)];
    let oldW2: number;

    // STROGO PREVERJANJE: Brisanje bloka 2h ali posamezne 1h delavnice
    if (workshops[oldW1].dur === 2) {
      oldW2 = oldW1;
      if (currentState[h2][g][oldW2] < moveCount) continue;
    } else {
      const valid1hW2 = validW2.filter((w) => workshops[w].dur === 1);
      if (valid1hW2.length === 0) continue;
      oldW2 = valid1hW2[Math.floor(Math.random() * valid1hW2.length)];
    }

    const b1 = currentState[h1][g][oldW1];
    const b2 = currentState[h2][g][oldW2];

    currentState[h1][g][oldW1] -= moveCount;
    currentState[h2][g][oldW2] -= moveCount;

    const possible = groupCompatW[g];
    const possible1h = possible.filter((w) => workshops[w].dur === 1);
    const possible2h = possible.filter((w) => workshops[w].dur === 2);

    let nW1: number, nW2: number;

    // STROGO PREVERJANJE: Dodajanje vedno 2h (v obeh terminih) ali dve 1h (posamično)
    if (
      possible2h.length > 0 &&
      (possible1h.length === 0 || Math.random() < 0.3)
    ) {
      nW1 = possible2h[Math.floor(Math.random() * possible2h.length)];
      nW2 = nW1;
    } else if (possible1h.length > 0) {
      nW1 = possible1h[Math.floor(Math.random() * possible1h.length)];
      nW2 = possible1h[Math.floor(Math.random() * possible1h.length)];
    } else {
      // Revert in nadaljuj
      currentState[h1][g][oldW1] = b1;
      currentState[h2][g][oldW2] = b2;
      continue;
    }

    currentState[h1][g][nW1] += moveCount;
    currentState[h2][g][nW2] += moveCount;

    const newCost = evaluateCost(
      currentState,
      workshops,
      numGroups,
      numSlots,
      gTags,
    );
    if (
      newCost < currentCost ||
      Math.random() < Math.exp((currentCost - newCost) / temp)
    ) {
      currentCost = newCost;
      if (currentCost < bestCost) {
        bestCost = currentCost;
        bestState = currentState.map((s) => s.map((gr) => [...gr]));
      }
    } else {
      currentState[h1][g][nW1] -= moveCount;
      currentState[h2][g][nW2] -= moveCount;
      currentState[h1][g][oldW1] = b1;
      currentState[h2][g][oldW2] = b2;
    }
    temp *= cooling;
  }
  return { bestState, bestCost };
}

// ─── App ──────────────────────────────────────────────────────
export default function Delavnice() {
  const [tab, setTab] = useState("input");
  const [numDays, setNumDays] = useState(4);
  const [iterations, setIterations] = useState(120000);
  const [wsText, setWsText] = useState("");
  const [grText, setGrText] = useState("");
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [state3D, setState3D] = useState<number[][][] | null>(null);
  const [bestCost, setBestCost] = useState<number | null>(null);
  const [solving, setSolving] = useState(false);
  const [toast, setToast] = useState("");

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const applyPaste = () => {
    const ws = parseWorkshopsTSV(wsText);
    const gr = parseGroupsTSV(grText);
    if (ws.length === 0 && gr.length === 0) {
      flash("⚠️ Ni podatkov za parsanje");
      return;
    }
    if (ws.length > 0) setWorkshops(ws);
    if (gr.length > 0) setGroups(gr);
    setState3D(null);
    setTab("data");
    flash(`✅ Razčlenjeno: ${ws.length} delavnic, ${gr.length} skupin`);
  };

  const editWs = (i: number, field: keyof Workshop, val: string) => {
    const next = [...workshops];
    next[i] = {
      ...next[i],
      [field]:
        field === "name" || field === "tag"
          ? val
          : field === "dur"
            ? (parseInt(val) as 1 | 2) || 1
            : parseInt(val) || 0,
    };
    setWorkshops(next);
    setState3D(null);
  };

  const removeWs = (i: number) => {
    setWorkshops(workshops.filter((_, j) => j !== i));
    setState3D(null);
  };
  const addWs = () => {
    setWorkshops([...workshops, { name: "Nova", cap: 12, tag: "", dur: 1 }]);
  };

  const editGr = (i: number, field: keyof Group, val: string) => {
    const next = [...groups];
    next[i] = {
      ...next[i],
      [field]: field === "name" || field === "tag" ? val : parseInt(val) || 0,
    };
    setGroups(next);
    setState3D(null);
  };

  const removeGr = (i: number) => {
    setGroups(groups.filter((_, j) => j !== i));
    setState3D(null);
  };
  const addGr = () => {
    setGroups([...groups, { name: "Skupina", size: 12, tag: "" }]);
  };

  const totalKids = groups.reduce((s, g) => s + g.size, 0);
  const hasData = workshops.length > 0 && groups.length > 0;

  const handleSolve = () => {
    if (!hasData) {
      flash("⚠️ Najprej vnesi delavnice in skupine");
      return;
    }
    setSolving(true);
    setTimeout(() => {
      const W = workshops.length;
      const G = groups.length;
      const numSlots = numDays * 2;
      const gTags = groups.map((g) => g.tag);

      const groupCompatW = gTags.map((tag) =>
        workshops
          .map((w, idx) => (isCompat(tag, w.tag) ? idx : null))
          .filter((idx): idx is number => idx !== null),
      );

      const initial = Array.from({ length: numSlots }, () =>
        Array.from({ length: G }, () => new Array(W).fill(0)),
      );
      for (let g = 0; g < G; g++) {
        const possible = groupCompatW[g];
        if (possible.length === 0) continue;

        const p1h = possible.filter((wIdx) => workshops[wIdx].dur === 1);
        const p2h = possible.filter((wIdx) => workshops[wIdx].dur === 2);

        for (let d = 0; d < numDays; d++) {
          let rem = groups[g].size;
          while (rem > 0) {
            const take = Math.min(rem, 2);

            // STROGO PREVERJANJE: Polnjenje začetne matrike z nezlomljenimi bloki
            if (p2h.length > 0 && (p1h.length === 0 || Math.random() < 0.4)) {
              const wIdx = p2h[Math.floor(Math.random() * p2h.length)];
              initial[d * 2][g][wIdx] += take;
              initial[d * 2 + 1][g][wIdx] += take;
            } else if (p1h.length > 0) {
              const w1 = p1h[Math.floor(Math.random() * p1h.length)];
              const w2 = p1h[Math.floor(Math.random() * p1h.length)];
              initial[d * 2][g][w1] += take;
              initial[d * 2 + 1][g][w2] += take;
            }

            rem -= take;
          }
        }
      }

      const result = optimizeSA(
        initial,
        workshops,
        G,
        numDays,
        gTags,
        iterations,
      );
      setState3D(result.bestState);
      setBestCost(result.bestCost);
      setSolving(false);
      setTab("summary");
      flash(`✅ Razpored generiran!`);
    }, 50);
  };

  /** Returns every slot (day + hour) where a group-workshop pair appears. */
  const getAssignedSlots = (
    groupIndex: number,
    workshopIndex: number,
  ): SlotRef[] => {
    if (!state3D) return [];
    const slots: SlotRef[] = [];
    for (let d = 0; d < numDays; d++) {
      for (let h = 0; h < 2; h++) {
        if (state3D[d * 2 + h][groupIndex][workshopIndex] > 0) {
          slots.push({ day: d + 1, hour: h + 1 });
        }
      }
    }
    return slots;
  };

  /** Unique days (1-based) derived from slot refs, for display. */
  const getUniqueDays = (
    groupIndex: number,
    workshopIndex: number,
  ): number[] => {
    const days = new Set(
      getAssignedSlots(groupIndex, workshopIndex).map((s) => s.day),
    );
    return [...days].sort((a, b) => a - b);
  };

  const buildSlotMatrixText = (slotIndex: number): string => {
    if (!state3D?.[slotIndex]) return "";
    const day = Math.floor(slotIndex / 2) + 1;
    const round = (slotIndex % 2) + 1;
    const lines = [
      `DAN ${day} — ${round}. ura`,
      ["Skupina", ...workshops.map((w) => w.name), "SUM"].join("\t"),
    ];

    for (let g = 0; g < groups.length; g++) {
      const row = state3D[slotIndex][g];
      lines.push(
        [
          groups[g].name,
          ...row.map((value) => value || "·"),
          row.reduce((a, b) => a + b, 0),
        ].join("\t"),
      );
    }

    return lines.join("\n");
  };

  const buildSummaryMatrixText = (): string => {
    if (!state3D) return "";
    const lines = [
      ["Skupina", ...workshops.map((w) => w.name)].join("\t"),
      ...groups.map((group, groupIndex) =>
        [
          group.tag ? `${group.name} (${group.tag})` : group.name,
          ...workshops.map((_, workshopIndex) => {
            const days = getUniqueDays(groupIndex, workshopIndex);
            return days.length > 0
              ? days.map((day) => `D${day}`).join(", ")
              : "·";
          }),
        ].join("\t"),
      ),
    ];
    return lines.join("\n");
  };

  const copyAll = () => {
    if (!state3D) return;
    const text = state3D
      .map((_, sIdx) => buildSlotMatrixText(sIdx))
      .join("\n\n")
      .trim();
    navigator.clipboard.writeText(text).then(() => flash("📋 Kopirano!"));
  };

  const copySummaryMatrix = () => {
    const text = buildSummaryMatrixText();
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => flash("📋 Glavna matrika kopirana!"));
  };

  const copySlotMatrix = (slotIndex: number) => {
    const text = buildSlotMatrixText(slotIndex);
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => flash("📋 Matrika termina kopirana!"));
  };

  const exportMainMatrixAsJson = () => {
    if (!state3D) return;

    const delavnice = workshops.map((w, i) => ({
      id: `w${i + 1}`,
      name: w.name,
      capacity: w.cap,
      duration: w.dur,
      tag: w.tag,
    }));
    const kateheze = groups.map((g, i) => ({
      id: `k${i + 1}`,
      name: g.name,
      size: g.size,
      tag: g.tag,
    }));

    const payload = {
      generatedAt: new Date().toISOString(),
      numDays,
      delavnice,
      kateheze,
      mainMatrix: kateheze.map((group, groupIndex) => ({
        katehezaId: group.id,
        workshops: delavnice.map((workshop, workshopIndex) => ({
          workshopId: workshop.id,
          slots: getAssignedSlots(groupIndex, workshopIndex),
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "glavna-matrika-razporeda.json";
    link.click();
    URL.revokeObjectURL(url);
    flash("💾 JSON izvožen!");
  };

  const capAnalysis = useMemo(() => {
    if (!hasData) return null;
    const cap1h = workshops
      .filter((w) => w.dur === 1)
      .reduce((s, w) => s + w.cap, 0);
    const cap2h = workshops
      .filter((w) => w.dur === 2)
      .reduce((s, w) => s + w.cap, 0);
    const totalPerRound = cap1h + cap2h;
    return {
      cap1h,
      cap2h,
      totalPerRound,
      totalKids,
      surplus: totalPerRound - totalKids,
      pct: ((totalPerRound / totalKids - 1) * 100).toFixed(1),
    };
  }, [workshops, groups, hasData, totalKids]);

  const stats = useMemo(() => {
    if (!state3D || !hasData) return null;
    const G = groups.length;
    const W = workshops.length;
    const numSlots = numDays * 2;
    const coverage = Array.from({ length: G }, () => new Array(W).fill(0));
    const slotSums = Array.from({ length: numSlots }, () => ({
      groups: new Array(G).fill(0),
      ws: new Array(W).fill(0),
    }));

    for (let s = 0; s < numSlots; s++) {
      for (let g = 0; g < G; g++) {
        for (let w = 0; w < W; w++) {
          const c = state3D[s][g][w];
          if (c > 0) {
            coverage[g][w] += c;
            slotSums[s].groups[g] += c;
            slotSums[s].ws[w] += c;
          }
        }
      }
    }
    let missing = 0;
    for (let g = 0; g < G; g++)
      for (let w = 0; w < W; w++)
        if (isCompat(groups[g].tag, workshops[w].tag) && coverage[g][w] === 0)
          missing++;

    let overCap = 0;
    for (let s = 0; s < numSlots; s++)
      for (let w = 0; w < W; w++)
        if (slotSums[s].ws[w] > workshops[w].cap) overCap++;

    return { coverage, slotSums, missing, overCap };
  }, [state3D, workshops, groups, numDays, hasData]);

  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <div>
            <CardTitle className="text-2xl">
              Generator razporeda delavnic
            </CardTitle>
            <CardDescription>
              Vključuje preverjanje kompatibilnosti tagov skupin in delavnic.
            </CardDescription>
          </div>
          {state3D && (
            <CardAction>
              <div className="flex flex-wrap gap-2">
                <Button onClick={copyAll} variant="outline">
                  Kopiraj vse
                </Button>
                <Button onClick={exportMainMatrixAsJson} variant="outline">
                  Izvozi JSON
                </Button>
              </div>
            </CardAction>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <Tabs value={tab} onValueChange={setTab} className="w-full gap-6">
            <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-5">
              {TAB_ITEMS.map(([value, label]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="py-2 text-xs sm:text-sm"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── Vnos ── */}
            <TabsContent value="input" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="tool-panel p-5">
                  <div className="mb-3">
                    <Label htmlFor="workshops-input">Delavnice</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Prilepi TSV s stolpci: ime, kapaciteta, trajanje (1/2h),
                      tag (neobvezno).
                    </p>
                  </div>
                  <Textarea
                    id="workshops-input"
                    className="min-h-[220px] font-mono text-xs leading-6"
                    value={wsText}
                    onChange={(e) => setWsText(e.target.value)}
                    placeholder="Ime&#9;Kapaciteta&#9;Trajanje(1/2)&#9;Tag"
                  />
                </section>

                <section className="tool-panel p-5">
                  <div className="mb-3">
                    <Label htmlFor="groups-input">Skupine</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Prilepi TSV s stolpci: ime, število otrok, tag
                      (neobvezno).
                    </p>
                  </div>
                  <Textarea
                    id="groups-input"
                    className="min-h-[220px] font-mono text-xs leading-6"
                    value={grText}
                    onChange={(e) => setGrText(e.target.value)}
                    placeholder="Ime&#9;Št.otrok&#9;Tag"
                  />
                </section>
              </div>

              <div className="flex justify-end">
                <Button onClick={applyPaste} className="w-full md:w-auto">
                  Razčleni podatke
                </Button>
              </div>
            </TabsContent>

            {/* ── Podatki ── */}
            <TabsContent value="data" className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-2">
                {/* Delavnice table */}
                <section className="tool-panel overflow-hidden">
                  <div className="border-b px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">Delavnice</h3>
                        <p className="text-sm text-muted-foreground">
                          Trenutno vnosov: {workshops.length}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={addWs}>
                        <Plus className="h-4 w-4 mr-1" />
                        Dodaj delavnico
                      </Button>
                    </div>
                  </div>

                  <div className="tool-table-wrapper max-h-[32rem] overflow-auto">
                    <table className="tool-table">
                      <thead>
                        <tr>
                          <th className="tool-table-head">Ime</th>
                          <th className="tool-table-head">Kap.</th>
                          <th className="tool-table-head">Traj.</th>
                          <th className="tool-table-head">Tag</th>
                          <th className="tool-table-head"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {workshops.map((w, i) => (
                          <tr key={i}>
                            <td className="tool-table-cell">
                              <Input
                                value={w.name}
                                onChange={(e) =>
                                  editWs(i, "name", e.target.value)
                                }
                              />
                            </td>
                            <td className="tool-table-cell">
                              <Input
                                type="number"
                                value={w.cap}
                                onChange={(e) =>
                                  editWs(i, "cap", e.target.value)
                                }
                                className="w-20"
                              />
                            </td>
                            <td className="tool-table-cell">
                              <select
                                value={w.dur}
                                onChange={(e) =>
                                  editWs(i, "dur", e.target.value)
                                }
                                className="tool-inline-select w-20"
                              >
                                <option value={1}>1h</option>
                                <option value={2}>2h</option>
                              </select>
                            </td>
                            <td className="tool-table-cell">
                              <Input
                                value={w.tag}
                                onChange={(e) =>
                                  editWs(i, "tag", e.target.value)
                                }
                                placeholder="(vsi)"
                                className="w-24"
                              />
                            </td>
                            <td className="tool-table-cell">
                              <Button
                                onClick={() => removeWs(i)}
                                variant="destructive"
                                size="icon"
                                title="Odstrani"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {workshops.length === 0 && (
                          <tr>
                            <td
                              className="px-3 py-6 text-center text-sm text-muted-foreground"
                              colSpan={5}
                            >
                              Še ni razčlenjenih delavnic.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Skupine table */}
                <section className="tool-panel overflow-hidden">
                  <div className="border-b px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">Skupine</h3>
                        <p className="text-sm text-muted-foreground">
                          Trenutno vnosov: {groups.length}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={addGr}>
                        <Plus className="h-4 w-4 mr-1" />
                        Dodaj skupino
                      </Button>
                    </div>
                  </div>

                  <div className="tool-table-wrapper max-h-[32rem] overflow-auto">
                    <table className="tool-table">
                      <thead>
                        <tr>
                          <th className="tool-table-head">Ime</th>
                          <th className="tool-table-head">Vel.</th>
                          <th className="tool-table-head">Tag</th>
                          <th className="tool-table-head"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {groups.map((g, i) => (
                          <tr key={i}>
                            <td className="tool-table-cell">
                              <Input
                                value={g.name}
                                onChange={(e) =>
                                  editGr(i, "name", e.target.value)
                                }
                              />
                            </td>
                            <td className="tool-table-cell">
                              <Input
                                type="number"
                                value={g.size}
                                onChange={(e) =>
                                  editGr(i, "size", e.target.value)
                                }
                                className="w-20"
                              />
                            </td>
                            <td className="tool-table-cell">
                              <Input
                                value={g.tag}
                                onChange={(e) =>
                                  editGr(i, "tag", e.target.value)
                                }
                                placeholder="(vse delavnice)"
                                className="w-32"
                              />
                            </td>
                            <td className="tool-table-cell">
                              <Button
                                onClick={() => removeGr(i)}
                                variant="destructive"
                                size="icon"
                                title="Odstrani"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {groups.length === 0 && (
                          <tr>
                            <td
                              className="px-3 py-6 text-center text-sm text-muted-foreground"
                              colSpan={4}
                            >
                              Še ni razčlenjenih skupin.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              {capAnalysis && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="tool-summary-card">
                    <p className="text-sm text-muted-foreground">
                      Skupaj otrok
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {capAnalysis.totalKids}
                    </p>
                  </div>
                  <div className="tool-summary-card">
                    <p className="text-sm text-muted-foreground">
                      Razlika kapacitete
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {capAnalysis.surplus}
                    </p>
                  </div>
                </div>
              )}

              <section className="tool-panel p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="days-count">Dni</Label>
                    <Input
                      id="days-count"
                      type="number"
                      min={1}
                      value={numDays}
                      onChange={(e) => setNumDays(Math.max(1, +e.target.value))}
                      className="w-full sm:w-28"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iterations-count">Iteracije</Label>
                    <Input
                      id="iterations-count"
                      type="number"
                      min={1000}
                      value={iterations}
                      onChange={(e) =>
                        setIterations(Math.max(1000, +e.target.value))
                      }
                      className="w-full sm:w-36"
                    />
                  </div>
                </div>
              </section>

              <Button
                onClick={handleSolve}
                disabled={solving || !hasData}
                className="w-full"
                size="lg"
              >
                {solving ? "Generiram razpored ..." : "Zgeneraj razpored"}
              </Button>
            </TabsContent>

            {/* ── Glavna matrika ── */}
            <TabsContent value="summary">
              {state3D ? (
                <section className="tool-panel overflow-hidden">
                  <div className="border-b px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">Master matrika</h3>
                        <p className="text-sm text-muted-foreground">
                          Pregled dni po skupinah in delavnicah.
                        </p>
                      </div>
                      <Button
                        onClick={copySummaryMatrix}
                        variant="outline"
                        size="sm"
                      >
                        Kopiraj matriko
                      </Button>
                    </div>
                  </div>
                  <div className="tool-table-wrapper">
                    <table className="tool-table text-xs">
                      <thead>
                        <tr>
                          <th className="tool-table-head">Skupina</th>
                          {workshops.map((w, i) => (
                            <th
                              key={i}
                              className="tool-table-head h-28 min-w-12 text-center"
                              style={{ writingMode: "vertical-lr" }}
                            >
                              {w.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {groups.map((gr, gIdx) => (
                          <tr key={gIdx}>
                            <td className="tool-table-cell font-medium">
                              <div className="flex items-center gap-2">
                                <span>{gr.name}</span>
                                {gr.tag && (
                                  <Badge variant="secondary">{gr.tag}</Badge>
                                )}
                              </div>
                            </td>
                            {workshops.map((_, wIdx) => {
                              const days = getUniqueDays(gIdx, wIdx);
                              const main = days.length > 0 ? days[0] - 1 : null;

                              return (
                                <td
                                  key={wIdx}
                                  className="tool-table-cell text-center"
                                  style={{
                                    background:
                                      main !== null ? DC[main % 8] : "#fff",
                                    color:
                                      main !== null ? DT[main % 8] : "#cbd5e1",
                                    fontWeight: main !== null ? 700 : 400,
                                  }}
                                >
                                  {days.map((d) => `D${d}`).join(", ") || "·"}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : (
                <div className="tool-panel p-8 text-sm text-muted-foreground">
                  Tukaj se bo prikazala glavna matrika, ko zgeneriraš razpored.
                </div>
              )}
            </TabsContent>

            {/* ── Podrobno ── */}
            <TabsContent value="details" className="space-y-6">
              {state3D ? (
                state3D.map((slotData, sIdx) => (
                  <section key={sIdx} className="tool-panel overflow-hidden">
                    <div
                      className="border-b px-5 py-4 text-sm font-semibold"
                      style={{
                        background: DC[Math.floor(sIdx / 2) % 8],
                        color: DT[Math.floor(sIdx / 2) % 8],
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>
                          DAN {Math.floor(sIdx / 2) + 1} — {(sIdx % 2) + 1}. ura
                        </span>
                        <Button
                          onClick={() => copySlotMatrix(sIdx)}
                          variant="outline"
                          size="sm"
                          className="border-current/30 bg-white/70 text-current hover:bg-white"
                        >
                          Kopiraj matriko
                        </Button>
                      </div>
                    </div>
                    <div className="tool-table-wrapper">
                      <table className="tool-table text-xs">
                        <thead>
                          <tr>
                            <th className="tool-table-head">Skupina</th>
                            {workshops.map((w, i) => (
                              <th key={i} className="tool-table-head">
                                {w.name}
                              </th>
                            ))}
                            <th className="tool-table-head">SUM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slotData.map((row, gIdx) => (
                            <tr key={gIdx}>
                              <td className="tool-table-cell font-medium">
                                {groups[gIdx]?.name}
                              </td>
                              {row.map((c, wIdx) => (
                                <td
                                  key={wIdx}
                                  className="tool-table-cell text-center"
                                  style={{
                                    background: c > 0 ? "#f0fdf4" : "#fff",
                                    fontWeight: c > 0 ? 700 : 400,
                                  }}
                                >
                                  {c || "·"}
                                </td>
                              ))}
                              <td
                                className="tool-table-cell text-center font-medium"
                                style={{ background: "#f8fafc" }}
                              >
                                {row.reduce((a, b) => a + b, 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))
              ) : (
                <div className="tool-panel p-8 text-sm text-muted-foreground">
                  Tukaj se bodo prikazali podrobni termini za vsak dan in uro.
                </div>
              )}
            </TabsContent>

            {/* ── Statistika ── */}
            <TabsContent value="stats">
              {stats ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <section className="tool-summary-card">
                    <p className="text-sm text-muted-foreground">
                      Manjkajoče delavnice
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-2xl font-semibold",
                        stats.missing === 0
                          ? "text-emerald-600"
                          : "text-red-600",
                      )}
                    >
                      {stats.missing}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Kompatibilne delavnice brez pokritosti.
                    </p>
                  </section>

                  <section className="tool-summary-card">
                    <p className="text-sm text-muted-foreground">
                      Presežene kapacitete
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-2xl font-semibold",
                        stats.overCap === 0
                          ? "text-emerald-600"
                          : "text-red-600",
                      )}
                    >
                      {stats.overCap}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Število terminov, kjer delavnica preseže kapaciteto.
                    </p>
                  </section>
                </div>
              ) : (
                <div className="tool-panel p-8 text-sm text-muted-foreground">
                  Statistika bo na voljo po generiranju razporeda.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {toast && (
        <div className="fixed right-5 bottom-5 z-[999] rounded-lg bg-slate-900 px-5 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
