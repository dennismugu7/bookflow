import { describe, expect, it } from "vitest";

import { imageSource, withVersion } from "./image-source";

const toUrl = (path: string) => `https://cdn.test/${path}`;

describe("imageSource", () => {
  it("is empty when nothing is picked or saved", () => {
    expect(imageSource({ path: null, remoteReady: false }, toUrl)).toBeUndefined();
  });

  it("shows the saved image with its version", () => {
    expect(imageSource({ path: "s/logo/a.jpg", remoteReady: true, version: 7 }, toUrl)).toBe(
      "https://cdn.test/s/logo/a.jpg?v=7",
    );
  });

  it("shows the picked file immediately, before and while it uploads", () => {
    // Picking resets remoteReady, so the old saved image is not shown over the new pick.
    expect(
      imageSource(
        { path: "s/logo/old.jpg", localUri: "file:///new.jpg", remoteReady: false },
        toUrl,
      ),
    ).toBe("file:///new.jpg");
    expect(
      imageSource({ path: null, localUri: "file:///new.jpg", remoteReady: false }, toUrl),
    ).toBe("file:///new.jpg");
  });

  it("keeps the picked file after upload until the remote copy has loaded", () => {
    expect(
      imageSource(
        { path: "s/logo/new.jpg", localUri: "file:///new.jpg", remoteReady: false },
        toUrl,
      ),
    ).toBe("file:///new.jpg");
  });

  it("switches to the remote copy once it has loaded", () => {
    expect(
      imageSource(
        { path: "s/logo/new.jpg", localUri: "file:///new.jpg", remoteReady: true, version: 9 },
        toUrl,
      ),
    ).toBe("https://cdn.test/s/logo/new.jpg?v=9");
  });
});

describe("withVersion", () => {
  it("adds or appends the version", () => {
    expect(withVersion("https://x.test/a.jpg", 1)).toBe("https://x.test/a.jpg?v=1");
    expect(withVersion("https://x.test/a.jpg?t=1", "2026-10-03T10:00:00Z")).toBe(
      "https://x.test/a.jpg?t=1&v=2026-10-03T10%3A00%3A00Z",
    );
    expect(withVersion("https://x.test/a.jpg", undefined)).toBe("https://x.test/a.jpg");
  });
});
