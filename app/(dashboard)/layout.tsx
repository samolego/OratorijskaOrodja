"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, QrCode, Home, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen relative">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r bg-muted/40">
        <div className="p-6 border-b">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Home className="h-5 w-5" />
            <span>Oratorij Toolkit</span>
          </Link>
        </div>
        <nav className="flex-1 p-4">
          <SidebarNav closeMenu={() => setMobileMenuOpen(false)} />
        </nav>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="p-6 border-b flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Home className="h-5 w-5" />
            <span>Oratorij Toolkit</span>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden border-b p-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Home className="h-5 w-5" />
            <span>Oratorij Toolkit</span>
          </Link>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

interface SidebarNavProps {
  closeMenu: () => void;
}

function SidebarNav({ closeMenu }: SidebarNavProps) {
  const pathname = usePathname();

  const routes = [
    {
      icon: <Mail className="mr-2 h-4 w-4" />,
      href: "/identifikacije",
      label: "Orodje za identifikacije",
    },
    {
      icon: <QrCode className="mr-2 h-4 w-4" />,
      href: "/qr-code",
      label: "Generator kod QR",
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
