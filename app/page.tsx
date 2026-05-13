import { Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import OratorijIcon from "@/components/icons/oratorij";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b w-full">
        <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-8 w-full">
          <div className="flex items-center gap-2 font-bold text-xl"></div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <a
                href="https://github.com/samolego/OratorijskaOrodja"
                target="_blank"
              >
                GitHub
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1">
        <div className="container max-w-7xl mx-auto px-4 sm:px-8 py-12 md:py-24 lg:py-32">
          <div className="mx-auto max-w-3xl space-y-8 text-center">
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="animate-pulse-slow animate-infinite">
                <OratorijIcon className="h-64 w-64 mx-auto animate-fade-in-down drop-shadow-2xl hover:drop-shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-shadow duration-300" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
              Oratorijska orodja
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl animate-fade-in-up">
              Zbirka administrativnih orodij, razvita za Oratorij Grosuplje.
            </p>
          </div>
        </div>
      </section>

      <div className="pt-4 text-sm text-gray-500 text-center">
        Vse procesiranje se izvede na strani brskalnika. Vaši podatki nikoli ne
        zapustijo vašega brskalnika in niso poslani nikamor.
      </div>

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
