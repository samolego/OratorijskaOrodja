"use client";
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useSheetData } from "./hooks/use-sheet-data";
import { useFileProcessing } from "./hooks/use-file-processing";
import { useDocumentGenerator } from "./hooks/use-document-generator";
import { PasteDataStep } from "./steps/paste-data-step";
import { ReviewMappingsStep } from "./steps/review-mappings-step";
import { UploadTemplateStep } from "./steps/upload-template-step";

// Main component
const Identifikacije = () => {
  // State for managing the different steps
  const [activeStep, setActiveStep] = useState("paste");

  // Custom hooks
  const {
    sheetData,
    setSheetData,
    headers,
    rows,
    error: sheetError,
    parseSheetData,
  } = useSheetData();

  const {
    placeholders,
    mappings,
    templateFile,
    templateContent,
    placeholderMapping,
    specialPlaceholderSettings,
    setSpecialPlaceholderSettings,
    isProcessing: isFileProcessing,
    setIsProcessing: setFileProcessing,
    error: fileError,
    setError: setFileError,
    handleFileUpload,
    updateMapping,
  } = useFileProcessing(headers, setActiveStep);

  const {
    generateDocuments,
    isProcessing: isGenerating,
    error: generateError,
  } = useDocumentGenerator(
    rows,
    placeholders,
    placeholderMapping,
    mappings,
    specialPlaceholderSettings,
  );

  // Combined states for UI
  const error = sheetError || fileError || generateError;
  const isProcessing = isFileProcessing || isGenerating;

  // Handle pasting data
  const handlePaste = () => {
    const success = parseSheetData();
    if (success) {
      setActiveStep("upload");
    }
  };

  // Wrapper for document generation
  const handleGenerateDocuments = async () => {
    if (templateContent && templateFile) {
      await generateDocuments(templateContent, templateFile);
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
              <TabsTrigger value="paste" onClick={() => setActiveStep("paste")}>
                1. Prilepi podatke
              </TabsTrigger>
              <TabsTrigger
                value="upload"
                disabled={headers.length === 0}
                onClick={() =>
                  headers.length > 0 ? setActiveStep("upload") : null
                }
              >
                2. Naloži predlogo
              </TabsTrigger>
              <TabsTrigger
                value="review"
                disabled={!templateContent}
                onClick={() =>
                  templateContent ? setActiveStep("review") : null
                }
              >
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
                setIsProcessing={setFileProcessing}
                setError={setFileError}
                error={error}
              />
            </TabsContent>

            <TabsContent value="review">
              <ReviewMappingsStep
                mappings={mappings}
                headers={headers}
                updateMapping={updateMapping}
                generateDocuments={handleGenerateDocuments}
                isProcessing={isProcessing}
                error={error}
                specialPlaceholderSettings={specialPlaceholderSettings}
                setSpecialPlaceholderSettings={setSpecialPlaceholderSettings}
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
