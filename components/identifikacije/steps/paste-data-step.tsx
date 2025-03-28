import { ChevronRight } from "lucide-react";
import { ErrorAlert } from "../../error-alert";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";

export const PasteDataStep = ({
  sheetData,
  setSheetData,
  error,
  handlePaste,
}: {
  sheetData: string;
  setSheetData: (data: string) => void;
  error: string;
  handlePaste: () => void;
}) => {
  return (
    <div className="space-y-2">
      <h3 className="font-medium">Tukaj prilepi podatke iz preglednice</h3>
      <p className="text-sm text-gray-500">
        Podatke kopirajte iz Google Sheets ali Excela in jih prilepite spodaj.
        Prva (zgornja) vrstica mora vsebovati naslove stolpcev.
      </p>

      <Textarea
        placeholder="Tu prilepi podatke ..."
        className="min-h-48"
        value={sheetData}
        onChange={(e) => setSheetData(e.target.value)}
      />

      <ErrorAlert error={error} />

      <div className="pt-4">
        <Button
          onClick={handlePaste}
          disabled={!sheetData.trim()}
          className="w-full sm:w-auto"
        >
          Nadaljuj <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
