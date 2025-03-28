import { RefreshCw } from "lucide-react";
import { ErrorAlert } from "../../error-alert";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Mapping, SpecialPlaceholderSettings } from "../types";

export const ReviewMappingsStep = ({
  mappings,
  headers,
  updateMapping,
  generateDocuments,
  isProcessing,
  error,
  specialPlaceholderSettings,
  setSpecialPlaceholderSettings,
}: {
  mappings: Mapping[];
  headers: string[];
  updateMapping: (index: number, header: string) => void;
  generateDocuments: () => void;
  isProcessing: boolean;
  error: string;
  specialPlaceholderSettings: {
    razred: { enabled: boolean };
    telefon: { enabled: boolean; secondaryField: string };
  };
  setSpecialPlaceholderSettings: (settings: SpecialPlaceholderSettings) => void;
}) => {
  // Check if we have any razred or telefon placeholders
  const hasRazredPlaceholder = mappings.some((m) =>
    m.placeholder.toLowerCase().includes("razred"),
  );

  const hasTelefonPlaceholder = mappings.some((m) =>
    m.placeholder.toLowerCase().includes("telefon"),
  );

  return (
    <div className="space-y-2">
      <h3 className="font-medium">Pregled preslikav polj</h3>
      <p className="text-sm text-gray-500">
        Preslikave polj v dokumentu s stolpci v seznamu.
      </p>

      <div className="border rounded-md p-4">
        <div className="grid grid-cols-5 gap-4 font-medium border-b pb-2 mb-2">
          <div className="col-span-2">Oznaka v dokumentu</div>
          <div className="col-span-3">Stolpec v seznamu</div>
        </div>

        {mappings.map((mapping, index) => (
          <div key={index} className="grid grid-cols-5 gap-4 items-center py-2">
            <div className="col-span-2">
              <Badge variant="outline" className="mr-2">
                {"{" + mapping.placeholder + "}"}
              </Badge>
            </div>
            <div className="col-span-3">
              <select
                className="w-full p-2 border rounded-md"
                value={mapping.header}
                onChange={(e) => updateMapping(index, e.target.value)}
              >
                <option value="">-- Select Header --</option>
                {headers.map((header, i) => (
                  <option key={i} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Special placeholder settings */}
      <div className="border rounded-md p-4 mt-4">
        <h4 className="font-medium mb-2">Posebne nastavitve oznak</h4>

        {hasRazredPlaceholder && (
          <div className="flex items-center py-2">
            <input
              type="checkbox"
              id="special-razred"
              className="mr-2"
              checked={specialPlaceholderSettings.razred.enabled}
              onChange={(e) =>
                setSpecialPlaceholderSettings({
                  ...specialPlaceholderSettings,
                  razred: {
                    ...specialPlaceholderSettings.razred,
                    enabled: e.target.checked,
                  },
                })
              }
            />
            <label htmlFor="special-razred">
              Upoštevaj razred kot posebno oznako (0 = {"Predšolski"}, ostalo ={" "}
              {"X. razred"})
            </label>
          </div>
        )}

        {hasTelefonPlaceholder && (
          <div className="space-y-2 py-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="special-telefon"
                className="mr-2"
                checked={specialPlaceholderSettings.telefon.enabled}
                onChange={(e) =>
                  setSpecialPlaceholderSettings({
                    ...specialPlaceholderSettings,
                    telefon: {
                      ...specialPlaceholderSettings.telefon,
                      enabled: e.target.checked,
                    },
                  })
                }
              />
              <label htmlFor="special-telefon">
                Upoštevaj telefon kot posebno oznako (združi več telefonskih
                številk)
              </label>
            </div>

            {specialPlaceholderSettings.telefon.enabled && (
              <div className="ml-6 mt-2">
                <label
                  htmlFor="secondary-telefon"
                  className="block text-sm mb-1"
                >
                  Izberi še drugo telefonsko polje:
                  {specialPlaceholderSettings.telefon.secondaryField && (
                    <span className="text-green-600 ml-2">
                      (Samodejno izbrano polje)
                    </span>
                  )}
                </label>
                <select
                  id="secondary-telefon"
                  className="w-full p-2 border rounded-md"
                  value={specialPlaceholderSettings.telefon.secondaryField}
                  onChange={(e) =>
                    setSpecialPlaceholderSettings({
                      ...specialPlaceholderSettings,
                      telefon: {
                        ...specialPlaceholderSettings.telefon,
                        secondaryField: e.target.value,
                      },
                    })
                  }
                >
                  <option value="">-- Izberi drugo polje --</option>
                  {headers
                    // Only show unassigned headers and the currently selected secondary
                    .filter(
                      (header) =>
                        header ===
                          specialPlaceholderSettings.telefon.secondaryField ||
                        !mappings.some((m) => m.header === header),
                    )
                    .map((header, i) => (
                      <option key={i} value={header}>
                        {header}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      <ErrorAlert error={error} />

      <div className="pt-4">
        <Button
          onClick={generateDocuments}
          disabled={isProcessing || mappings.every((m) => !m.header)}
          className="w-full sm:w-auto"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Ustvarjanje ...
            </>
          ) : (
            <>Ustvari dokument</>
          )}
        </Button>
      </div>
    </div>
  );
};
