import { create } from 'zustand';

export type Tool = 'pencil' | 'pen' | 'brush' | 'marker' | 'eraser' | 'eyedropper' | 'fill' | 'select' | 'circle' | 'rectangle' | 'square' | 'star';

interface CanvasStore {
  tool: Tool;
  strokeWidth: number;
  strokeColor: string;
  selectedArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  setTool: (tool: Tool) => void;
  setStrokeWidth: (width: number) => void;
  setStrokeColor: (color: string) => void;
  setSelectedArea: (area: { x: number; y: number; width: number; height: number; } | null) => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  tool: 'pencil',
  strokeWidth: 2,
  strokeColor: '#000000',
  selectedArea: null,
  setTool: (tool) => set({ tool }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setSelectedArea: (area) => set({ selectedArea: area }),
}));