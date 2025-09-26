declare module 'react-force-graph-2d' {
  import type { ComponentType } from 'react';

  export interface ForceGraphMethods {
    centerAt: (x: number, y: number, ms?: number) => void;
    zoom: (k: number, ms?: number) => void;
  }

  const ForceGraph2D: ComponentType<Record<string, unknown>>;
  export default ForceGraph2D;
}
