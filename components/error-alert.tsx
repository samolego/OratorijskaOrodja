import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export const ErrorAlert = ({ error }: { error: string }) => {
  if (!error) return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Napaka</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
};
