import { describe, test, expect } from "bun:test";
import {
  InstitutionalError,
  ProviderError,
  ValidationError,
  FrameworkError,
  ErrorCode,
  type ErrorContext,
} from "../../core/errors";

describe("Error Hierarchy", () => {
  describe("instanceof chain", () => {
    test("ProviderError is instanceof InstitutionalError", () => {
      const cause = new Error("upstream error");
      const err = new ProviderError("provider failed", {
        code: ErrorCode.PROVIDER_API_ERROR,
        context: { frameworkName: "courtroom" },
        cause,
      });
      expect(err).toBeInstanceOf(InstitutionalError);
    });

    test("ValidationError is instanceof InstitutionalError", () => {
      const err = new ValidationError("bad input", {
        code: ErrorCode.VALIDATION_MISSING_INPUT,
        context: { frameworkName: "studio" },
      });
      expect(err).toBeInstanceOf(InstitutionalError);
    });

    test("FrameworkError is instanceof InstitutionalError", () => {
      const err = new FrameworkError("execution failed", {
        code: ErrorCode.FRAMEWORK_EXECUTION_FAILED,
        context: { frameworkName: "pre-mortem" },
      });
      expect(err).toBeInstanceOf(InstitutionalError);
    });
  });

  describe("ErrorCode", () => {
    test("error.code is a valid ErrorCode string enum value", () => {
      const err = new ProviderError("rate limited", {
        code: ErrorCode.PROVIDER_RATE_LIMITED,
        context: {},
        cause: new Error("429"),
      });
      expect(err.code).toBe(ErrorCode.PROVIDER_RATE_LIMITED);
      expect(typeof err.code).toBe("string");
      // All defined codes exist as string values
      const validCodes = Object.values(ErrorCode);
      expect(validCodes).toContain(err.code);
    });
  });

  describe("ErrorContext", () => {
    test("error.context contains frameworkName, agentName, model, prompt fields", () => {
      const context: ErrorContext = {
        frameworkName: "courtroom",
        agentName: "prosecutor",
        model: "claude-3-5-sonnet",
        prompt: "Is this argument valid?",
      };
      const err = new FrameworkError("execution failed", {
        code: ErrorCode.FRAMEWORK_EXECUTION_FAILED,
        context,
      });
      expect(err.context.frameworkName).toBe("courtroom");
      expect(err.context.agentName).toBe("prosecutor");
      expect(err.context.model).toBe("claude-3-5-sonnet");
      expect(err.context.prompt).toBe("Is this argument valid?");
    });
  });

  describe("cause chaining", () => {
    test("error.cause preserves the original error", () => {
      const originalError = new Error("original cause");
      const err = new ProviderError("provider failed", {
        code: ErrorCode.PROVIDER_API_ERROR,
        context: {},
        cause: originalError,
      });
      expect(err.cause).toBe(originalError);
    });
  });

  describe("error.name", () => {
    test("error.name equals the constructor name", () => {
      const cause = new Error("cause");
      const provider = new ProviderError("msg", {
        code: ErrorCode.PROVIDER_API_ERROR,
        context: {},
        cause,
      });
      const validation = new ValidationError("msg", {
        code: ErrorCode.VALIDATION_MISSING_INPUT,
        context: {},
      });
      const framework = new FrameworkError("msg", {
        code: ErrorCode.FRAMEWORK_EXECUTION_FAILED,
        context: {},
      });
      expect(provider.name).toBe("ProviderError");
      expect(validation.name).toBe("ValidationError");
      expect(framework.name).toBe("FrameworkError");
    });
  });

  describe("ProviderError cause requirement", () => {
    test("ProviderError requires cause (cause is present and not undefined)", () => {
      const cause = new Error("required cause");
      const err = new ProviderError("rate limited", {
        code: ErrorCode.PROVIDER_RATE_LIMITED,
        context: {},
        cause,
      });
      // cause must be defined — this test verifies it is not optional at runtime
      expect(err.cause).toBeDefined();
      expect(err.cause).toBe(cause);
    });
  });
});
