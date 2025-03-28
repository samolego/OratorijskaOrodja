import { useState } from "react";
import JSZip from "jszip";
import { getErrorMessage, Mapping } from "../types";
import { stringSimilarity } from "../utils";

export const useFileProcessing = (
  headers: string[],
  setActiveStep: (step: string) => void,
) => {
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateContent, setTemplateContent] = useState<ArrayBuffer | null>(
    null,
  );
  const [placeholderMapping, setPlaceholderMapping] = useState<
    Map<string, string>
  >(new Map());
  const [specialPlaceholderSettings, setSpecialPlaceholderSettings] = useState({
    razred: { enabled: true },
    telefon: { enabled: true, secondaryField: "" },
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

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
        // DOCX processing logic
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
        // ODT processing logic
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
          for (const pos of openBracePositions) {
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
              const textContent = fullPlaceholder
                .replace(/<[^>]*>/g, "") // Remove all XML tags
                .replace(/\{|\}/g, ""); // Remove braces

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

      // Store the placeholder mapping
      setPlaceholderMapping(placeholderMap);

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
          header: bestHeader,
          similarity: bestScore,
        };
      });

      const telefonPlaceholders = extractedPlaceholders.filter((placeholder) =>
        placeholder.toLowerCase().includes("telefon"),
      );

      // If we have telefon placeholders, try to find a secondary field
      if (telefonPlaceholders.length > 0) {
        // Get the headers that are already assigned as primary
        const assignedHeaders = initialMappings
          .filter((m) => m.header) // Only consider mappings with assigned headers
          .map((m) => m.header);

        // Find available headers (not yet assigned)
        const availableHeaders = headers.filter(
          (header) => !assignedHeaders.includes(header),
        );

        // Look for a header that might be a good secondary telefon field
        let bestSecondaryHeader = "";
        let bestScore = 0;

        availableHeaders.forEach((header) => {
          // Try to find headers with "telefon", "mobile", "gsm", "cell" etc.
          const keywords = ["telefon", "tel", "mobile", "mobil", "gsm", "cell"];

          // Check if header contains any of the keywords
          const containsKeyword = keywords.some((keyword) =>
            header.toLowerCase().includes(keyword),
          );

          if (containsKeyword) {
            const score = 0.8; // High score for keyword match

            if (score > bestScore) {
              bestScore = score;
              bestSecondaryHeader = header;
            }
          } else {
            // For non-keyword headers, use string similarity but with lower weight
            telefonPlaceholders.forEach((placeholder) => {
              const score = stringSimilarity(placeholder, header) * 0.7; // 70% weight

              if (score > bestScore) {
                bestScore = score;
                bestSecondaryHeader = header;
              }
            });
          }
        });

        // If we found a good secondary field and the score is decent
        if (bestSecondaryHeader && bestScore > 0.4) {
          // Enable telefon special handling and set the secondary field
          setSpecialPlaceholderSettings((prev) => ({
            ...prev,
            telefon: {
              enabled: true,
              secondaryField: bestSecondaryHeader,
            },
          }));
        }
      }

      setMappings(initialMappings);
      setActiveStep("review");
      setIsProcessing(false);
    } catch (err: unknown) {
      setError(`Error processing file: ${getErrorMessage(err)}`);
      setIsProcessing(false);
    }
  };

  const updateMapping = (index: number, header: string) => {
    const newMappings = [...mappings];
    newMappings[index] = {
      ...newMappings[index],
      header,
    };
    setMappings(newMappings);
  };

  return {
    placeholders,
    mappings,
    templateFile,
    templateContent,
    placeholderMapping,
    specialPlaceholderSettings,
    setSpecialPlaceholderSettings,
    isProcessing,
    setIsProcessing,
    error,
    setError,
    handleFileUpload,
    updateMapping,
  };
};
