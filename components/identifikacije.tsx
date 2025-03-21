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

// Main component
const Identifikacije = () => {
  // State for managing the different steps
  const [activeStep, setActiveStep] = useState("paste");
  const [sheetData, setSheetData] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [placeholders, setPlaceholders] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [templateFile, setTemplateFile] = useState(null);
  const [templateContent, setTemplateContent] = useState(null);
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
        return extractedHeaders.reduce((obj: any, header, index) => {
          obj[header] = values[index] || "";
          return obj;
        }, {});
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

  // Calculate string similarity for placeholder matching
  const stringSimilarity = (str1: string, str2: string) => {
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();

    // Simple Levenshtein distance implementation
    const matrix = Array(str1.length + 1)
      .fill(0)
      .map(() => Array(str2.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= str2.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost, // substitution
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1; // Both strings are empty

    // Convert distance to similarity score (0-1)
    return 1 - matrix[str1.length][str2.length] / maxLength;
  };

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
        // Find best matching header
        let bestHeader = "";
        let bestScore = 0;

        headers.forEach((header) => {
          const score = stringSimilarity(placeholder, header);
          if (score > bestScore) {
            bestScore = score;
            bestHeader = header;
          }
        });

        return {
          placeholder,
          header: bestScore > 0.5 ? bestHeader : "",
          similarity: bestScore,
        };
      });

      setMappings(initialMappings);
      setActiveStep("review");
      setIsProcessing(false);
    } catch (err) {
      setError(`Error processing file: ${err.message}`);
      setIsProcessing(false);
    }
  };

  // Move mapping up or down in the list
  const movePlaceholder = (index: number, direction: string) => {
    if (direction === "up" && index > 0) {
      const newMappings = [...mappings];
      [newMappings[index], newMappings[index - 1]] = [
        newMappings[index - 1],
        newMappings[index],
      ];
      setMappings(newMappings);
    } else if (direction === "down" && index < mappings.length - 1) {
      const newMappings = [...mappings];
      [newMappings[index], newMappings[index + 1]] = [
        newMappings[index + 1],
        newMappings[index],
      ];
      setMappings(newMappings);
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
        (
          dict: { [key: string]: string },
          mapping: { placeholder: string; header: string },
        ) => {
          dict[mapping.placeholder] = mapping.header;
          return dict;
        },
        {},
      );

      // For simplicity, we'll just generate one document for the first data row
      // In a full implementation, you'd loop through all rows and/or create a ZIP
      const row = rows[0];

      const zip = await loadAsync(templateContent);

      // Process based on file type
      if (templateFile!.name.endsWith(".docx")) {
        // For DOCX
        const contentXml = await zip.file("word/document.xml").async("string");
        let newContent = contentXml;

        // Replace all placeholders
        placeholders.forEach((placeholder) => {
          const header = mappingDict[placeholder];
          if (header && row[header] !== undefined) {
            const regex = new RegExp(`\\{${placeholder}\\}`, "g");
            newContent = newContent.replace(regex, row[header]);
          }
        });

        zip.file("word/document.xml", newContent);
      } else if (templateFile.name.endsWith(".odt")) {
        // For ODT
        const contentXml = await zip.file("content.xml").async("string");
        let newContent = contentXml;

        // Replace all placeholders
        placeholders.forEach((placeholder) => {
          const header = mappingDict[placeholder];
          if (header && row[header] !== undefined) {
            const regex = new RegExp(`\\{${placeholder}\\}`, "g");
            newContent = newContent.replace(regex, row[header]);
          }
        });

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
    } catch (err) {
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
            {/* Step 1: Paste Sheet Data */}
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="paste">1. Paste Data</TabsTrigger>
              <TabsTrigger value="upload" disabled={headers.length === 0}>
                2. Upload Template
              </TabsTrigger>
              <TabsTrigger value="review" disabled={!templateContent}>
                3. Review & Generate
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Paste your spreadsheet data</h3>
                <p className="text-sm text-gray-500">
                  Copy data from Google Sheets or Excel and paste it below. The
                  first row should contain column headers.
                </p>

                <Textarea
                  placeholder="Paste your data here..."
                  className="min-h-48"
                  value={sheetData}
                  onChange={(e) => setSheetData(e.target.value)}
                />

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

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
            </TabsContent>

            {/* Step 2: Upload Document */}
            <TabsContent value="upload" className="space-y-4">
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
                      const file = e.target.files[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      document.getElementById("template-upload").click()
                    }
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

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            {/* Step 3: Review and Generate */}
            <TabsContent value="review" className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Review field mappings</h3>
                <p className="text-sm text-gray-500">
                  Match document placeholders with spreadsheet headers. Drag to
                  reorder if needed.
                </p>

                <div className="border rounded-md p-4">
                  <div className="grid grid-cols-5 gap-4 font-medium border-b pb-2 mb-2">
                    <div className="col-span-2">Placeholder in Document</div>
                    <div className="col-span-3">Spreadsheet Column</div>
                  </div>

                  {mappings.map((mapping, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-5 gap-4 items-center py-2"
                    >
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

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

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
