import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isPanoramaDateExpired, panoramaOldestVisibleDay } from "./retention";

test("7 calendar dates: November 5 expires on November 12 in São Paulo", () => {
  const now = new Date("2026-11-12T14:00:00Z");
  assert.equal(panoramaOldestVisibleDay(now), "2026-11-06");
  assert.equal(isPanoramaDateExpired("2026-11-05", now), true);
  assert.equal(isPanoramaDateExpired("2026-11-06", now), false);
  assert.equal(isPanoramaDateExpired("2026-11-12", now), false);
});

test("retention boundary uses Brazil date around midnight UTC", () => {
  assert.equal(panoramaOldestVisibleDay(new Date("2026-11-13T02:59:00Z")), "2026-11-06");
  assert.equal(panoramaOldestVisibleDay(new Date("2026-11-13T03:01:00Z")), "2026-11-07");
});

test("crossing months and years remains valid", () => {
  assert.equal(panoramaOldestVisibleDay(new Date("2027-01-02T12:00:00Z")), "2026-12-27");
});
