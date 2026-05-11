"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type Workshop,
  type AgeGroup,
  computeGroupAges,
  solve,
  verify,
  isCompat,
} from "./solver";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  Copy,
  Download,
  Upload,
  RotateCcw,
  Loader2,
} from "lucide-react";

const DEFAULT_WORKSHOPS: Workshop[] = [
  { name: "Eksperimentalna", cap: 15, age: "/", dur: 1 },
  { name: "Poklici", cap: 15, age: "/", dur: 1 },
  { name: "Skavtska", cap: 12, age: "/", dur: 1 },
  { name: "Prva pomoč", cap: 15, age: "/", dur: 1 },
  { name: "Band", cap: 10, age: "/", dur: 1 },
  { name: "Šah", cap: 14, age: "/", dur: 1 },
  { name: "Plesna", cap: 16, age: "/", dur: 1 },
  { name: "Športna", cap: 16, age: "/", dur: 1 },
  { name: "Rožni venci", cap: 10, age: "m", dur: 1 },
  { name: "Frizerska", cap: 14, age: "/", dur: 1 },
  { name: "Pirografi+Stringart", cap: 10, age: "/", dur: 1 },
  { name: "Vrtnarska", cap: 10, age: "m", dur: 1 },
  { name: "Escape room", cap: 10, age: "s", dur: 1 },
  { name: "Zvežčiči", cap: 12, age: "/", dur: 1 },
  { name: "Gasilska", cap: 15, age: "/", dur: 1 },
  { name: "Mehanik", cap: 15, age: "/", dur: 2 },
  { name: "DSO", cap: 15, age: "/", dur: 2 },
  { name: "Jamarska", cap: 12, age: "/", dur: 2 },
  { name: "Kuharska", cap: 12, age: "/", dur: 2 },
  { name: "Računalniška", cap: 8, age: "/", dur: 2 },
];

const DAY_CLASSES = [
  "bg-blue-100 text-blue-700 border-blue-300",
  "bg-green-100 text-green-700 border-green-300",
  "bg-yellow-100 text-yellow-700 border-yellow-300",
  "bg-pink-100 text-pink-700 border-pink-300",
  "bg-indigo-100 text-indigo-700 border-indigo-300",
  "bg-purple-100 text-purple-700 border-purple-300",
  "bg-teal-100 text-teal-700 border-teal-300",
  "bg-red-100 text-red-700 border-red-300",
];

const DAY_DOT_CLASSES = [
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-teal-500",
  "bg-red-500",
];

const AGE_LABEL: Record<string, string> = { m: "Mlajši", s: "Starejši", v: "Vsi" };
const AGE_SHORT: Record<string, string> = { m: "ml.", s: "st.", v: "vsi" };

export function RazporedDelavnic() {
  const [workshops, setWorkshops] = useState<Workshop[]>(DEFAULT_WORKSHOPS);
  const [numGroups, setNumGroups] = useState(20);
  const [numDays, setNumDays] = useState(4);
  const [numKids, setNumKids] = useState(231);
  const [mladsiCount, setMladsiCount] = useState(90);
  const [starejsiCount, setStarejsiCount] = useState(50);
  const [matrix, setMatrix] = useState<number[][] | null>(null);
  const [solving, setSolving] = useState(false);
  const [editIdx, setEditIdx] = useState(-1);
  const [newW, setNewW] = useState<Workshop>({
    name: "",
    cap: 10,
    age: "/",
    dur: 1,
  });

  const groupSize = Math.ceil(numKids / numGroups);
  const groupAges = useMemo(
    () => computeGroupAges(numGroups, numKids, mladsiCount, starejsiCount),
    [numGroups, numKids, mladsiCount, starejsiCount],
  );
  const stats = useMemo(
    () => (matrix ? verify(matrix, workshops, numGroups, numDays, groupAges) : null),
    [matrix, workshops, numGroups, numDays, groupAges],
  );

  const handleSolve = useCallback(() => {
    setSolving(true);
    setTimeout(() => {
      const result = solve(workshops, numGroups, numDays, groupAges, 400);
      setMatrix(result);
      setSolving(false);
    }, 50);
  }, [workshops, numGroups, numDays, groupAges]);

  const copyMatrix = useCallback(() => {
    if (!matrix) return;
    let tsv = "Skupina\t" + workshops.map((w) => w.name).join("\t") + "\n";
    for (let g = 0; g < numGroups; g++) {
      tsv += `Sk.${g + 1} (${AGE_SHORT[groupAges[g]]})`;
      for (let w = 0; w < workshops.length; w++) tsv += "\t" + (matrix[g][w] || "—");
      tsv += "\n";
    }
    navigator.clipboard.writeText(tsv);
  }, [matrix, workshops, numGroups, groupAges]);

  const copyDay = useCallback(
    (day: number) => {
      if (!matrix) return;
      let tsv = `Dan ${day}\nSkupina\t1h delavnice\t2h delavnice\tSkupaj\n`;
      for (let g = 0; g < numGroups; g++) {
        const w1: string[] = [];
        const w2: string[] = [];
        for (let w = 0; w < workshops.length; w++) {
          if (matrix[g][w] === day) {
            if (workshops[w].dur === 1) w1.push(workshops[w].name);
            else w2.push(workshops[w].name);
          }
        }
        tsv += `Sk.${g + 1} (${AGE_SHORT[groupAges[g]]})\t${w1.join(", ")}\t${w2.join(", ")}\t${w1.length + w2.length}\n`;
      }
      navigator.clipboard.writeText(tsv);
    },
    [matrix, workshops, numGroups, groupAges],
  );

  const exportJSON = useCallback(() => {
    const data = { workshops, numGroups, numDays, numKids, mladsiCount, starejsiCount, matrix };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `razpored_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }, [workshops, numGroups, numDays, numKids, mladsiCount, starejsiCount, matrix]);

  const importJSON = useCallback(() => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".json";
    inp.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = (ev) => {
        try {
          const d = JSON.parse(ev.target?.result as string);
          if (d.workshops) setWorkshops(d.workshops);
          if (d.numGroups) setNumGroups(d.numGroups);
          if (d.numDays) setNumDays(d.numDays);
          if (d.numKids) setNumKids(d.numKids);
          if (d.mladsiCount) setMladsiCount(d.mladsiCount);
          if (d.starejsiCount) setStarejsiCount(d.starejsiCount);
          if (d.matrix) setMatrix(d.matrix);
        } catch {
          // ignore parse errors
        }
      };
      r.readAsText(f);
    };
    inp.click();
  }, []);

  const addWorkshop = () => {
    if (!newW.name) return;
    setWorkshops([...workshops, { ...newW }]);
    setNewW({ name: "", cap: 10, age: "/", dur: 1 });
  };

  return (
    <Tabs defaultValue="config" className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <TabsList>
          <TabsTrigger value="config">Nastavitve</TabsTrigger>
          <TabsTrigger value="matrix" disabled={!matrix}>Matrika</TabsTrigger>
          <TabsTrigger value="days" disabled={!matrix}>Po dnevih</TabsTrigger>
          <TabsTrigger value="stats" disabled={!matrix}>Statistika</TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={importJSON}>
            <Upload className="mr-1 h-3 w-3" /> Uvozi
          </Button>
          {matrix && (
            <Button variant="outline" size="sm" onClick={exportJSON}>
              <Download className="mr-1 h-3 w-3" /> Izvozi
            </Button>
          )}
          {matrix && (
            <Button size="sm" onClick={copyMatrix}>
              <Copy className="mr-1 h-3 w-3" /> Kopiraj za Sheets
            </Button>
          )}
        </div>
      </div>

      {/* CONFIG */}
      <TabsContent value="config" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parametri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <Label>Otrok</Label>
                <Input type="number" value={numKids} onChange={(e) => setNumKids(+e.target.value)} />
              </div>
              <div>
                <Label>Skupin</Label>
                <Input type="number" value={numGroups} onChange={(e) => setNumGroups(+e.target.value)} />
              </div>
              <div>
                <Label>Dni</Label>
                <Input type="number" value={numDays} onChange={(e) => setNumDays(+e.target.value)} />
              </div>
              <div>
                <Label>Mlajših</Label>
                <Input type="number" value={mladsiCount} onChange={(e) => setMladsiCount(+e.target.value)} />
              </div>
              <div>
                <Label>Starejših</Label>
                <Input type="number" value={starejsiCount} onChange={(e) => setStarejsiCount(+e.target.value)} />
              </div>
              <div>
                <Label>Otrok/skupino</Label>
                <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm font-medium">
                  {groupSize}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Skupine: {groupAges.map((a, i) => `${i + 1}=${AGE_SHORT[a]}`).join(", ")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Delavnice ({workshops.length}): {workshops.filter((w) => w.dur === 1).length} enournih,{" "}
              {workshops.filter((w) => w.dur === 2).length} dvournih
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">#</th>
                    <th className="text-left p-2 font-medium">Ime</th>
                    <th className="text-left p-2 font-medium">Kap.</th>
                    <th className="text-left p-2 font-medium">Starost</th>
                    <th className="text-left p-2 font-medium">Traj.</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {workshops.map((w, i) => (
                    <tr key={i} className={`border-b ${w.dur === 2 ? "bg-purple-50" : ""}`}>
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      {editIdx === i ? (
                        <>
                          <td className="p-2">
                            <Input className="h-8" value={w.name} onChange={(e) => { const n = [...workshops]; n[i] = { ...w, name: e.target.value }; setWorkshops(n); }} />
                          </td>
                          <td className="p-2">
                            <Input className="h-8 w-16" type="number" value={w.cap} onChange={(e) => { const n = [...workshops]; n[i] = { ...w, cap: +e.target.value }; setWorkshops(n); }} />
                          </td>
                          <td className="p-2">
                            <select className="h-8 rounded border px-2 text-sm" value={w.age} onChange={(e) => { const n = [...workshops]; n[i] = { ...w, age: e.target.value as Workshop["age"] }; setWorkshops(n); }}>
                              <option value="/">Vsi</option>
                              <option value="m">Mlajši</option>
                              <option value="s">Starejši</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <select className="h-8 rounded border px-2 text-sm" value={w.dur} onChange={(e) => { const n = [...workshops]; n[i] = { ...w, dur: +e.target.value as 1 | 2 }; setWorkshops(n); }}>
                              <option value={1}>1h</option>
                              <option value={2}>2h</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditIdx(-1)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-2 font-medium">{w.name}</td>
                          <td className="p-2">{w.cap}</td>
                          <td className="p-2">
                            <Badge variant={w.age === "m" ? "default" : w.age === "s" ? "secondary" : "outline"} className="text-xs">
                              {AGE_LABEL[w.age]}
                            </Badge>
                          </td>
                          <td className="p-2">
                            {w.dur === 2 ? <Badge variant="secondary" className="bg-purple-100 text-purple-700">2h</Badge> : "1h"}
                          </td>
                          <td className="p-2 flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditIdx(i)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setWorkshops(workshops.filter((_, j) => j !== i))}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-muted/50">
                    <td className="p-2 text-muted-foreground">+</td>
                    <td className="p-2"><Input className="h-8" value={newW.name} onChange={(e) => setNewW({ ...newW, name: e.target.value })} placeholder="Ime..." /></td>
                    <td className="p-2"><Input className="h-8 w-16" type="number" value={newW.cap} onChange={(e) => setNewW({ ...newW, cap: +e.target.value })} /></td>
                    <td className="p-2">
                      <select className="h-8 rounded border px-2 text-sm" value={newW.age} onChange={(e) => setNewW({ ...newW, age: e.target.value as Workshop["age"] })}>
                        <option value="/">Vsi</option><option value="m">Mlajši</option><option value="s">Starejši</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <select className="h-8 rounded border px-2 text-sm" value={newW.dur} onChange={(e) => setNewW({ ...newW, dur: +e.target.value as 1 | 2 })}>
                        <option value={1}>1h</option><option value={2}>2h</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <Button size="sm" onClick={addWorkshop}><Plus className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Button className="w-full" size="lg" onClick={handleSolve} disabled={solving}>
          {solving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Optimiziram (400 iteracij)...</> : "▶ Generiraj razpored"}
        </Button>
      </TabsContent>

      {/* MATRIX */}
      <TabsContent value="matrix">
        {matrix && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Matrika: Skupina × Delavnica → Dan</CardTitle>
                <div className="flex gap-3">
                  {Array.from({ length: numDays }, (_, d) => (
                    <span key={d} className="flex items-center gap-1 text-xs">
                      <span className={`w-3 h-3 rounded ${DAY_DOT_CLASSES[d % 8]}`} />
                      Dan {d + 1}
                    </span>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="p-1 text-left sticky left-0 bg-background z-10 min-w-[80px]"></th>
                    {workshops.map((w, i) => (
                      <th key={i} className={`p-1 text-center [writing-mode:vertical-lr] text-[10px] font-semibold h-28 ${w.dur === 2 ? "bg-purple-50" : ""}`}>
                        {w.name}{w.dur === 2 ? " ⏱" : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: numGroups }, (_, g) => (
                    <tr key={g} className={g % 2 ? "bg-muted/30" : ""}>
                      <td className="p-1 font-semibold text-xs whitespace-nowrap sticky left-0 bg-background z-10">
                        Sk.{g + 1} <span className="text-muted-foreground">({AGE_SHORT[groupAges[g]]})</span>
                      </td>
                      {workshops.map((_, wi) => (
                        <td key={wi} className={`p-1 text-center font-bold border ${matrix[g][wi] ? DAY_CLASSES[(matrix[g][wi] - 1) % 8] : "text-muted-foreground/30"}`}>
                          {matrix[g][wi] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* DAYS */}
      <TabsContent value="days" className="space-y-4">
        {matrix && Array.from({ length: numDays }, (_, d) => (
          <Card key={d}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className={`w-3 h-3 rounded ${DAY_DOT_CLASSES[d % 8]}`} />
                  Dan {d + 1}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => copyDay(d + 1)}>
                  <Copy className="mr-1 h-3 w-3" /> Kopiraj
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium w-24">Skupina</th>
                    <th className="text-left p-2 font-medium">1h delavnice</th>
                    <th className="text-left p-2 font-medium w-44">2h delavnice</th>
                    <th className="text-center p-2 font-medium w-10">1h</th>
                    <th className="text-center p-2 font-medium w-10">2h</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: numGroups }, (_, g) => {
                    const w1: string[] = [];
                    const w2: string[] = [];
                    for (let w = 0; w < workshops.length; w++) {
                      if (matrix[g][w] === d + 1) {
                        if (workshops[w].dur === 1) w1.push(workshops[w].name);
                        else w2.push(workshops[w].name);
                      }
                    }
                    const low = w1.length < 3;
                    return (
                      <tr key={g} className={`border-b ${low ? "bg-red-50" : ""}`}>
                        <td className="p-2 font-semibold">
                          Sk.{g + 1} <span className="text-muted-foreground text-xs">({AGE_SHORT[groupAges[g]]})</span>
                        </td>
                        <td className="p-2">{w1.join(", ")}</td>
                        <td className="p-2 text-purple-700 font-medium">{w2.join(", ") || "—"}</td>
                        <td className={`p-2 text-center font-bold ${low ? "text-destructive" : "text-green-600"}`}>{w1.length}</td>
                        <td className="p-2 text-center font-semibold text-purple-600">{w2.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      {/* STATS */}
      <TabsContent value="stats" className="space-y-4">
        {stats && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pokritost</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`font-semibold ${stats.ok ? "text-green-600" : "text-destructive"}`}>
                  {stats.ok
                    ? "✅ Vsaka skupina vidi vsako kompatibilno delavnico vsaj 1×!"
                    : `⚠️ ${stats.missingPairs.length} manjkajočih`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Delavnic na skupino na dan</CardTitle>
                <p className="text-xs text-muted-foreground">Prikazano kot: enourne + dvourne</p>
              </CardHeader>
              <CardContent>
                {stats.groupCounts.map((c, g) => {
                  const min1h = Math.min(...stats.groupCounts1h[g]);
                  return (
                    <div key={g} className="flex items-center gap-2 py-1 text-sm">
                      <span className="font-semibold w-24">Sk.{g + 1} ({AGE_SHORT[groupAges[g]]})</span>
                      {c.map((_, d) => (
                        <span key={d} className={`px-2 py-0.5 rounded border text-xs font-bold ${DAY_CLASSES[d % 8]}`}>
                          {stats.groupCounts1h[g][d]}
                          <span className="text-purple-600">+{stats.groupCounts2h[g][d]}</span>
                        </span>
                      ))}
                      <span className={`text-xs font-semibold ${min1h >= 3 ? "text-green-600" : "text-destructive"}`}>
                        {min1h >= 3 ? "✅" : "⚠️ <3"}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skupin na delavnico na dan</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.workshopCounts.map((c, w) => (
                  <div key={w} className="flex items-center gap-2 py-1 text-sm">
                    <span className="font-semibold w-44">
                      {workshops[w].name}{workshops[w].dur === 2 ? " ⏱" : ""}
                    </span>
                    {c.map((v, d) => (
                      <span key={d} className={`px-2 py-0.5 rounded border text-xs font-bold min-w-[28px] text-center ${DAY_CLASSES[d % 8]}`}>
                        {v}
                      </span>
                    ))}
                    <span className="text-xs text-muted-foreground">cap={workshops[w].cap}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}
