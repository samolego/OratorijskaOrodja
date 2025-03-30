import Link from "next/link";
import { Contact, QrCode, ArrowRight, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import OratorijIcon from "@/components/icons/oratorij";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b w-full">
        <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-8 w-full">
          <div className="flex items-center gap-2 font-bold text-xl">
            <OratorijIcon className="h-8 w-8" />
            <span>Oratorijska orodja</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <a
                href="https://github.com/samolego/OratorijskaOrodja"
                target="_blank"
              >
                GitHub
              </a>
            </Button>
            <Button asChild>
              <Link href="/dashboard">Začni</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1">
        <div className="container max-w-7xl mx-auto px-4 sm:px-8 py-12 md:py-24 lg:py-32">
          <div className="mx-auto max-w-3xl space-y-8 text-center">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
              Oratorijska orodja
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
              Zbirka administrativnih orodij, razvita za Oratorij Grosuplje.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/40">
        <div className="container max-w-7xl mx-auto px-4 sm:px-8 py-12 md:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tighter text-center mb-12">
              Orodja, ki so na voljo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Identifikacije Tool */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Contact className="h-5 w-5" />
                    <CardTitle>Izdelovalnik identifikacij</CardTitle>
                  </div>
                  <CardDescription>
                    Omogoča preprosto izdelavo identifikacijskih listov za
                    otroke na oratoriju.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Omogoča preprosto izdelavo identifikacijskih listov za
                    otroke na oratoriju. Deluje na princip &quot;mail
                    merge&quot;. Izbereš dokument s posebnimi oznakami, ki se
                    spremenijo v podatke o otrocih, ki jih skopiraš in prilepiš.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" asChild>
                    <Link href="/identifikacije">
                      <span>Odpri identifikacije</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* QR Code Generator */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    <CardTitle>Generator QR kod</CardTitle>
                  </div>
                  <CardDescription>
                    Ustvari QR kode za spletne povezave.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Omogoča izdelavo QR kod iz podanega besedila - npr. za
                    povezavo na spletno prijavnico.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" asChild>
                    <Link href="/qr-code">
                      <span>Odpri generator QR kod</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between px-4 sm:px-8 py-8">
          <div className="flex items-center gap-2 font-medium">
            <Rocket className="h-4 w-4" />
            <span>Oratorijska orodja</span>
          </div>
          <div className="text-center md:text-left text-sm text-muted-foreground mt-4 md:mt-0">
            © {new Date().getFullYear()} Oratorij Grosuplje.
          </div>
        </div>
      </footer>
    </div>
  );
}
