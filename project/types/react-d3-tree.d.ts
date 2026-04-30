declare module 'react-d3-tree' {
  import { ComponentType } from 'react';

  export interface RawNodeDatum {
    name: string;
    attributes?: Record<string, unknown>;
    children?: RawNodeDatum[];
  }

  export interface TreeProps {
    data: RawNodeDatum;
    renderCustomNodeElement?: (props: { nodeData: RawNodeDatum }) => React.ReactNode;
    orientation?: 'vertical' | 'horizontal';
    pathFunc?: 'diagonal' | 'step' | 'elbow' | 'straight';
    translate?: { x: number; y: number };
    zoom?: number;
    scaleExtent?: { min: number; max: number };
    draggable?: boolean;
    zoomable?: boolean;
    collapsible?: boolean;
    transitionDuration?: number;
    separation?: { siblings: number; nonSiblings: number };
    nodeSize?: { x: number; y: number };
    styles?: {
      links?: { stroke?: string; strokeWidth?: number };
      nodes?: {
        node?: {
          circle?: { fill?: string; stroke?: string };
          name?: { fill?: string };
          attributes?: { fill?: string };
        };
      };
    };
    onTranslateChange?: (translate: { x: number; y: number }) => void;
    onZoomChange?: (zoom: number) => void;
  }

  const Tree: ComponentType<TreeProps>;
  export default Tree;
}
