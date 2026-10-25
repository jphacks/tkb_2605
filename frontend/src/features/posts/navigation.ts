import type { Location } from "react-router";
import type { WorkoutDetail } from "../../api/workouts.ts";

export type ComposeLocationState = {
  backgroundLocation?: Location;
  initialContent?: string;
  workout?: WorkoutDetail;
};
