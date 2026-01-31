// Validation patterns for agent outputs

/**
 * Validate that a quote exists in the source text
 * Prevents hallucinated evidence
 */
export function validateQuote(quote: string, source: string): void {
  if (!source.includes(quote)) {
    throw new Error(`Quote not found in source: "${quote.substring(0, 100)}..."`);
  }
}

/**
 * Validate that a response meets minimum word count
 * Ensures substantive responses
 */
export function validateSubstantive(
  text: string,
  minWords: number = 10
): void {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < minWords) {
    throw new Error(
      `Response too brief: ${wordCount}/${minWords} words required`
    );
  }
}

/**
 * Validate that required fields are present in an object
 */
export function validateRequired<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): void {
  const missing = fields.filter((field) => !obj[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }
}

/**
 * Validate JSON structure matches expected shape
 */
export function validateStructure<T>(
  data: unknown,
  validator: (data: unknown) => data is T
): T {
  if (!validator(data)) {
    throw new Error("Data does not match expected structure");
  }
  return data;
}

/**
 * Validate that a string is not empty after trimming
 */
export function validateNonEmpty(text: string, fieldName: string = "Field"): void {
  if (!text || text.trim().length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
}

/**
 * Validate that a number is within a range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string = "Value"
): void {
  if (value < min || value > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}, got ${value}`);
  }
}
