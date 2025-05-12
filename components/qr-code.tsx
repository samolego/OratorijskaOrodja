"use client";

import * as React from "react";
import QRCodeReact from "react-qr-code";
import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface QRCodeProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  downloadable?: boolean;
}

type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

const ERROR_LEVELS = [
  { value: "L", label: "Low (7%)" },
  { value: "M", label: "Medium (15%)" },
  { value: "Q", label: "Quartile (25%)" },
  { value: "H", label: "High (30%)" },
];

export function QRCode({
  className,
  defaultValue = "",
  downloadable = true,
  ...props
}: QRCodeProps) {
  const [value, setValue] = React.useState<string>(defaultValue);
  const [errorLevel, setErrorLevel] = React.useState<ErrorCorrectionLevel>("Q");
  const qrRef = React.useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const margin = 10;

    img.onload = () => {
      // Add margin to canvas dimensions
      canvas.width = img.width + margin * 2;
      canvas.height = img.height + margin * 2;

      // Fill background with white
      if (ctx) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw image with margin offset
      ctx?.drawImage(img, margin, margin);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `qrcode-${new Date().getTime()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  return (
    <Card className={cn("w-full max-w-sm mx-auto", className)} {...props}>
      <CardHeader className="text-center">
        <CardTitle>QR Code Generator</CardTitle>
        <CardDescription>
          Vnesi URL ali besedilo, da ustvariš kodo QR. Kodo lahko shraniš kot
          PNG datoteko.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="url">URL ali besedilo</Label>
          <Input
            id="url"
            placeholder="https://example.com"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="error-level">Stopnja popravljanja napak</Label>
            <span className="text-sm text-muted-foreground">
              {ERROR_LEVELS.find((level) => level.value === errorLevel)?.label}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {ERROR_LEVELS.map((level) => (
              <Button
                key={level.value}
                type="button"
                variant={errorLevel === level.value ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setErrorLevel(level.value as ErrorCorrectionLevel)
                }
                className="w-full text-xs"
              >
                {level.value}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Večja stopnja popravljanja napak omogoča, da kode QR ostanejo
            čitljive tudi, če so delno poškodovane ali zakrite. Koda QR na ta
            račun postane kompleksnejša.
          </p>
        </div>

        <div
          ref={qrRef}
          className="flex justify-center items-center p-4 bg-white rounded-md min-h-[250px]"
        >
          {value ? (
            <div className="flex justify-center items-center w-full">
              <QRCodeReact
                value={value}
                size={200}
                level={errorLevel}
                style={{ height: "auto", maxWidth: "100%" }}
              />
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              Vnesi URL ali besedilo, da ustvariš kodo QR.
            </div>
          )}
        </div>
      </CardContent>
      {downloadable && (
        <CardFooter>
          <Button onClick={handleDownload} className="w-full" disabled={!value}>
            Download QR Code
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
