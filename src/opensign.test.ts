import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { assertId, buildUrl, safeHandler, jsonContent, DOC_TYPES, getApiToken } from "./opensign.js";

describe("assertId", () => {
  it("accepts a normal alphanumeric ID", () => {
    expect(() => assertId("abc123", "test")).not.toThrow();
  });

  it("accepts a single character", () => {
    expect(() => assertId("a", "test")).not.toThrow();
  });

  it("rejects an empty string", () => {
    expect(() => assertId("", "test")).toThrow(/Invalid test/);
  });

  it("rejects a string with slashes", () => {
    expect(() => assertId("../etc/passwd", "test")).toThrow(/Invalid test/);
  });

  it("rejects a string with dots", () => {
    expect(() => assertId("foo.bar", "test")).toThrow(/Invalid test/);
  });

  it("rejects a string with spaces", () => {
    expect(() => assertId("foo bar", "test")).toThrow(/Invalid test/);
  });

  it("rejects a string longer than 50 characters", () => {
    expect(() => assertId("a".repeat(51), "test")).toThrow(/Invalid test/);
  });

  it("accepts a 50-character string", () => {
    expect(() => assertId("a".repeat(50), "test")).not.toThrow();
  });
});

describe("buildUrl", () => {
  it("builds a URL with no params", () => {
    const url = buildUrl("/getuser");
    expect(url).toBe("https://app.opensignlabs.com/api/v1/getuser");
  });

  it("appends query params", () => {
    const url = buildUrl("/folderlist", { parentFolderId: "abc123" });
    expect(url).toContain("parentFolderId=abc123");
  });

  it("skips empty param values", () => {
    const url = buildUrl("/test", { a: "1", b: "", c: "3" });
    expect(url).toContain("a=1");
    expect(url).not.toContain("b=");
    expect(url).toContain("c=3");
  });
});

describe("safeHandler", () => {
  it("returns the handler result on success", async () => {
    const handler = safeHandler(async () => ({
      content: [{ type: "text" as const, text: "ok" }],
    }));
    const result = await handler({});
    expect(result.content[0].text).toBe("ok");
    expect(result).not.toHaveProperty("isError");
  });

  it("catches errors and returns isError: true", async () => {
    const handler = safeHandler(async () => {
      throw new Error("boom");
    });
    const result = await handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("boom");
  });

  it("handles non-Error throws", async () => {
    const handler = safeHandler(async () => {
      throw "string error";
    });
    const result = await handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("string error");
  });
});

describe("jsonContent", () => {
  it("serialises an object as pretty JSON", () => {
    const result = jsonContent({ foo: "bar" });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(JSON.parse(result.content[0].text)).toEqual({ foo: "bar" });
  });

  it("serialises an array", () => {
    const result = jsonContent([1, 2, 3]);
    expect(JSON.parse(result.content[0].text)).toEqual([1, 2, 3]);
  });

  it("serialises null", () => {
    const result = jsonContent(null);
    expect(result.content[0].text).toBe("null");
  });
});

describe("DOC_TYPES", () => {
  it("contains all expected statuses", () => {
    expect(DOC_TYPES).toContain("Draft");
    expect(DOC_TYPES).toContain("In-Progress");
    expect(DOC_TYPES).toContain("Completed");
    expect(DOC_TYPES).toContain("Expired");
    expect(DOC_TYPES).toContain("Declined");
    expect(DOC_TYPES).toHaveLength(5);
  });
});

describe("getApiToken", () => {
  const original = process.env.OPENSIGN_API_TOKEN;

  afterEach(() => {
    if (original !== undefined) {
      process.env.OPENSIGN_API_TOKEN = original;
    } else {
      delete process.env.OPENSIGN_API_TOKEN;
    }
  });

  it("returns the token when set", () => {
    process.env.OPENSIGN_API_TOKEN = "test-token-123";
    expect(getApiToken()).toBe("test-token-123");
  });

  it("throws when not set", () => {
    delete process.env.OPENSIGN_API_TOKEN;
    expect(() => getApiToken()).toThrow(/OPENSIGN_API_TOKEN/);
  });
});
