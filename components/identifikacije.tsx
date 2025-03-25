"use client";
import React, { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Upload,
  FileText,
  ChevronRight,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import JSZip, { loadAsync } from "jszip";

// Types
interface Mapping {
  placeholder: string;
  header: string;
  similarity?: number;
}

// Utility functions
const stringSimilarity = (str1: string, str2: string) => {
  // Normalize strings: lowercase and trim
  const a = str1.toLowerCase().trim();
  const b = str2.toLowerCase().trim();

  // Check for prefix/postfix/contains relationships
  if (b.startsWith(a) || b.endsWith(a)) {
    // Direct prefix or postfix match gets high score
    return 0.9;
  }

  if (b.includes(a)) {
    // String is contained somewhere in the middle
    return 0.8;
  }

  // Check if individual words match (for multi-word strings)
  const words1 = a.split(/\s+/);
  const words2 = b.split(/\s+/);

  // If any word is a direct match, give it a good score
  for (const word1 of words1) {
    if (word1.length < 3) continue; // Skip very short words

    for (const word2 of words2) {
      if (word2 === word1) {
        return 0.7;
      }

      // Check for prefix/postfix matches at the word level
      if (word2.startsWith(word1) || word2.endsWith(word1)) {
        return 0.6;
      }
    }
  }

  // Fall back to a modified Levenshtein but without length penalty
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1; // Both strings are empty

  // Simple Levenshtein distance implementation
  const matrix = Array(a.length + 1)
    .fill(0)
    .map(() => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  // Calculate normalized edit distance (0-1)
  // But don't penalize heavily for length differences
  const editDistance = matrix[a.length][b.length];

  // Calculate common prefix length as a boost factor
  let commonPrefixLength = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) commonPrefixLength++;
    else break;
  }

  // Final similarity score combining edit distance with prefix boost
  // The formula reduces the importance of length difference
  const rawScore =
    1 - editDistance / (a.length + b.length - commonPrefixLength);

  // Apply a diminishing returns curve to the score
  return 0.3 + rawScore * 0.2;
};

// Add this utility function at the top with the other utility functions
const applyPlaceholderCasing = (value: string, placeholder: string) => {
  // Check if placeholder is all uppercase
  if (placeholder === placeholder.toUpperCase()) {
    return value.toUpperCase();
  }
  // Check if placeholder has first letter uppercase (Title Case)
  else if (
    placeholder.length > 0 &&
    placeholder[0] === placeholder[0].toUpperCase() &&
    placeholder.slice(1) === placeholder.slice(1).toLowerCase()
  ) {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
  // Default to lowercase
  else {
    return value.toLowerCase();
  }
};

// Components
const ErrorAlert = ({ error }: { error: string }) => {
  if (!error) return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Napaka</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
};

const PasteDataStep = ({
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

const UploadTemplateStep = ({
  handleFileUpload,
  templateFile,
  isProcessing,
  error,
}: {
  handleFileUpload: (file: File) => void;
  templateFile: File | null;
  isProcessing: boolean;
  error: string;
}) => {
  return (
    <div className="space-y-2">
      <h3 className="font-medium">Naloži predlogo</h3>
      <p className="text-sm text-gray-500">
        Naloži dokument DOCX ali ODT z oznakami v stilu {"{oznaka}"} (npr:
        {"{ime}"}).
      </p>

      <div className="border-2 border-dashed rounded-md p-8 text-center">
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm mb-4">
          Povlecite in spustite svojo predlogo sem ali kliknite za brskanje
        </p>
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
        >
          {isProcessing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Obdelava ...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Izberi predlogo
            </>
          )}
        </Button>
      </div>

      {templateFile && (
        <div className="bg-green-50 p-4 rounded-md flex items-center">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          <span>
            Naložena predloga: <strong>{templateFile.name}</strong>
          </span>
        </div>
      )}

      <ErrorAlert error={error} />
    </div>
  );
};

const ReviewMappingsStep = ({
  mappings,
  headers,
  updateMapping,
  generateDocuments,
  isProcessing,
  error,
}: {
  mappings: Mapping[];
  headers: string[];
  updateMapping: (index: number, header: string) => void;
  generateDocuments: () => void;
  isProcessing: boolean;
  error: string;
}) => {
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

// Main component
const Identifikacije = () => {
  // State for managing the different steps
  const [activeStep, setActiveStep] = useState("paste");
  const [sheetData, setSheetData] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateContent, setTemplateContent] = useState<ArrayBuffer | null>(
    null,
  );
  const [placeholderMapping, setPlaceholderMapping] = useState<
    Map<string, string>
  >(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  // Parse pasted data
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
    } catch (err: any) {
      setError(
        "Failed to parse data. Please ensure it's properly formatted. " +
          err.message,
      );
      return false;
    }
  }, [sheetData]);

  // Handle file upload and extract placeholders
  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      setError("");

      const fileContent = await file.arrayBuffer();
      setTemplateFile(file);
      setTemplateContent(fileContent);

      // Extract placeholders from document
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(fileContent);

      // Try to get content based on document type (DOCX or ODT)
      let documentContent = "";
      const placeholderMap = new Map<string, string>(); // Maps readable names to actual XML

      if (file.name.endsWith(".docx")) {
        // For DOCX
        if (loadedZip.files["word/document.xml"]) {
          documentContent = await loadedZip
            .file("word/document.xml")!
            .async("string");

          // For DOCX, we need a special approach to handle split tags
          // First, normalize the XML by removing line breaks, which can help with regex
          const normalizedXml = documentContent.replace(/\s+/g, " ");

          // Use a regex that captures everything between { and } including XML tags
          const complexRegex = /\{((?:[^{}]|<[^>]*>)*)\}/g;
          const matches = [...normalizedXml.matchAll(complexRegex)];

          for (const match of matches) {
            const fullPlaceholder = match[0]; // The entire placeholder with XML tags

            // Extract just the text content from the placeholder
            // This regex extracts text between <w:t> tags
            const textContentRegex = /<w:t[^>]*>(.*?)<\/w:t>/g;
            const textMatches = [...fullPlaceholder.matchAll(textContentRegex)];

            if (textMatches.length > 0) {
              // Combine all text parts to get the readable name
              const readableName = textMatches
                .map((m) => m[1])
                .join("")
                .trim()
                .replace(/[\{\}]/g, ""); // Remove any leftover braces

              if (readableName) {
                placeholderMap.set(readableName, fullPlaceholder);
              }
            } else {
              // Simple placeholder without XML tags
              const simpleName = fullPlaceholder.replace(/[\{\}]/g, "");
              placeholderMap.set(simpleName, fullPlaceholder);
            }
          }
        }
      } else if (file.name.endsWith(".odt")) {
        // For ODT
        if (loadedZip.files["content.xml"]) {
          documentContent = await loadedZip
            .file("content.xml")!
            .async("string");

          // First, normalize XML by removing line breaks
          const normalizedXml = documentContent.replace(/\s+/g, " ");

          // Handle both simple and complex placeholders
          // First, look for opening braces
          const openBracePositions: number[] = [];
          for (let i = 0; i < normalizedXml.length; i++) {
            if (normalizedXml[i] === "{") {
              openBracePositions.push(i);
            }
          }

          // For each opening brace, find the matching closing brace
          // accounting for XML tags in between
          for (let pos of openBracePositions) {
            let bracketCount = 1;
            let endPos = -1;

            for (let i = pos + 1; i < normalizedXml.length; i++) {
              if (normalizedXml[i] === "{") bracketCount++;
              if (normalizedXml[i] === "}") bracketCount--;

              if (bracketCount === 0) {
                endPos = i;
                break;
              }
            }

            if (endPos > pos) {
              // Extract the full placeholder with XML
              const fullPlaceholder = normalizedXml.substring(pos, endPos + 1);

              // Extract text content by removing all XML tags
              let textContent = fullPlaceholder
                .replace(/<[^>]*>/g, "") // Remove all XML tags
                .replace(/\{|\}/g, ""); // Remove braces

              console.log("Found placeholder:", {
                fullPlaceholder,
                textContent,
              });

              if (textContent) {
                placeholderMap.set(textContent, fullPlaceholder);
              }
            }
          }

          // Also add simpler regex-based detection as fallback
          const regex = /\{([^{}]+)\}/g;
          const simpleMatches = [...normalizedXml.matchAll(regex)];

          for (const match of simpleMatches) {
            const placeholder = match[1].replace(/<[^>]*>/g, ""); // Remove any XML tags
            if (placeholder && !placeholderMap.has(placeholder)) {
              placeholderMap.set(placeholder, `{${placeholder}}`);
            }
          }
        }
      }

      if (!documentContent) {
        throw new Error("Could not extract content from document");
      }

      // Extract unique placeholders
      const extractedPlaceholders = [...new Set(placeholderMap.keys())];
      setPlaceholders(extractedPlaceholders);

      // Store the placeholder mapping in a ref or state for later use
      // You'll need to add this state
      setPlaceholderMapping(placeholderMap);

      // Create initial mappings based on similarity
      const initialMappings = extractedPlaceholders.map((placeholder) => {
        console.log("Finding best header for: " + placeholder);
        console.log("Available headers:", headers);
        // Find best matching header
        let bestHeader = "";
        let bestScore = 0;

        headers.forEach((header) => {
          const score = stringSimilarity(placeholder, header);
          console.log("Score for", header, ":", score);
          if (score > bestScore) {
            bestScore = score;
            bestHeader = header;
          }
        });

        return {
          placeholder,
          header: bestHeader,
          similarity: bestScore,
        };
      });

      setMappings(initialMappings);
      setActiveStep("review");
      setIsProcessing(false);
    } catch (err: any) {
      setError(`Error processing file: ${err.message}`);
      setIsProcessing(false);
    }
  };

  // Update header mapping for a placeholder
  const updateMapping = (index: number, header: string) => {
    const newMappings = [...mappings];
    newMappings[index] = {
      ...newMappings[index],
      header,
    };
    setMappings(newMappings);
  };

  // Generate merged documents and trigger download
  const generateDocuments = async () => {
    try {
      setIsProcessing(true);
      setError("");

      if (!templateContent || !templateFile) {
        throw new Error("Template file is missing");
      }

      // Create mapping dictionary for quick lookup
      const mappingDict = mappings.reduce(
        (dict: { [key: string]: string }, mapping: Mapping) => {
          dict[mapping.placeholder] = mapping.header;
          return dict;
        },
        {},
      );

      const zip = await loadAsync(templateContent);

      if (templateFile.name.endsWith(".docx")) {
        // Handle DOCX format
        const documentXml = await zip
          .file("word/document.xml")!
          .async("string");

        // Find the main content section in the document
        const bodyStartIndex = documentXml.indexOf("<w:body>");
        const bodyEndIndex = documentXml.lastIndexOf("</w:body>");

        if (bodyStartIndex === -1 || bodyEndIndex === -1) {
          throw new Error("Could not locate document body");
        }

        const bodyPrefix = documentXml.substring(0, bodyStartIndex + 8); // include "<w:body>"
        const bodySuffix = documentXml.substring(bodyEndIndex);
        const templateBody = documentXml.substring(
          bodyStartIndex + 8,
          bodyEndIndex,
        );

        // Count placeholders in the template to know how many fit per page
        const placeholderCount: Record<string, number> = {};
        placeholders.forEach((placeholder) => {
          const actualPlaceholder =
            placeholderMapping.get(placeholder) || `{${placeholder}}`;
          // Escape special regex characters
          const escapedPlaceholder = actualPlaceholder.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );
          const regex = new RegExp(escapedPlaceholder, "g");
          const matches = [...templateBody.matchAll(regex)];
          placeholderCount[placeholder] = matches.length;
        });

        // Create a page break element for DOCX
        const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

        let mergedBody = "";
        let currentRowIndex = 0;

        // Continue until all rows are processed
        while (currentRowIndex < rows.length) {
          // Make a copy of the template for this page
          let currentPageContent = templateBody;
          let placeholdersFilledOnThisPage = false;

          // Process each placeholder type
          for (const placeholder of placeholders) {
            const actualPlaceholder =
              placeholderMapping.get(placeholder) || `{${placeholder}}`;

            // Escape special regex characters in the actualPlaceholder
            const escapedPlaceholder = actualPlaceholder.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&",
            );

            const regex = new RegExp(escapedPlaceholder, "g");
            const header = mappingDict[placeholder];

            if (!header) continue;

            // Find all instances of this placeholder in the current page
            const matches = [...currentPageContent.matchAll(regex)];

            // Replace each instance with data from the next available row
            if (matches.length > 0) {
              placeholdersFilledOnThisPage = true;

              // Replace placeholders one by one with different rows
              let tempContent = currentPageContent;
              let lastIndex = 0;

              for (let i = 0; i < matches.length; i++) {
                if (currentRowIndex + i >= rows.length) break;

                const match = matches[i];
                const rowData = rows[currentRowIndex + i];
                let value = rowData[header] || "";

                // Apply casing only if it's not a telephone field
                if (!placeholder.toLowerCase().includes("telefon")) {
                  value = applyPlaceholderCasing(value, placeholder);
                } else {
                  value = getFormattedTelefonValue(
                    rowData,
                    placeholder,
                    mappingDict,
                  );
                }

                // Replace only this specific instance
                const beforeMatch = tempContent.substring(
                  0,
                  match.index! + lastIndex,
                );
                const afterMatch = tempContent.substring(
                  match.index! + match[0].length + lastIndex,
                );
                tempContent = beforeMatch + value + afterMatch;

                // Adjust for the change in string length after replacement
                lastIndex += value.length - match[0].length;
              }

              currentPageContent = tempContent;
            }
          }

          // Add this page to the output
          if (mergedBody.length > 0) {
            mergedBody += pageBreak;
          }
          mergedBody += currentPageContent;

          // Move to the next set of rows based on how many placeholders were filled
          // If no placeholders were filled on this page, move forward by 1 to avoid infinite loop
          currentRowIndex += placeholdersFilledOnThisPage
            ? Math.max(
                1,
                Math.min(
                  ...(Object.values(placeholderCount).filter(
                    (v) => v > 0,
                  ) as number[]),
                ),
              )
            : 1;
        }

        // Combine everything back
        const newDocumentXml = bodyPrefix + mergedBody + bodySuffix;
        zip.file("word/document.xml", newDocumentXml);
      } else if (templateFile.name.endsWith(".odt")) {
        // Similar approach for ODT
        const contentXml = await zip.file("content.xml")!.async("string");

        const bodyStartIndex = contentXml.indexOf("<office:body>");
        const textStartIndex = contentXml.indexOf(
          "<office:text>",
          bodyStartIndex,
        );
        const textEndIndex = contentXml.lastIndexOf("</office:text>");

        if (
          bodyStartIndex === -1 ||
          textStartIndex === -1 ||
          textEndIndex === -1
        ) {
          throw new Error("Could not locate document body");
        }

        const documentPrefix = contentXml.substring(0, textStartIndex + 13);
        const documentSuffix = contentXml.substring(textEndIndex);
        const templateContent = contentXml.substring(
          textStartIndex + 13,
          textEndIndex,
        );

        // Count placeholders in the template
        const placeholderCount: Record<string, number> = {};
        placeholders.forEach((placeholder) => {
          const regex = new RegExp(`\\{${placeholder}\\}`, "g");
          const matches = [...templateContent.matchAll(regex)];
          placeholderCount[placeholder] = matches.length;
        });

        const pageBreak =
          '<text:p text:style-name="Standard"><text:soft-page-break/></text:p>';

        let mergedContent = "";
        let currentRowIndex = 0;

        while (currentRowIndex < rows.length) {
          let currentPageContent = templateContent;
          let placeholdersFilledOnThisPage = false;

          // With:
          for (const placeholder of placeholders) {
            const actualPlaceholder =
              placeholderMapping.get(placeholder) || `{${placeholder}}`;

            // Escape special regex characters in the actualPlaceholder
            const escapedPlaceholder = actualPlaceholder.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&",
            );

            const regex = new RegExp(escapedPlaceholder, "g");
            const header = mappingDict[placeholder];

            if (!header) continue;

            const matches = [...currentPageContent.matchAll(regex)];

            if (matches.length > 0) {
              placeholdersFilledOnThisPage = true;

              let tempContent = currentPageContent;
              let lastIndex = 0;

              for (let i = 0; i < matches.length; i++) {
                if (currentRowIndex + i >= rows.length) break;

                const match = matches[i];
                const rowData = rows[currentRowIndex + i];

                let value = rowData[header] || "";

                // Apply casing only if it's not a telephone field
                if (!placeholder.toLowerCase().includes("telefon")) {
                  value = applyPlaceholderCasing(value, placeholder);
                } else {
                  value = getFormattedTelefonValue(
                    rowData,
                    placeholder,
                    mappingDict,
                  );
                }

                const beforeMatch = tempContent.substring(
                  0,
                  match.index! + lastIndex,
                );
                const afterMatch = tempContent.substring(
                  match.index! + match[0].length + lastIndex,
                );
                tempContent = beforeMatch + value + afterMatch;

                lastIndex += value.length - match[0].length;
              }

              currentPageContent = tempContent;
            }
          }

          if (mergedContent.length > 0) {
            mergedContent += pageBreak;
          }
          mergedContent += currentPageContent;

          currentRowIndex += placeholdersFilledOnThisPage
            ? Math.max(
                1,
                Math.min(...(Object.values(placeholderCount) as number[])),
              )
            : 1;
        }

        const newContentXml = documentPrefix + mergedContent + documentSuffix;
        zip.file("content.xml", newContentXml);
      }

      // Generate and download the file
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `merged_${templateFile.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setIsProcessing(false);
    } catch (err: any) {
      setError(`Error generating document: ${err.message}`);
      setIsProcessing(false);
    }
  };
  // Helper function for telefon formatting
  const getFormattedTelefonValue = (
    row: Record<string, string>,
    placeholder: string,
    mappingDict: { [key: string]: string },
  ) => {
    const telefonPlaceholders = placeholders.filter((p) =>
      p.toLowerCase().includes("telefon"),
    );

    const telefonHeaders = telefonPlaceholders
      .map((p) => mappingDict[p])
      .filter((header) => header && row[header]);

    const telefonValues = telefonHeaders
      .map((header) => row[header])
      .filter((value) => value && value.trim());

    if (telefonValues.length >= 2) {
      return `${telefonValues[0]} / ${telefonValues[1]}`;
    } else if (telefonValues.length === 1) {
      return telefonValues[0];
    }
    return "";
  };

  // Handle pasting data
  const handlePaste = () => {
    const success = parseSheetData();
    if (success) {
      setActiveStep("upload");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">Orodje za identifikacije</CardTitle>
          <CardDescription>
            Ustvari identifikacije iz podatkov v tabeli.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeStep} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="paste">1. Prilepi podatke</TabsTrigger>
              <TabsTrigger value="upload" disabled={headers.length === 0}>
                2. Naloži predlogo
              </TabsTrigger>
              <TabsTrigger value="review" disabled={!templateContent}>
                3. Preveri in ustvari
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paste">
              <PasteDataStep
                sheetData={sheetData}
                setSheetData={setSheetData}
                error={error}
                handlePaste={handlePaste}
              />
            </TabsContent>

            <TabsContent value="upload">
              <UploadTemplateStep
                handleFileUpload={handleFileUpload}
                templateFile={templateFile}
                isProcessing={isProcessing}
                error={error}
              />
            </TabsContent>

            <TabsContent value="review">
              <ReviewMappingsStep
                mappings={mappings}
                headers={headers}
                updateMapping={updateMapping}
                generateDocuments={generateDocuments}
                isProcessing={isProcessing}
                error={error}
              />
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="border-t pt-4 text-sm text-gray-500">
          Vse procesiranje se izvede na strani brskalnika. Vaši podatki nikoli
          ne zapustijo vašega brskalnika in niso poslani nikamor.
        </CardFooter>
      </Card>
    </div>
  );
};

export default Identifikacije;
