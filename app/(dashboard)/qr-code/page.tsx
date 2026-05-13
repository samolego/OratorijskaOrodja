import { QRCode } from "@/components/qr-code";

export default function QRCodePage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Generator kod QR</h1>
      <div className="w-full max-w-3xl mx-auto">
        <QRCode className="max-w-3xl" />
      </div>
    </div>
  );
}
