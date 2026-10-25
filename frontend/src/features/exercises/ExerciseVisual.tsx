import { useState } from "react";
import media from "./exerciseMedia.json";
import type { ServerExercise } from "./serverCatalog.ts";
import "./ExerciseVisual.css";

type Visual = { src: string; width: number; height: number; crop: number[] };
const illustrations: Readonly<Record<string, Visual>> = media.exercises;
const equipmentImages: Readonly<Record<string, string>> = media.equipment;
const aggregateEquipmentIds: readonly string[] = media.aggregateEquipmentIds;

/** Keep the source artwork intact; show only the reviewed pose inside a clipped viewport. */
export function ExerciseVisual({ exerciseId, className = "" }: { exerciseId: string; className?: string }) {
  const visual = illustrations[exerciseId];
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!visual || failedSrc === visual.src) {
    return <span className={`exercise-visual exercise-visual-fallback ${className}`} aria-hidden="true">画像なし</span>;
  }
  const [x, y, width, height] = visual.crop;
  const ratio = width / height;
  return <span className={`exercise-visual ${className}`} aria-hidden="true">
    <span className="exercise-visual-crop" style={{ width: `${Math.min(1, ratio) * 100}%`, height: `${Math.min(1, 1 / ratio) * 100}%` }}>
      <img src={visual.src} alt="" width={visual.width} height={visual.height} loading="lazy" decoding="async"
        style={{ width: `${visual.width / width * 100}%`, height: `${visual.height / height * 100}%`, left: `${-x / width * 100}%`, top: `${-y / height * 100}%` }}
        onError={() => setFailedSrc(visual.src)} />
    </span>
  </span>;
}

export function ExerciseEquipment({ exercise }: { exercise: ServerExercise }) {
  return <span className="exercise-equipment">
    {exercise.equipment.filter((item) => !aggregateEquipmentIds.includes(item.equipment_id)).map((item) => {
      const src = equipmentImages[item.equipment_id];
      return <span className="exercise-equipment-item" key={item.equipment_id}>
        {src && <img src={src} width="28" height="21" alt="" loading="lazy" decoding="async" />}
        <span>{item.name}</span>
      </span>;
    })}
  </span>;
}
