export interface AIImageData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
}

export interface AIDrawingProps {
  roomId: string;
  onImageGenerated: (imageData: AIImageData) => void;
} 