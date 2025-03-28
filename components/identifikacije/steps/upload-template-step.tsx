import {
  Upload,
  RefreshCw,
  FileText,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import { ErrorAlert } from "../../error-alert";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { getErrorMessage } from "../types";

export const UploadTemplateStep = ({
  handleFileUpload,
  templateFile,
  isProcessing,
  setIsProcessing,
  setError,
  error,
}: {
  handleFileUpload: (file: File) => void;
  templateFile: File | null;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  setError: (value: string) => void;
  error: string;
}) => {
  const useSampleTemplate = async () => {
    try {
      setIsProcessing(true);
      setError("");

      const response = await fetch("/template.odt");
      if (!response.ok) {
        throw new Error("Failed to fetch sample template");
      }

      const blob = await response.blob();
      const file = new File([blob], "template.odt", {
        type: "application/vnd.oasis.opendocument.text",
      });

      handleFileUpload(file);
    } catch (err: unknown) {
      setError(`Error loading sample template: ${getErrorMessage(err)}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-medium text-lg">Izberi predlogo dokumenta</h3>
        <p className="text-sm text-gray-500">
          Dokument DOCX ali ODT mora vsebovati značke v obliki{" "}
          <b>{"{oznaka}"}</b>, ki jih bo program zamenjal s podatki iz tabele.
        </p>
      </div>

      {/* Template options section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option 1: Upload your own template */}
        <div className="border rounded-lg p-5 bg-white hover:bg-gray-50 transition-colors">
          <h4 className="font-medium mb-2 flex items-center">
            <Upload className="h-5 w-5 mr-2 text-blue-500" />
            Naloži svojo predlogo
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Naloži prilagojeno predlogo z lastnimi polji in oblikovanjem.
          </p>

          {/* Drag and drop area */}
          <div
            className="border-2 border-dashed rounded-md p-4 text-center mb-3 bg-gray-50"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer?.files?.[0];
              if (
                file &&
                (file.name.endsWith(".docx") || file.name.endsWith(".odt"))
              ) {
                handleFileUpload(file);
              }
            }}
          >
            <Upload className="mx-auto h-6 w-6 text-gray-400 mb-2" />
            <p className="text-xs text-gray-500">
              Povleci in spusti datoteko sem
            </p>
          </div>

          <Input
            type="file"
            accept=".docx,.odt"
            className="hidden"
            id="template-upload"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById("template-upload")?.click()}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Obdelava ...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Izberi datoteko
              </>
            )}
          </Button>
        </div>

        {/* Option 2: Use sample template */}
        <div className="border rounded-lg p-5 bg-white hover:bg-gray-50 transition-colors flex flex-col h-full">
          <div>
            <h4 className="font-medium mb-2 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-500" />
              Uporabi vzorčno predlogo
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Najhitrejša možnost - uporabi pripravljeno predlogo z
              najpogostejšimi polji.
            </p>
          </div>

          {/* This empty div will push the button to the bottom using flex-grow */}
          <div className="flex-grow"></div>

          {/* Bottom-docked button */}
          <div className="mt-auto pt-4">
            <div className="text-center mb-4">
              <Button
                variant="link"
                size="sm"
                className="text-xs text-gray-500"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = "/template.odt";
                  link.download = "template.odt";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <FileText className="mr-1 h-3 w-3" />
                Prenesi za pregled
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={useSampleTemplate}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Obdelava ...
                </>
              ) : (
                <>
                  Uporabi vzorčno predlogo
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Success indicator when template is loaded */}
      {templateFile && (
        <div className="bg-green-50 p-4 rounded-md flex items-center border border-green-200">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
          <span>
            Naložena predloga: <strong>{templateFile.name}</strong>
          </span>
        </div>
      )}

      {/* Helpful info section */}
      <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mt-4">
        <h4 className="font-medium mb-2 text-blue-700">Koristni nasveti</h4>
        <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
          <li>
            V predlogi uporabite oznake kot so <code>{"{ime}"}</code>,{" "}
            <code>{"{priimek}"}</code>, <code>{"{razred}"}</code>
          </li>
          <li>
            Oznake upoštevajo velike/male črke: <code>{"{IME}"}</code> =&gt;{" "}
            <i>REBEKA</i>, <code>{"{ime}"}</code> =&gt; <i>rebeka</i> in{" "}
            <code>{"{Ime}"}</code> =&gt; <i>Rebeka</i>
          </li>
          <li>
            Posamezno oznako lahko uporabite večkrat na različnih mestih v
            dokumentu
          </li>
        </ul>
      </div>

      <ErrorAlert error={error} />
    </div>
  );
};
