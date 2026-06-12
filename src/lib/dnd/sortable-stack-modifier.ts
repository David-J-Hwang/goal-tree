import type { Modifier } from "@dnd-kit/core";

const dragBoundaryOvershoot = 20;
const dragBoundarySoftness = 54;

export const sortableStackModifiers: Modifier[] = [restrictToSortableStack];

function restrictToSortableStack({
  activeNodeRect,
  containerNodeRect,
  transform,
}: Parameters<Modifier>[0]) {
  if (!activeNodeRect || !containerNodeRect) {
    return { ...transform, x: 0 };
  }

  const minY = containerNodeRect.top - activeNodeRect.top;
  const maxY = containerNodeRect.bottom - activeNodeRect.bottom;

  return {
    ...transform,
    x: 0,
    y: softClamp(transform.y, minY, maxY),
  };
}

function softClamp(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }

  if (value < min) {
    return min - getBoundaryOvershoot(min - value);
  }

  if (value > max) {
    return max + getBoundaryOvershoot(value - max);
  }

  return value;
}

function getBoundaryOvershoot(distance: number) {
  return dragBoundaryOvershoot * (1 - Math.exp(-distance / dragBoundarySoftness));
}
