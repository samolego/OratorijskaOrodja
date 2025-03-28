import { useState, useCallback } from "react";
import { getErrorMessage } from "../types";

export const useSheetData = () => {
  const [sheetData, setSheetData] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState("");

  const parseSheetData = useCallback(() => {
    try {
      if (!sheetData.trim()) return false;

      // Split by newlines and then by tabs or commas
      const lines = sheetData.trim().split("\n");
      if (lines.length < 2) {
        setError("Premalo podatkov - potrebna je vsaj glava in ena vrstica!");
        return false;
      }

      // Detect delimiter (tab or comma)
      const firstLine = lines[0];
      const delimiter = firstLine.includes("\t") ? "\t" : ",";

      // Extract headers and data
      const extractedHeaders = lines[0].split(delimiter);
      const extractedRows = lines.slice(1).map((line) => {
        const values = line.split(delimiter);
        return extractedHeaders.reduce(
          (obj: Record<string, string>, header, index) => {
            obj[header] = values[index] || "";
            return obj;
          },
          {},
        );
      });

      setHeaders(extractedHeaders);
      setRows(extractedRows);
      setError("");
      return true;
    } catch (err: unknown) {
      setError(`Error generating document: ${getErrorMessage(err)}`);
      return false;
    }
  }, [sheetData]);

  return {
    sheetData,
    setSheetData,
    headers,
    rows,
    error,
    setError,
    parseSheetData,
  };
};
