import Link from "next/link";
import { Mail, QrCode, ArrowRight, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center px-4 sm:px-8">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Rocket className="h-5 w-5" />
            <span>Oratorij Toolkit</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/about">About</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1">
        <div className="container px-4 sm:px-8 py-12 md:py-24 lg:py-32">
          <div className="mx-auto max-w-3xl space-y-8 text-center">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
              Productivity Tools for Oratorij
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
              Simplify your workflow with our specialized toolkit designed for
              Oratorij organizers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/dashboard">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/40">
        <div className="container px-4 sm:px-8 py-12 md:py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tighter text-center mb-12">
              Available Tools
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Identifikacije Tool */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    <CardTitle>Identifikacije Tool</CardTitle>
                  </div>
                  <CardDescription>
                    Easily create personalized emails and documents for multiple
                    recipients
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Streamline your communication by generating personalized
                    emails, letters, or documents using templates and data from
                    spreadsheets.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" asChild>
                    <Link href="/identifikacije">
                      <span>Open Identifikacije</span>
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
                    <CardTitle>QR Code Generator</CardTitle>
                  </div>
                  <CardDescription>
                    Create custom QR codes for events, resources, and more
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Generate QR codes for your events, links, or resources.
                    Perfect for registrations, attendance tracking, and sharing
                    information.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" asChild>
                    <Link href="/qr-code">
                      <span>Open QR Generator</span>
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
        <div className="container flex flex-col md:flex-row items-center justify-between px-4 sm:px-8 py-8">
          <div className="flex items-center gap-2 font-medium">
            <Rocket className="h-4 w-4" />
            <span>Oratorij Toolkit</span>
          </div>
          <div className="text-center md:text-left text-sm text-muted-foreground mt-4 md:mt-0">
            © {new Date().getFullYear()} Oratorij. All rights reserved.
          </div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Button className="w-full" asChild>
              <Link href="/identifikacije">
                <span>Open Identifikacije</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button className="w-full" asChild>
              <Link href="/qr-code">
                <span>Open QR Generator</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
