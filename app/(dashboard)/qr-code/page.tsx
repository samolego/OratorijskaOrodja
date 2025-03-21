import { QRCode } from "@/components/qr-code";

export default function QRCodePage() {
  return (
    <div className="container mx-auto p-6 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6">QR Code Generator</h1>
      <div className="w-full max-w-md">
        <QRCode />
      </div>
    </div>
  );
}
