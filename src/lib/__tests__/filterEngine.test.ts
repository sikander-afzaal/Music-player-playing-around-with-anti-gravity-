import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TOP_ARTISTS, TOP_SONGS } from "../../data/spotifyData";
import {
  DEFAULT_FILTERS,
  filterAndSortArtists,
  filterAndSortSongs,
  computeArtistKpis,
  formatNumber,
  formatDelta,
} from "../filterEngine";
import {
  generateTotpCode,
  verifyTotpCode,
  isEmailAllowed,
  createSignedSessionToken,
  verifySignedSessionToken,
} from "../totpAuth";

describe("filterEngine", () => {
  it("returns all artists sorted by rank ascending with default filters", () => {
    const result = filterAndSortArtists(TOP_ARTISTS, DEFAULT_FILTERS);
    assert.ok(result.length >= 30, "Expected at least 30 artists in dataset");
    assert.equal(result[0].name, "Bruno Mars");
    assert.equal(result[1].name, "The Weeknd");
    assert.equal(result[2].name, "Rihanna");
  });

  it("filters artists by search query matching artist name or top track", () => {
    const result = filterAndSortArtists(TOP_ARTISTS, {
      ...DEFAULT_FILTERS,
      search: "Kendrick",
    });
    assert.equal(result.length, 2);
    assert.ok(result.some((a) => a.name === "Kendrick Lamar"));
    assert.ok(result.some((a) => a.name === "SZA"));
  });

  it("filters artists by momentum (gainers vs losers vs peak)", () => {
    const gainers = filterAndSortArtists(TOP_ARTISTS, {
      ...DEFAULT_FILTERS,
      momentum: "gainers",
    });
    assert.ok(gainers.length > 0);
    assert.ok(gainers.every((a) => a.dailyDelta > 0));

    const losers = filterAndSortArtists(TOP_ARTISTS, {
      ...DEFAULT_FILTERS,
      momentum: "losers",
    });
    assert.ok(losers.length > 0);
    assert.ok(losers.every((a) => a.dailyDelta < 0));

    const peaks = filterAndSortArtists(TOP_ARTISTS, {
      ...DEFAULT_FILTERS,
      momentum: "peak",
    });
    assert.ok(peaks.length > 0);
    assert.ok(peaks.every((a) => a.peakRank === 1));
  });

  it("applies country market scaling and re-ranks artists for regional views", () => {
    const brResult = filterAndSortArtists(TOP_ARTISTS, {
      ...DEFAULT_FILTERS,
      country: "BR",
    });
    assert.ok(brResult.length > 0);
    // Regional monthly listeners should be scaled down compared to global 123M
    assert.ok(brResult[0].monthlyListeners < 50_000_000);
  });

  it("sorts artists by dailyDelta descending when requested", () => {
    const sorted = filterAndSortArtists(TOP_ARTISTS, {
      ...DEFAULT_FILTERS,
      artistSortField: "dailyDelta",
      artistSortOrder: "desc",
    });
    assert.ok(sorted[0].dailyDelta >= sorted[1].dailyDelta);
    assert.ok(sorted[1].dailyDelta >= sorted[2].dailyDelta);
  });

  it("filters and sorts songs by genre and era", () => {
    const popSongs2020s = filterAndSortSongs(TOP_SONGS, {
      ...DEFAULT_FILTERS,
      genre: "Pop",
      era: "2020s",
    });
    assert.ok(popSongs2020s.length > 0);
    assert.ok(
      popSongs2020s.every(
        (s) => s.genre.toLowerCase() === "pop" && s.era === "2020s"
      )
    );
  });

  it("computes accurate KPI summary metrics from filtered artists", () => {
    const kpis = computeArtistKpis(TOP_ARTISTS);
    assert.equal(kpis.leader?.name, "Bruno Mars");
    assert.ok((kpis.topGainer?.dailyDelta ?? 0) > 0);
    assert.ok((kpis.biggestDrop?.dailyDelta ?? 0) < 0);
    assert.ok(kpis.totalListeners > 1_000_000_000);
  });

  it("formats numbers and daily deltas cleanly", () => {
    assert.equal(formatNumber(123001628), "123,001,628");
    assert.equal(formatDelta(408975), "+408,975");
    assert.equal(formatDelta(-299084), "-299,084");
  });

  it("verifies RFC 6238 TOTP codes, allowlist emails, and signed session tokens", () => {
    const secret = "JBSWY3DPEHPK3PXP247AC5LQMVZGC43F";
    const now = 1_750_000_000_000;
    const code = generateTotpCode(secret, now);
    assert.equal(code.length, 6);
    assert.ok(verifyTotpCode(code, secret, now));
    // Adjacent 30s step should also pass within ±1 window
    assert.ok(verifyTotpCode(code, secret, now + 29_000));
    // Wrong code should fail
    assert.equal(verifyTotpCode("000000", secret, now), code === "000000");

    assert.ok(isEmailAllowed("sikander.aaa@gmail.com"));
    assert.ok(!isEmailAllowed("intruder@example.com"));

    const token = createSignedSessionToken("sikander.aaa@gmail.com");
    const verified = verifySignedSessionToken(token);
    assert.ok(verified);
    assert.equal(verified?.email, "sikander.aaa@gmail.com");
    assert.equal(verifySignedSessionToken(token + "tampered"), null);
  });
});
