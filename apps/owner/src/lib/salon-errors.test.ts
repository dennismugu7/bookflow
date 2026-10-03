import { describe, expect, it } from "vitest";

import {
  cleanSlugInput,
  createSalonErrorMessage,
  suggestSlug,
  validateSalonForm,
} from "./salon-errors";

describe("createSalonErrorMessage", () => {
  it("maps a taken slug", () => {
    expect(createSalonErrorMessage({ code: "23505" })).toEqual({
      field: "slug",
      message: "That link is taken, try another",
    });
  });
  it("maps a slug the database rejects", () => {
    expect(createSalonErrorMessage({ code: "23514" })).toEqual({
      field: "slug",
      message: "Use letters, numbers and hyphens",
    });
  });
  it("falls back to a form error", () => {
    expect(createSalonErrorMessage({ code: "42501" }).field).toBe("form");
    expect(createSalonErrorMessage(null).field).toBe("form");
  });
});

describe("validateSalonForm", () => {
  it("accepts a valid form", () => {
    expect(validateSalonForm("Salome Salon", "salome-salon")).toEqual({});
  });
  it("needs a name", () => {
    expect(validateSalonForm("   ", "salome-salon").name).toBeDefined();
  });
  it("limits the name to 80 characters", () => {
    expect(validateSalonForm("a".repeat(81), "salome-salon").name).toBeDefined();
  });
  it.each(["Salome", "salome--salon", "-salome", "salome_salon"])("rejects the slug %j", (slug) => {
    expect(validateSalonForm("Salome", slug).slug).toBe("Use letters, numbers and hyphens");
  });
  it.each(["ab", "a".repeat(41)])("rejects the slug length of %j", (slug) => {
    expect(validateSalonForm("Salome", slug).slug).toBe("Use 3 to 40 characters");
  });
});

describe("slug helpers", () => {
  it("suggests a slug from the name, or nothing", () => {
    expect(suggestSlug("Salome Salon")).toBe("salome-salon");
    expect(suggestSlug("AB")).toBe("");
  });
  it("cleans typed slugs", () => {
    expect(cleanSlugInput("Salome Salon")).toBe("salome-salon");
  });
});
