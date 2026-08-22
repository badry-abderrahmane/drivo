/**
 * The FLIP flight that resolves one mark into another.
 *
 * The opening is a two-hop relay — the shell's splash mark flies into the landing's atom,
 * and the landing's mark flies into the header when the visitor presses Commencer — so the
 * measure-and-transform has to be callable rather than inlined at one call site.
 */

/** Just enough of a DOMRect to do the maths, so this is testable without a layout engine. */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * The transform that lands `from` exactly on `to`, or null when either box has no size.
 *
 * Centre-to-centre, not corner-to-corner: transform-origin is the centre, so measuring the
 * corners would leave the mark off by half the size difference. The null case is not
 * theoretical — an element that has not laid out yet measures 0×0, and scaling by 0 would
 * collapse the mark instead of moving it.
 */
export function flyTransform(from: Box, to: Box): string | null {
  if (from.width <= 0 || to.width <= 0) return null;
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const scale = to.width / from.width;
  return `translate(${dx}px, ${dy}px) scale(${scale})`;
}

/**
 * Animate `el` onto `target`. Returns false when the flight could not be measured, so the
 * caller can fall back to simply removing the thing rather than waiting on an animation
 * that will never run.
 */
export function flyTo(el: HTMLElement, target: Element, durationMs: number): boolean {
  const transform = flyTransform(el.getBoundingClientRect(), target.getBoundingClientRect());
  if (!transform) return false;
  // Animation declarations outrank every normal author declaration, the style attribute
  // included, so a keyframe loop on this element would simply swallow the transform below —
  // and an implicit 0%/100% keyframe would take the flown position as its underlying value,
  // leaving the mark oscillating between here and its destination. Stop it before flying.
  el.style.animation = "none";
  el.style.transition = `transform ${durationMs}ms cubic-bezier(.2, .8, .2, 1)`;
  el.style.transform = transform;
  return true;
}
