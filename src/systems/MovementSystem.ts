import { CONFIG, MAP_COORDS } from '../config/GameConfig';

/**
 * Movement System - Coordinate conversion and movement constraints
 */

/**
 * Get map drawing metrics (9:16 aspect ratio centered)
 */
export function getMapDrawMetrics(width: number, height: number): { drawWidth: number; offsetX: number; drawHeight: number } {
  const mapAspect = 9 / 16;
  const drawHeight = height;
  const drawWidth = drawHeight * mapAspect;
  const offsetX = (width - drawWidth) / 2;
  return { drawWidth, offsetX, drawHeight };
}

/**
 * Convert MAP coordinate (304-427) to SCREEN pixel X
 */
export function mapToScreenX(mapX: number, canvasWidth: number, canvasHeight: number): number {
  const { drawWidth, offsetX } = getMapDrawMetrics(canvasWidth, canvasHeight);
  const mapRange = MAP_COORDS.X_MAX - MAP_COORDS.X_MIN;
  const percent = (mapX - MAP_COORDS.X_MIN) / mapRange;
  return offsetX + percent * drawWidth;
}

/**
 * Convert SCREEN pixel X to MAP coordinate (304-427)
 */
export function screenToMapX(screenX: number, canvasWidth: number, canvasHeight: number): number {
  const { drawWidth, offsetX } = getMapDrawMetrics(canvasWidth, canvasHeight);
  const mapRange = MAP_COORDS.X_MAX - MAP_COORDS.X_MIN;
  const percent = (screenX - offsetX) / drawWidth;
  return MAP_COORDS.X_MIN + percent * mapRange;
}

/**
 * Get floor Y position in screen pixels
 */
export function getFloorY(floor: number, canvasHeight: number): number {
  switch (floor) {
    case 1: return canvasHeight * MAP_COORDS.FLOOR_1_Y;
    case 2: return canvasHeight * MAP_COORDS.FLOOR_2_Y;
    case 3: return canvasHeight * MAP_COORDS.FLOOR_3_Y;
    default: return canvasHeight * MAP_COORDS.FLOOR_1_Y;
  }
}

/**
 * Get movement constraints for current floor
 */
export function getMovementConstraints(
  generatorRoomUnlocked: boolean,
  currentFloor: number,
  canvasHeight: number
): { yPos: number; xMinMap: number; xMaxMap: number } {
  const leftLimit = generatorRoomUnlocked ? 344 : 358;
  const rightLimit = 384;
  const yPos = getFloorY(currentFloor, canvasHeight);
  
  return {
    yPos,
    xMinMap: leftLimit,
    xMaxMap: rightLimit
  };
}

/**
 * Clamp position to valid movement range
 */
export function clampToRange(
  x: number,
  generatorRoomUnlocked: boolean,
  canvasWidth: number,
  canvasHeight: number
): number {
  const constraints = getMovementConstraints(generatorRoomUnlocked, 1, canvasHeight);
  const minX = mapToScreenX(constraints.xMinMap, canvasWidth, canvasHeight);
  const maxX = mapToScreenX(constraints.xMaxMap, canvasWidth, canvasHeight);
  return Math.max(minX, Math.min(maxX, x));
}

/**
 * Get stairs X position in screen coordinates
 */
export function getStairsX(canvasWidth: number, canvasHeight: number): number {
  return mapToScreenX(MAP_COORDS.STAIRS_X, canvasWidth, canvasHeight);
}
