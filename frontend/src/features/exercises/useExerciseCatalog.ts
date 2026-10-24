import data from "./serverCatalogData.json" with { type: "json" };
import { parseServerCatalog, type ServerCatalogData } from "./serverCatalog.ts";

// The frontend owns this normalized master file; there is no catalog endpoint.
function loadCatalog(): { catalog: ServerCatalogData | null; error: string } {
  try { return { catalog: parseServerCatalog(data), error: "" }; }
  catch (reason) {
    return { catalog: null, error: reason instanceof Error ? reason.message : "種目データを読み込めませんでした。" };
  }
}

const state = loadCatalog();
export function useExerciseCatalog() {
  return state;
}
