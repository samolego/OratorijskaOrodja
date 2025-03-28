import { useState } from "react";
import { loadAsync } from "jszip";
import { getErrorMessage, Mapping } from "../types";
import {
  getFormattedRazredValue,
  getFormattedTelefonValue,
  applyPlaceholderCasing,
} from "../utils";

// Base Document Processor class with shared functionality
abstract class DocumentProcessor {
  protected rows: Record<string, string>[];
  protected placeholders: string[];
  protected placeholderMapping: Map<string, string>;
  protected mappingDict: { [key: string]: string };
  protected specialPlaceholderSettings: {
    razred: { enabled: boolean };
    telefon: { enabled: boolean; secondaryField: string };
  };

  constructor(
    rows: Record<string, string>[],
    placeholders: string[],
    placeholderMapping: Map<string, string>,
    mappings: Mapping[],
    specialPlaceholderSettings: {
      razred: { enabled: boolean };
      telefon: { enabled: boolean; secondaryField: string };
    },
  ) {
    this.rows = rows;
    this.placeholders = placeholders;
    this.placeholderMapping = placeholderMapping;
    this.specialPlaceholderSettings = specialPlaceholderSettings;

    // Create mapping dictionary for quick lookup
    this.mappingDict = mappings.reduce(
      (dict: { [key: string]: string }, mapping: Mapping) => {
        dict[mapping.placeholder] = mapping.header;
        return dict;
      },
      {},
    );
  }

  // Main processing method with the common flow
  async process(zip: any, templateFile: File): Promise<any> {
    // Get document parts from the specific format
    const { prefix, content, suffix } = await this.extractDocumentParts(zip);

    // Count placeholders in the template
    const placeholderCount = this.getPlaceholderCount(content);

    // Get the page break format for this document type
    const pageBreak = this.getPageBreak();

    let mergedContent = "";
    let currentRowIndex = 0;

    // Continue until all rows are processed
    while (currentRowIndex < this.rows.length) {
      // Process the current page
      const { content: processedContent, placeholdersFilledOnThisPage } =
        this.replacePlaceholders(content, currentRowIndex);

      // Add this page to the output
      if (mergedContent.length > 0) {
        mergedContent += pageBreak;
      }
      mergedContent += processedContent;

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

    // Combine everything back and update the zip file
    await this.updateDocumentContent(zip, prefix + mergedContent + suffix);

    return zip;
  }

  // Abstract methods to be implemented by format-specific subclasses
  protected abstract extractDocumentParts(zip: any): Promise<{
    prefix: string;
    content: string;
    suffix: string;
  }>;

  protected abstract getPageBreak(): string;

  protected abstract updateDocumentContent(
    zip: any,
    newContent: string,
  ): Promise<void>;

  protected getPlaceholderCount(
    templateContent: string,
  ): Record<string, number> {
    const placeholderCount: Record<string, number> = {};
    this.placeholders.forEach((placeholder) => {
      const actualPlaceholder =
        this.placeholderMapping.get(placeholder) || `{${placeholder}}`;
      // Escape special regex characters
      const escapedPlaceholder = actualPlaceholder.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      const regex = new RegExp(escapedPlaceholder, "g");
      const matches = [...templateContent.matchAll(regex)];
      placeholderCount[placeholder] = matches.length;
    });
    return placeholderCount;
  }

  protected processValue(
    rowData: Record<string, string>,
    placeholder: string,
    header: string,
  ): string {
    let value = "";

    // Handle razred special case
    if (
      this.specialPlaceholderSettings.razred.enabled &&
      placeholder.toLowerCase().includes("razred")
    ) {
      value = getFormattedRazredValue(rowData[header] || "");
    }
    // Handle telefon special case
    else if (
      this.specialPlaceholderSettings.telefon.enabled &&
      placeholder.toLowerCase().includes("telefon")
    ) {
      value = getFormattedTelefonValue(
        rowData,
        placeholder,
        this.mappingDict,
        this.specialPlaceholderSettings.telefon.secondaryField,
      );
    }
    // Normal case
    else {
      value = rowData[header] || "";

      // Apply casing only for non-special fields or when special handling is disabled
      if (
        (!placeholder.toLowerCase().includes("razred") ||
          !this.specialPlaceholderSettings.razred.enabled) &&
        (!placeholder.toLowerCase().includes("telefon") ||
          !this.specialPlaceholderSettings.telefon.enabled)
      ) {
        value = applyPlaceholderCasing(value, placeholder);
      }
    }

    return value;
  }

  protected replacePlaceholders(
    templateContent: string,
    currentRowIndex: number,
  ): { content: string; placeholdersFilledOnThisPage: boolean } {
    let currentPageContent = templateContent;
    let placeholdersFilledOnThisPage = false;

    // Process each placeholder type
    for (const placeholder of this.placeholders) {
      const actualPlaceholder =
        this.placeholderMapping.get(placeholder) || `{${placeholder}}`;

      // Escape special regex characters in the actualPlaceholder
      const escapedPlaceholder = actualPlaceholder.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

      const regex = new RegExp(escapedPlaceholder, "g");
      const header = this.mappingDict[placeholder];

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
          if (currentRowIndex + i >= this.rows.length) break;

          const match = matches[i];
          const rowData = this.rows[currentRowIndex + i];
          const value = this.processValue(rowData, placeholder, header);

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

    return {
      content: currentPageContent,
      placeholdersFilledOnThisPage,
    };
  }
}

// DOCX Document Processor implementation
class DocxProcessor extends DocumentProcessor {
  protected async extractDocumentParts(zip: any): Promise<{
    prefix: string;
    content: string;
    suffix: string;
  }> {
    const documentXml = await zip.file("word/document.xml")!.async("string");

    // Find the main content section in the document
    const bodyStartIndex = documentXml.indexOf("<w:body>");
    const bodyEndIndex = documentXml.lastIndexOf("</w:body>");

    if (bodyStartIndex === -1 || bodyEndIndex === -1) {
      throw new Error("Could not locate document body");
    }

    return {
      prefix: documentXml.substring(0, bodyStartIndex + 8), // include "<w:body>"
      content: documentXml.substring(bodyStartIndex + 8, bodyEndIndex),
      suffix: documentXml.substring(bodyEndIndex),
    };
  }

  protected getPageBreak(): string {
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  }

  protected async updateDocumentContent(
    zip: any,
    newContent: string,
  ): Promise<void> {
    zip.file("word/document.xml", newContent);
  }
}

// ODT Document Processor implementation
class OdtProcessor extends DocumentProcessor {
  protected async extractDocumentParts(zip: any): Promise<{
    prefix: string;
    content: string;
    suffix: string;
  }> {
    const contentXml = await zip.file("content.xml")!.async("string");

    const bodyStartIndex = contentXml.indexOf("<office:body>");
    const textStartIndex = contentXml.indexOf("<office:text>", bodyStartIndex);
    const textEndIndex = contentXml.lastIndexOf("</office:text>");

    if (bodyStartIndex === -1 || textStartIndex === -1 || textEndIndex === -1) {
      throw new Error("Could not locate document body");
    }

    return {
      prefix: contentXml.substring(0, textStartIndex + 13),
      content: contentXml.substring(textStartIndex + 13, textEndIndex),
      suffix: contentXml.substring(textEndIndex),
    };
  }

  protected getPageBreak(): string {
    return '<text:p text:style-name="Standard"><text:soft-page-break/></text:p>';
  }

  protected async updateDocumentContent(
    zip: any,
    newContent: string,
  ): Promise<void> {
    zip.file("content.xml", newContent);
  }
}

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

      const zip = await loadAsync(templateContent);

      // Create the appropriate processor based on file type
      let processor: DocumentProcessor;
      if (templateFile.name.endsWith(".docx")) {
        processor = new DocxProcessor(
          rows,
          placeholders,
          placeholderMapping,
          mappings,
          specialPlaceholderSettings,
        );
      } else if (templateFile.name.endsWith(".odt")) {
        processor = new OdtProcessor(
          rows,
          placeholders,
          placeholderMapping,
          mappings,
          specialPlaceholderSettings,
        );
      } else {
        throw new Error("Unsupported file format. Please use .docx or .odt");
      }

      // Process the document
      await processor.process(zip, templateFile);

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
