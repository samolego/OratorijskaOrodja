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
  MoveDown,
  MoveUp,
} from "lucide-react";
import JSZip, { loadAsync } from "jszip";
import _ from "lodash";

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

// Components
const ErrorAlert = ({ error }: { error: string }) => {
  if (!error) return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
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
      <h3 className="font-medium">Paste your spreadsheet data</h3>
      <p className="text-sm text-gray-500">
        Copy data from Google Sheets or Excel and paste it below. The first row
        should contain column headers.
      </p>

      <Textarea
        placeholder="Paste your data here..."
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
          Continue <ChevronRight className="ml-2 h-4 w-4" />
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
      <h3 className="font-medium">Upload your document template</h3>
      <p className="text-sm text-gray-500">
        Upload a DOCX or ODT file with placeholders in the format{" "}
        {"{placeholder}"}.
      </p>

      <div className="border-2 border-dashed rounded-md p-8 text-center">
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm mb-4">
          Drag & drop your template file here, or click to browse
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
              Processing...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Select Template
            </>
          )}
        </Button>
      </div>

      {templateFile && (
        <div className="bg-green-50 p-4 rounded-md flex items-center">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          <span>
            Template uploaded: <strong>{templateFile.name}</strong>
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
      <h3 className="font-medium">Review field mappings</h3>
      <p className="text-sm text-gray-500">
        Match document placeholders with spreadsheet headers. Drag to reorder if
        needed.
      </p>

      <div className="border rounded-md p-4">
        <div className="grid grid-cols-5 gap-4 font-medium border-b pb-2 mb-2">
          <div className="col-span-2">Placeholder in Document</div>
          <div className="col-span-3">Spreadsheet Column</div>
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
              Generating...
            </>
          ) : (
            <>Generate Documents</>
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
  const [hasHeaders, setHasHeaders] = useState(true);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateContent, setTemplateContent] = useState<ArrayBuffer | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  // Parse pasted data
  const parseSheetData = useCallback(() => {
    try {
      if (!sheetData.trim()) return false;

      // Split by newlines and then by tabs or commas
      const lines = sheetData.trim().split("\n");
      if (lines.length < 2) {
        setError("Not enough data - need at least headers and one row");
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
    } catch (err) {
      setError("Failed to parse data. Please ensure it's properly formatted.");
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

      if (file.name.endsWith(".docx")) {
        // For DOCX
        if (loadedZip.files["word/document.xml"]) {
          documentContent = await loadedZip
            .file("word/document.xml")!
            .async("string");
        }
      } else if (file.name.endsWith(".odt")) {
        // For ODT
        if (loadedZip.files["content.xml"]) {
          documentContent = await loadedZip
            .file("content.xml")!
            .async("string");
        }
      }

      if (!documentContent) {
        throw new Error("Could not extract content from document");
      }

      // Find all placeholders with regex
      const regex = /\{([^{}]+)\}/g;
      const matches = [...documentContent.matchAll(regex)];
      const extractedPlaceholders = [
        ...new Set(matches.map((match) => match[1])),
      ];

      setPlaceholders(extractedPlaceholders);

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

      // Create mapping dictionary for quick lookup
      const mappingDict = mappings.reduce(
        (dict: { [key: string]: string }, mapping: Mapping) => {
          dict[mapping.placeholder] = mapping.header;
          return dict;
        },
        {},
      );

      // For simplicity, we'll just generate one document for the first data row
      const row = rows[0];

      if (!templateContent || !templateFile) {
        throw new Error("Template file is missing");
      }

      const zip = await loadAsync(templateContent);

      // Special handling for telefon placeholders
      const processPlaceholders = (content: string) => {
        let newContent = content;

        // Process regular placeholders
        placeholders.forEach((placeholder) => {
          // Skip "Telefon" placeholder as we'll handle it specially
          if (placeholder.toLowerCase().includes("telefon")) {
            return;
          }

          const header = mappingDict[placeholder];
          if (header && row[header] !== undefined) {
            const regex = new RegExp(`\\{${placeholder}\\}`, "g");
            newContent = newContent.replace(regex, row[header]);
          }
        });

        // Special handling for Telefon placeholder
        const telefonPlaceholders = placeholders.filter((p) =>
          p.toLowerCase().includes("telefon"),
        );

        if (telefonPlaceholders.length > 0) {
          // Find telefon headers
          const telefonHeaders = telefonPlaceholders
            .map((p) => mappingDict[p])
            .filter((header) => header && row[header]);

          // Get telefon values
          const telefonValues = telefonHeaders
            .map((header) => row[header])
            .filter((value) => value && value.trim());

          // Format telefon values
          let telefonText = "";
          if (telefonValues.length >= 2) {
            telefonText = `${telefonValues[0]} / ${telefonValues[1]}`;
          } else if (telefonValues.length === 1) {
            telefonText = telefonValues[0];
          }

          // Replace all telefon placeholders with the combined value
          telefonPlaceholders.forEach((placeholder) => {
            const regex = new RegExp(`\\{${placeholder}\\}`, "g");
            newContent = newContent.replace(regex, telefonText);
          });
        }

        return newContent;
      };

      // Process based on file type
      if (templateFile.name.endsWith(".docx")) {
        // For DOCX
        const contentXml = await zip.file("word/document.xml")!.async("string");
        const newContent = processPlaceholders(contentXml);
        zip.file("word/document.xml", newContent);
      } else if (templateFile.name.endsWith(".odt")) {
        // For ODT
        const contentXml = await zip.file("content.xml")!.async("string");
        const newContent = processPlaceholders(contentXml);
        zip.file("content.xml", newContent);
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
          <CardTitle className="text-2xl">Identifikacije Tool</CardTitle>
          <CardDescription>
            Create personalized documents from your spreadsheet data
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeStep} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="paste">1. Paste Data</TabsTrigger>
              <TabsTrigger value="upload" disabled={headers.length === 0}>
                2. Upload Template
              </TabsTrigger>
              <TabsTrigger value="review" disabled={!templateContent}>
                3. Review & Generate
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
          All processing is done client-side. Your data never leaves your
          browser.
        </CardFooter>
      </Card>
    </div>
  );
};

export default Identifikacije;
