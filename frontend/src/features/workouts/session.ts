// Invalidates callbacks when preview access ends. A mock user_id is not identity.
let sessionVersion = 0;
export function workoutSessionVersion(): number { return sessionVersion; }
export function clearWorkoutSession(): void { sessionVersion += 1; }
