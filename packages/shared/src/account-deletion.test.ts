import { describe, expect, it } from "vitest";

import {
  canContinueDeletion,
  deletionConfirmParts,
  deletionCounter,
  deletionStatement,
  isDeletionReason,
  parseDeletionSummary,
  upcomingWarningParts,
} from "./account-deletion";

const text = (parts: { text: string }[]) => parts.map((p) => p.text).join("");

describe("canContinueDeletion", () => {
  it("needs a reason", () => {
    expect(canContinueDeletion(undefined, "")).toBe(false);
    expect(canContinueDeletion("accident", "")).toBe(true);
  });

  it("needs some text for Something else", () => {
    expect(canContinueDeletion("other", "   ")).toBe(false);
    expect(canContinueDeletion("other", "Moving to a new town")).toBe(true);
  });

  it("refuses more than 300 characters", () => {
    expect(canContinueDeletion("other", "a".repeat(300))).toBe(true);
    expect(canContinueDeletion("other", "a".repeat(301))).toBe(false);
  });
});

describe("deletionCounter", () => {
  it("shows only close to the limit", () => {
    expect(deletionCounter("a".repeat(249))).toBeNull();
    expect(deletionCounter("a".repeat(262))).toBe("262/300");
  });
});

describe("isDeletionReason", () => {
  it("accepts only the four reasons", () => {
    expect(isDeletionReason("other_app")).toBe(true);
    expect(isDeletionReason("bored")).toBe(false);
    expect(isDeletionReason(null)).toBe(false);
  });
});

describe("parseDeletionSummary", () => {
  it("reads the RPC's JSON", () => {
    expect(
      parseDeletionSummary({
        email: "owner@example.test",
        salons: [{ id: "a", name: "Salome Saloon", upcoming: 4 }],
      }),
    ).toEqual({
      email: "owner@example.test",
      salons: [{ id: "a", name: "Salome Saloon", upcoming: 4 }],
    });
  });

  it("returns null for anything else", () => {
    expect(parseDeletionSummary(null)).toBeNull();
    expect(parseDeletionSummary({ salons: [{ id: 1 }] })).toBeNull();
  });
});

describe("deletionConfirmParts", () => {
  it("names one salon in bold", () => {
    const parts = deletionConfirmParts([{ name: "Salome Saloon" }]);
    expect(parts).toContainEqual({ text: "Salome Saloon", bold: true });
    expect(text(parts)).toBe(
      "This action will delete your account and Salome Saloon, with its bookings, clients and photos, and you won't be able to retrieve it. Please confirm you understand by ticking the below statement:",
    );
  });

  it("joins several salons", () => {
    expect(text(deletionConfirmParts([{ name: "A" }, { name: "B" }, { name: "C" }]))).toContain(
      "your account and A, B and C, with their bookings, clients and photos, and you won't be able to retrieve them.",
    );
  });

  it("says just your account without a salon", () => {
    expect(text(deletionConfirmParts([]))).toBe(
      "This action will delete your account, and you won't be able to retrieve it. Please confirm you understand by ticking the below statement:",
    );
  });
});

describe("deletionStatement", () => {
  it("matches the person", () => {
    expect(deletionStatement(1)).toBe("I know I won't be able to access my client bookings.");
    expect(deletionStatement(0)).toBe("I know I won't be able to access my bookings.");
  });
});

describe("upcomingWarningParts", () => {
  it("appears only with upcoming bookings", () => {
    expect(upcomingWarningParts([])).toBeNull();
    expect(upcomingWarningParts([{ upcoming: 0 }])).toBeNull();
  });

  it("counts every salon's upcoming bookings", () => {
    const parts = upcomingWarningParts([{ upcoming: 3 }, { upcoming: 1 }]);
    expect(parts).toContainEqual({ text: "4 upcoming bookings", bold: true });
    expect(text(parts ?? [])).toBe(
      "You have 4 upcoming bookings. Clients aren't told automatically, so let them know first.",
    );
  });

  it("is singular for one", () => {
    expect(upcomingWarningParts([{ upcoming: 1 }])).toContainEqual({
      text: "1 upcoming booking",
      bold: true,
    });
  });
});
