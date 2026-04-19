import { describe, test, expect } from 'bun:test';
import {
  validateQuote,
  validateSubstantive,
  validateRequired,
  validateNonEmpty,
  validateRange,
} from '@core/validators';

describe('validateQuote', () => {
  test('should pass when quote is found in source', () => {
    const source = 'The quick brown fox jumps over the lazy dog';
    const quote = 'quick brown fox';
    expect(() => validateQuote(quote, source)).not.toThrow();
  });

  test('should fail when quote is not found in source', () => {
    const source = 'The quick brown fox';
    const quote = 'lazy dog';
    expect(() => validateQuote(quote, source)).toThrow('Quote not found in source');
  });

  test('should be case-sensitive', () => {
    const source = 'The Quick Brown Fox';
    const quote = 'quick brown fox';
    expect(() => validateQuote(quote, source)).toThrow();
  });
});

describe('validateSubstantive', () => {
  test('should pass for substantive content with enough words', () => {
    const text =
      'This is a well thought out argument with specific details and explanations that meet the minimum word count requirement.';
    expect(() => validateSubstantive(text)).not.toThrow();
  });

  test('should fail for too short content', () => {
    const text = 'Too short';
    expect(() => validateSubstantive(text, 20)).toThrow('Response too brief');
  });

  test('should count words correctly', () => {
    const text = 'one two three four five six seven eight nine ten';
    expect(() => validateSubstantive(text, 10)).not.toThrow();
    expect(() => validateSubstantive(text, 11)).toThrow('Response too brief');
  });

  test('should respect custom minimum word count', () => {
    const text = 'one two three four five';
    expect(() => validateSubstantive(text, 5)).not.toThrow();
    expect(() => validateSubstantive(text, 6)).toThrow();
  });
});

describe('validateRequired', () => {
  test('should pass when all fields are present', () => {
    const obj = { name: 'test', value: 42, flag: true };
    expect(() => validateRequired(obj, ['name', 'value'])).not.toThrow();
    expect(() => validateRequired(obj, ['name', 'value', 'flag'])).not.toThrow();
  });

  test('should fail when field is missing', () => {
    const obj = { name: 'test' };
    expect(() => validateRequired(obj, ['name', 'value'])).toThrow(
      'Missing required fields: value'
    );
  });

  test('should fail when multiple fields are missing', () => {
    const obj = { name: 'test' };
    expect(() => validateRequired(obj, ['value', 'flag'])).toThrow('Missing required fields');
  });

  test('should handle empty object', () => {
    const obj = {};
    expect(() => validateRequired(obj, ['name'])).toThrow('Missing required fields: name');
  });
});

describe('validateNonEmpty', () => {
  test('should pass for non-empty strings', () => {
    expect(() => validateNonEmpty('hello', 'message')).not.toThrow();
    expect(() => validateNonEmpty('a', 'message')).not.toThrow();
  });

  test('should fail for empty strings', () => {
    expect(() => validateNonEmpty('', 'message')).toThrow('message cannot be empty');
  });

  test('should fail for whitespace-only strings', () => {
    expect(() => validateNonEmpty('   ', 'message')).toThrow('message cannot be empty');
  });

  test('should use custom field name in error', () => {
    expect(() => validateNonEmpty('', 'evidence')).toThrow('evidence cannot be empty');
  });
});

describe('validateRange', () => {
  test('should pass for values within range', () => {
    expect(() => validateRange(5, 1, 10, 'value')).not.toThrow();
    expect(() => validateRange(1, 1, 10, 'value')).not.toThrow();
    expect(() => validateRange(10, 1, 10, 'value')).not.toThrow();
  });

  test('should fail for values below minimum', () => {
    expect(() => validateRange(0, 1, 10, 'value')).toThrow('value must be between 1 and 10');
  });

  test('should fail for values above maximum', () => {
    expect(() => validateRange(11, 1, 10, 'value')).toThrow('value must be between 1 and 10');
  });

  test('should use custom field name in error', () => {
    expect(() => validateRange(0, 1, 10, 'temperature')).toThrow(
      'temperature must be between 1 and 10'
    );
  });
});
