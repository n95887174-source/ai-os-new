interface SpatialEntity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_ENTITIES_PER_NODE = 8;
const MAX_DEPTH = 6;

export class QuadTree {
  private bounds: Bounds;
  private entities: SpatialEntity[] = [];
  private nodes: QuadTree[] = [];
  private depth: number;

  constructor(bounds: Bounds, depth = 0) {
    this.bounds = bounds;
    this.depth = depth;
  }

  clear(): void {
    this.entities = [];
    for (const node of this.nodes) node.clear();
    this.nodes = [];
  }

  insert(entity: SpatialEntity): boolean {
    if (!this.containsPoint(entity.x, entity.y)) return false;

    if (this.entities.length < MAX_ENTITIES_PER_NODE || this.depth >= MAX_DEPTH) {
      this.entities.push(entity);
      return true;
    }

    if (this.nodes.length === 0) this.subdivide();

    for (const node of this.nodes) {
      if (node.insert(entity)) return true;
    }

    this.entities.push(entity);
    return true;
  }

  query(range: Bounds, found: SpatialEntity[] = []): SpatialEntity[] {
    if (!this.intersects(range)) return found;

    for (const entity of this.entities) {
      if (entity.x >= range.x && entity.x <= range.x + range.width &&
          entity.y >= range.y && entity.y <= range.y + range.height) {
        found.push(entity);
      }
    }

    for (const node of this.nodes) {
      node.query(range, found);
    }

    return found;
  }

  queryRadius(cx: number, cy: number, radius: number, found: SpatialEntity[] = []): SpatialEntity[] {
    const range: Bounds = { x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2 };
    const candidates = this.query(range);

    for (const entity of candidates) {
      const dx = entity.x - cx;
      const dy = entity.y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        found.push(entity);
      }
    }

    return found;
  }

  getEntityCount(): number {
    let count = this.entities.length;
    for (const node of this.nodes) count += node.getEntityCount();
    return count;
  }

  private containsPoint(x: number, y: number): boolean {
    return x >= this.bounds.x && x <= this.bounds.x + this.bounds.width &&
           y >= this.bounds.y && y <= this.bounds.y + this.bounds.height;
  }

  private intersects(range: Bounds): boolean {
    return !(range.x > this.bounds.x + this.bounds.width ||
             range.x + range.width < this.bounds.x ||
             range.y > this.bounds.y + this.bounds.height ||
             range.y + range.height < this.bounds.y);
  }

  private subdivide(): void {
    const hw = this.bounds.width / 2;
    const hh = this.bounds.height / 2;
    const x = this.bounds.x;
    const y = this.bounds.y;
    const d = this.depth + 1;

    this.nodes = [
      new QuadTree({ x, y, width: hw, height: hh }, d),
      new QuadTree({ x: x + hw, y, width: hw, height: hh }, d),
      new QuadTree({ x, y: y + hh, width: hw, height: hh }, d),
      new QuadTree({ x: x + hw, y: y + hh, width: hw, height: hh }, d),
    ];
  }
}
