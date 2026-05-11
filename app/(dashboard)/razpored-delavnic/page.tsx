import { RazporedDelavnic } from "@/components/razpored-delavnic/razpored-delavnic";

export default function RazporedDelavnicPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Razpored delavnic</h1>
      <p className="text-muted-foreground mb-6">
        Optimalna razporeditev skupin na delavnice po dnevih. Algoritem zagotovi
        vsaj 3 enourne delavnice na skupino na dan in polno pokritost čez celoten
        teden.
      </p>
      <RazporedDelavnic />
    </div>
  );
}
