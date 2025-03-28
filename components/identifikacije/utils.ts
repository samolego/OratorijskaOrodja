/**
 * Calculates string similarity score between two strings.
 * @param str1 first string to compare
 * @param str2 second string to compare
 * @returns similarity score between 0 and 1
 */
export const stringSimilarity = (str1: string, str2: string) => {
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

/**
 * Applies placeholder casing to a value based on the placeholder's casing.
 * @param value The value to apply casing to.
 * @param placeholder The placeholder string to use as a reference.
 * @returns The value with the appropriate casing applied.
 */
export const applyPlaceholderCasing = (value: string, placeholder: string) => {
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
    return value
      .split(" ")
      .map((v) => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase())
      .join(" ");
  }
  // Default to lowercase
  else {
    return value.toLowerCase();
  }
};

/**
 * Formats the value of a telephone field, merging two numbers with a "/" separator.
 * @param row The row containing the telephone data.
 * @param placeholder The placeholder text for the telephone field.
 * @param mappingDict A dictionary mapping placeholder keys to column headers.
 * @param secondaryField The secondary field to use for formatting.
 * @returns The formatted telephone value.
 */
export const getFormattedTelefonValue = (
  row: Record<string, string>,
  placeholder: string,
  mappingDict: { [key: string]: string },
  secondaryField: string,
) => {
  // If special handling is disabled or no secondary field is selected, just return the primary value
  if (!secondaryField) {
    const header = mappingDict[placeholder];
    return header ? row[header] || "" : "";
  }

  // Get primary value (from the current placeholder's mapping)
  const primaryHeader = mappingDict[placeholder];
  const primaryValue = primaryHeader ? row[primaryHeader] || "" : "";

  // Get secondary value (from the selected secondary field)
  const secondaryValue = row[secondaryField] || "";

  // Format based on available values
  if (primaryValue && secondaryValue) {
    return `${primaryValue} / ${secondaryValue}`;
  } else if (primaryValue) {
    return primaryValue;
  } else if (secondaryValue) {
    return secondaryValue;
  }

  return "";
};

/**
 * Formats "razred" value, appending "razred" to the formatted number.
 * If value is 0, it is considered as "Predšolski".
 * @param value Razred value to format.
 * @returns Formatted razred value.
 */
export const getFormattedRazredValue = (value: string) => {
  if (!value || value.trim() === "") return "";

  // Try to parse as a number
  const numValue = parseInt(value.trim(), 10);

  // Check if it's a valid number
  if (isNaN(numValue)) return value;

  // Special case for 0
  if (numValue === 0) return "Predšolski";

  // Format as "X. razred"
  return `${numValue}. razred`;
};
