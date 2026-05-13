"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Contact, Menu, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import OratorijIcon from "@/components/icons/oratorij";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen">
      <div className="hidden w-64 flex-col border-r bg-muted/40 md:flex">
        <div className="border-b p-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold"
            onClick={() => setMobileMenuOpen(false)}
          >
            <OratorijIcon className="h-8 w-8" />
            <span>Oratorijska orodja</span>
          </Link>
        </div>
        <nav className="flex-1 p-4">
          <SidebarNav closeMenu={() => setMobileMenuOpen(false)} />
        </nav>
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-background transition-transform duration-200 ease-in-out md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b p-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold"
            onClick={() => setMobileMenuOpen(false)}
          >
            <OratorijIcon className="h-8 w-8" />
            <span>Oratorijska orodja</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 p-4">
          <SidebarNav closeMenu={() => setMobileMenuOpen(false)} />
        </nav>
      </div>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b p-4 md:hidden">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <OratorijIcon className="h-8 w-8" />
            <span>Oratorijska orodja</span>
          </Link>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function SidebarNav({ closeMenu }: { closeMenu: () => void }) {
  const pathname = usePathname();

  const routes = [
    {
      icon: <Contact className="mr-2 h-4 w-4" />,
      href: "/identifikacije",
      label: "Orodje za identifikacije",
    },
    {
      icon: <QrCode className="mr-2 h-4 w-4" />,
      href: "/qr-code",
      label: "Generator kod QR",
    },
    {
      icon: <CalendarDays className="mr-2 h-4 w-4" />,
      href: "/delavnice",
      label: "Razporejanje delavnic",
    },
  ];

  return (
    <div className="space-y-2">
      {routes.map((route) => (
        <Button
          key={route.href}
          variant={pathname === route.href ? "secondary" : "ghost"}
          asChild
          className="w-full justify-start"
          onClick={closeMenu}
        >
          <Link href={route.href}>
            {route.icon}
            {route.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
