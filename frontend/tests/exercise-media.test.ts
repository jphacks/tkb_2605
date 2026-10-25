import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import master from "../src/features/exercises/serverCatalogData.json" with { type: "json" };
import media from "../src/features/exercises/exerciseMedia.json" with { type: "json" };

const visuals: Record<string, { sourceId: string; src: string; width: number; height: number; crop: number[]; sha256: string }> = media.exercises;
const equipment: Record<string, string> = media.equipment;
const publicRoot = new URL("../public/", import.meta.url);

test("every selectable exercise has its own local, verified artwork and an in-bounds crop", () => {
  assert.deepEqual(Object.keys(visuals).sort(), master.exercises.map(e => e.exercise_id).sort());
  assert.equal(new Set(Object.values(visuals).map(v => v.sourceId)).size, master.exercises.length);
  for (const exercise of master.exercises) {
    const image = visuals[exercise.exercise_id];
    assert.match(image.src, /^\/images\/exercises\/[a-z0-9-]+\.webp$/);
    const bytes = readFileSync(new URL(image.src.slice(1), publicRoot));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), image.sha256, exercise.display_name);
    assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
    assert.equal(image.crop.length, 4);
    assert.ok(image.crop.every(Number.isInteger));
    const [x, y, width, height] = image.crop;
    assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0, exercise.display_name);
    assert.ok(x + width <= image.width && y + height <= image.height, exercise.display_name);
  }
});

test("every concrete apparatus has a local passive SVG, while aggregate filters stay text-only", () => {
  for (const item of master.equipment) {
    if (item.name === "自重" || media.aggregateEquipmentIds.includes(item.equipment_id)) continue;
    const path = equipment[item.equipment_id];
    assert.match(path, /^\/images\/equipment\/[a-z0-9-]+\.svg$/, item.name);
    const svg = readFileSync(new URL(path.slice(1), publicRoot), "utf8");
    assert.match(svg, /<svg\b/);
    assert.doesNotMatch(svg, /<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|\/\/|javascript:)/i);
  }
  assert.equal(readdirSync(new URL("images/exercises/", publicRoot)).length, Object.keys(visuals).length);
  assert.equal(readdirSync(new URL("images/equipment/", publicRoot)).length, Object.keys(equipment).length);
});

test("all seven body regions and varied equipment have meaningful selectable coverage", () => {
  assert.equal(master.body_parts.length, 7);
  for (const part of master.body_parts) {
    assert.ok(master.exercises.filter(e => e.body_part_ids.includes(part.body_part_id)).length >= 10, part.name);
  }
  for (const name of ["ダンベル", "バーベル", "ケトルベル", "スミスマシン", "ケーブルマシン", "長いトレーニングバンド"]) {
    const item = master.equipment.find(e => e.name === name);
    assert.ok(item, name);
    assert.ok(master.exercises.some(e => e.equipment_ids.includes(item.equipment_id)), name);
  }
  assert.equal(new Set(master.exercises.map(e => e.display_name)).size, master.exercises.length);
});
