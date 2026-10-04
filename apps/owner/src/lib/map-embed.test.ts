import { mapsEmbedUrl } from "@bookflow/shared";
import { describe, expect, it } from "vitest";

import { isMapEmbedUrl, mapEmbedHtml, mapQuery } from "./map-embed";

describe("isMapEmbedUrl", () => {
  it("allows Google's keyless embed and the page it redirects to", () => {
    expect(isMapEmbedUrl(mapsEmbedUrl("-1.2921,36.7853"))).toBe(true);
    expect(isMapEmbedUrl(mapsEmbedUrl("Galana Plaza, Kilimani"))).toBe(true);
    expect(
      isMapEmbedUrl("https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1s-1.2921,36.7853"),
    ).toBe(true);
  });

  it("blocks other Google Maps pages", () => {
    expect(isMapEmbedUrl("https://maps.google.com/maps?q=Galana")).toBe(false);
    expect(isMapEmbedUrl("https://www.google.com/maps/place/Galana+Plaza")).toBe(false);
    expect(isMapEmbedUrl("https://www.google.com/maps/embedded")).toBe(false);
    expect(isMapEmbedUrl("https://maps.app.goo.gl/abc123")).toBe(false);
    expect(isMapEmbedUrl("https://www.google.com/search?q=salon")).toBe(false);
    expect(isMapEmbedUrl("https://accounts.google.com/ServiceLogin")).toBe(false);
  });

  it("blocks other origins, schemes and look-alike hosts", () => {
    expect(isMapEmbedUrl("http://maps.google.com/maps?q=x&output=embed")).toBe(false);
    expect(isMapEmbedUrl("https://maps.google.com.evil.example/maps?q=x&output=embed")).toBe(false);
    expect(isMapEmbedUrl("https://evil.example/maps/embed?pb=x")).toBe(false);
    expect(isMapEmbedUrl("https://www.google.com@evil.example/maps/embed")).toBe(false);
    expect(isMapEmbedUrl("https://maps.google.com:8443/maps?q=x&output=embed")).toBe(false);
    expect(isMapEmbedUrl("file:///data/data/com.mugulabs.bookflow/secret")).toBe(false);
    expect(isMapEmbedUrl("javascript:alert(1)")).toBe(false);
    expect(isMapEmbedUrl("intent://maps#Intent;end")).toBe(false);
    expect(isMapEmbedUrl("about:blank")).toBe(false);
    expect(isMapEmbedUrl("not a url")).toBe(false);
  });
});

describe("mapQuery", () => {
  const address = "2nd floor, Galana Plaza, Kilimani";

  it("uses the saved pin first", () => {
    expect(mapQuery({ lat: -1.2921, lng: 36.7853, placeName: "Galana Plaza", address })).toBe(
      "-1.2921,36.7853",
    );
  });

  it("falls back to the place name from the link, then the address", () => {
    expect(mapQuery({ lat: null, lng: null, placeName: "Galana Plaza", address })).toBe(
      "Galana Plaza",
    );
    expect(mapQuery({ lat: null, lng: null, placeName: null, address })).toBe(address);
    expect(mapQuery({ lat: -1.2921, lng: null, placeName: " ", address: "  " })).toBeNull();
  });
});

describe("mapEmbedHtml", () => {
  it("holds Google's embed for the query in an iframe", () => {
    const html = mapEmbedHtml("-1.29207,36.78614");
    expect(html).toContain(JSON.stringify(mapsEmbedUrl("-1.29207,36.78614")));
    expect(html).toContain('createElement("iframe")');
  });

  it("keeps a hostile query inside the script string", () => {
    const html = mapEmbedHtml('"</script><script>alert(1)</script>');
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).not.toContain("<script>alert");
  });

  it("only loads Google URLs", () => {
    const urls = mapEmbedHtml("Galana Plaza").match(/https?:\/\/[^"'\s)]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls)
      expect(new URL(url).origin).toMatch(/^https:\/\/(maps|www)\.google\.com$/);
  });
});
