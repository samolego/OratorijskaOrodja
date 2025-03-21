import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, QrCode, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>Identifikacije Tool</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p>Generate personalized emails and documents.</p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/identifikacije">
                Open <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              <CardTitle>QR Code Generator</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p>Create QR codes for events and resources.</p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/qr-code">
                Open <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
