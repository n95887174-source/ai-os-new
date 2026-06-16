/**
 * Aquarium Performance Optimizer
 * Handles 200+ fish with smooth rendering
 */

import { rootLogger } from '../../../kernel/services/logger-service';

const LOGGER = rootLogger.child('AquariumOptimizer');

export interface FishConfig {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  type: string;
}

export interface PerformanceConfig {
  maxFish: number;
  gridSize: number;
  spatialUpdateInterval: number;
  cullingMargin: number;
  targetFPS: number;
}

const DEFAULT_CONFIG: PerformanceConfig = {
  maxFish: 500,
  gridSize: 50,
  spatialUpdateInterval: 100,
  cullingMargin: 50,
  targetFPS: 60,
};

interface SpatialCell {
  fish: FishConfig[];
}

export class SpatialGrid {
  private cells: Map<string, SpatialCell> = new Map();
  private gridSize: number;

  constructor(gridSize: number = 50) {
    this.gridSize = gridSize;
  }

  private getKey(x: number, y: number): string {
    const gx = Math.floor(x / this.gridSize);
    const gy = Math.floor(y / this.gridSize);
    return `${gx},${gy}`;
  }

  insert(fish: FishConfig): void {
    const key = this.getKey(fish.x, fish.y);
    if (!this.cells.has(key)) {
      this.cells.set(key, { fish: [] });
    }
    this.cells.get(key)!.fish.push(fish);
  }

  clear(): void {
    this.cells.clear();
  }

  query(x: number, y: number, radius: number): FishConfig[] {
    const results: FishConfig[] = [];
    const cellRadius = Math.ceil(radius / this.gridSize);
    const centerX = Math.floor(x / this.gridSize);
    const centerY = Math.floor(y / this.gridSize);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = `${centerX + dx},${centerY + dy}`;
        const cell = this.cells.get(key);
        if (cell) {
          for (const fish of cell.fish) {
            const dist = Math.hypot(fish.x - x, fish.y - y);
            if (dist <= radius) {
              results.push(fish);
            }
          }
        }
      }
    }

    return results;
  }

  getCellCount(): number {
    return this.cells.size;
  }
}

export class AquariumPerformanceOptimizer {
  private config: PerformanceConfig;
  private spatialGrid: SpatialGrid;
  private visibleFish: Set<string> = new Set();
  private lastSpatialUpdate: number = 0;
  private frameCount: number = 0;
  private lastFPSUpdate: number = 0;
  private currentFPS: number = 60;
  private frameTimes: number[] = [];

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.spatialGrid = new SpatialGrid(this.config.gridSize);
  }

  /**
   * Update FPS tracking
   */
  trackFrame(deltaMs: number): void {
    this.frameTimes.push(deltaMs);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }

    this.frameCount++;
    const now = Date.now();
    if (now - this.lastFPSUpdate >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.lastFPSUpdate = now;
      LOGGER.debug('AquariumOptimizer', `FPS: ${this.currentFPS}`, {
        gridCells: this.spatialGrid.getCellCount(),
        visible: this.visibleFish.size,
      });
    }
  }

  /**
   * Update spatial grid for neighbor queries
   */
  updateSpatialGrid(fish: FishConfig[], viewport: { x: number; y: number; width: number; height: number }): void {
    const now = Date.now();
    if (now - this.lastSpatialUpdate < this.config.spatialUpdateInterval) {
      return;
    }

    this.spatialGrid.clear();
    this.visibleFish.clear();

    const margin = this.config.cullingMargin;
    const viewLeft = viewport.x - margin;
    const viewRight = viewport.x + viewport.width + margin;
    const viewTop = viewport.y - margin;
    const viewBottom = viewport.y + viewport.height + margin;

    for (const f of fish) {
      this.spatialGrid.insert(f);

      // Culling: only render if in viewport
      if (f.x >= viewLeft && f.x <= viewRight && f.y >= viewTop && f.y <= viewBottom) {
        this.visibleFish.add(f.id);
      }
    }

    this.lastSpatialUpdate = now;
  }

  /**
   * Get neighbors for flocking behavior
   */
  getNeighbors(fish: FishConfig, radius: number): FishConfig[] {
    return this.spatialGrid.query(fish.x, fish.y, radius);
  }

  /**
   * Check if fish is visible (in viewport)
   */
  isVisible(fishId: string): boolean {
    return this.visibleFish.has(fishId);
  }

  /**
   * Get visible fish count
   */
  getVisibleCount(): number {
    return this.visibleFish.size;
  }

  /**
   * Adaptive quality based on FPS
   */
  getQualityLevel(): 'high' | 'medium' | 'low' {
    if (this.currentFPS >= 55) return 'high';
    if (this.currentFPS >= 30) return 'medium';
    return 'low';
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return this.currentFPS;
  }

  /**
   * Get average frame time
   */
  getAvgFrameTime(): number {
    if (this.frameTimes.length === 0) return 16.67;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  /**
   * Batch fish updates to reduce allocations
   */
  batchUpdate(
    fish: FishConfig[],
    deltaMs: number,
    _viewport: { x: number; y: number; width: number; height: number }
  ): Map<string, Partial<FishConfig>> {
    const updates = new Map<string, Partial<FishConfig>>();

    for (let i = 0; i < fish.length; i++) {
      const f = fish[i];
      
      // Update position
      const nx = f.x + f.vx * (deltaMs / 16.67);
      const ny = f.y + f.vy * (deltaMs / 16.67);

      updates.set(f.id, { x: nx, y: ny });
    }

    return updates;
  }

  /**
   * Apply flocking behavior efficiently
   */
  applyFlocking(
    fish: FishConfig[],
    weights: { alignment: number; cohesion: number; separation: number },
    _deltaMs: number
  ): void {
    const radius = 30;

    // Use spatial grid for O(n) instead of O(n²)
    for (let i = 0; i < fish.length; i++) {
      const f = fish[i];
      const neighbors = this.spatialGrid.query(f.x, f.y, radius);

      let avgVx = 0, avgVy = 0;
      let centerX = 0, centerY = 0;
      let sepX = 0, sepY = 0;

      for (const n of neighbors) {
        if (n.id === f.id) continue;

        avgVx += n.vx;
        avgVy += n.vy;
        centerX += n.x;
        centerY += n.y;

        const dx = f.x - n.x;
        const dy = f.y - n.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < 20) {
          sepX += dx / dist;
          sepY += dy / dist;
        }
      }

      if (neighbors.length > 1) {
        avgVx /= neighbors.length;
        avgVy /= neighbors.length;
        centerX /= neighbors.length;
        centerY /= neighbors.length;

        // Apply weights
        const alignment = weights.alignment * 0.1;
        const cohesion = weights.cohesion * 0.05;
        const separation = weights.separation * 0.15;

        f.vx += (avgVx - f.vx) * alignment + (centerX - f.x) * cohesion + sepX * separation;
        f.vy += (avgVy - f.vy) * alignment + (centerY - f.y) * cohesion + sepY * separation;

        // Limit speed
        const speed = Math.hypot(f.vx, f.vy);
        if (speed > 3) {
          f.vx = (f.vx / speed) * 3;
          f.vy = (f.vy / speed) * 3;
        }
      }
    }
  }

  /**
   * Handle fish spawning/despawning
   */
  managePopulation(
    currentCount: number,
    targetCount: number
  ): { spawn: number; despawn: number } {
    const max = this.config.maxFish;
    
    if (currentCount < max && currentCount < targetCount) {
      const spawn = Math.min(5, targetCount - currentCount, max - currentCount);
      return { spawn, despawn: 0 };
    }
    
    if (currentCount > max) {
      return { spawn: 0, despawn: currentCount - max };
    }

    return { spawn: 0, despawn: 0 };
  }

  /**
   * Get performance stats
   */
  getStats(): {
    fps: number;
    avgFrameTime: number;
    visibleFish: number;
    gridCells: number;
    qualityLevel: string;
  } {
    return {
      fps: this.currentFPS,
      avgFrameTime: this.getAvgFrameTime(),
      visibleFish: this.getVisibleCount(),
      gridCells: this.spatialGrid.getCellCount(),
      qualityLevel: this.getQualityLevel(),
    };
  }

  /**
   * Apply adaptive culling for distant fish
   */
  scheduleCulling(fish: FishConfig[], viewport: { x: number; y: number; width: number; height: number }): string[] {
    const cullQueue: string[] = [];
    const margin = 200; // Cull fish beyond this distance

    for (const f of fish) {
      const distX = Math.max(0, Math.max(viewport.x - f.x, f.x - (viewport.x + viewport.width)));
      const distY = Math.max(0, Math.max(viewport.y - f.y, f.y - (viewport.y + viewport.height)));
      const dist = Math.hypot(distX, distY);

      if (dist > margin) {
        cullQueue.push(f.id);
      }
    }

    return cullQueue;
  }

  /**
   * Optimize fish pathfinding
   */
  optimizePath(fish: FishConfig[], targetX: number, targetY: number): Map<string, { vx: number; vy: number }> {
    const paths = new Map<string, { vx: number; vy: number }>();

    for (const f of fish) {
      const dx = targetX - f.x;
      const dy = targetY - f.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 1) {
        const speed = 1.5;
        paths.set(f.id, {
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
        });
      }
    }

    return paths;
  }
}

// Singleton
export const aquariumOptimizer = new AquariumPerformanceOptimizer();