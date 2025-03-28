import { useState } from "react";
import { loadAsync } from "jszip";
import { getErrorMessage, Mapping } from "../types";
import {
  getFormattedRazredValue,
  getFormattedTelefonValue,
  applyPlaceholderCasing,
} from "../utils";

export const useDocumentGenerator = (
  rows: Record<string, string>[],
  placeholders: string[],
  placeholderMapping: Map<string, string>,
  mappings: Mapping[],
  specialPlaceholderSettings: {
    razred: { enabled: boolean };
    telefon: { enabled: boolean; secondaryField: string };
  },
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const generateDocuments = async (
    templateContent: ArrayBuffer,
    templateFile: File,
  ) => {
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

                let value = "";

                // Handle razred special case
                if (
                  specialPlaceholderSettings.razred.enabled &&
                  placeholder.toLowerCase().includes("razred")
                ) {
                  value = getFormattedRazredValue(rowData[header] || "");
                }
                // Handle telefon special case
                else if (
                  specialPlaceholderSettings.telefon.enabled &&
                  placeholder.toLowerCase().includes("telefon")
                ) {
                  value = getFormattedTelefonValue(
                    rowData,
                    placeholder,
                    mappingDict,
                    specialPlaceholderSettings.telefon.secondaryField,
                  );
                }
                // Normal case
                else {
                  value = rowData[header] || "";

                  // Apply casing only for non-special fields or when special handling is disabled
                  if (
                    (!placeholder.toLowerCase().includes("razred") ||
                      !specialPlaceholderSettings.razred.enabled) &&
                    (!placeholder.toLowerCase().includes("telefon") ||
                      !specialPlaceholderSettings.telefon.enabled)
                  ) {
                    value = applyPlaceholderCasing(value, placeholder);
                  }
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
        // ODT processing logic...
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

                let value = "";

                // Handle razred special case
                if (
                  specialPlaceholderSettings.razred.enabled &&
                  placeholder.toLowerCase().includes("razred")
                ) {
                  value = getFormattedRazredValue(rowData[header] || "");
                }
                // Handle telefon special case
                else if (
                  specialPlaceholderSettings.telefon.enabled &&
                  placeholder.toLowerCase().includes("telefon")
                ) {
                  value = getFormattedTelefonValue(
                    rowData,
                    placeholder,
                    mappingDict,
                    specialPlaceholderSettings.telefon.secondaryField,
                  );
                }
                // Normal case
                else {
                  value = rowData[header] || "";

                  // Apply casing only for non-special fields or when special handling is disabled
                  if (
                    (!placeholder.toLowerCase().includes("razred") ||
                      !specialPlaceholderSettings.razred.enabled) &&
                    (!placeholder.toLowerCase().includes("telefon") ||
                      !specialPlaceholderSettings.telefon.enabled)
                  ) {
                    value = applyPlaceholderCasing(value, placeholder);
                  }
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
      return true;
    } catch (err: unknown) {
      setError(`Error generating document: ${getErrorMessage(err)}`);
      setIsProcessing(false);
      return false;
    }
  };

  return {
    generateDocuments,
    isProcessing,
    error,
    setError,
  };
};
