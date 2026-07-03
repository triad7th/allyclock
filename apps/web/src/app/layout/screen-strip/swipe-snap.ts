// Decide the screen index to snap to after a horizontal drag. A drag to the
// LEFT (negative dragPx) reveals the NEXT screen; a drag to the RIGHT reveals
// the PREVIOUS one. A page turn happens when the drag passes half the viewport
// OR the release velocity exceeds a flick threshold. The result is clamped to
// [0, count - 1]. Apple port: mirrors a paged TabView's snap decision.
const FLICK_PX_PER_MS = 0.5;

export function snapIndex(
  active: number,
  dragPx: number,
  velocityPxPerMs: number,
  viewportWidth: number,
  count: number,
): number {
  const passedHalf = Math.abs(dragPx) > viewportWidth / 2;
  const flicked = Math.abs(velocityPxPerMs) > FLICK_PX_PER_MS;
  let target = active;
  if (passedHalf || flicked) {
    // Prefer the flick direction when present, else the drag direction.
    const direction = flicked ? Math.sign(velocityPxPerMs) : Math.sign(dragPx);
    target = active - direction; // right/positive -> previous; left/negative -> next
  }
  return Math.max(0, Math.min(target, count - 1));
}
