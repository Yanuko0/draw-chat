import React from 'react';
import Konva from 'konva';
import { Stage, Layer, Line, Image as KonvaImage, Transformer, Group, Circle, Line as KonvaLine } from 'react-konva';
import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { database } from '../../config/firebase';
import { ref, onValue, set, push, serverTimestamp } from 'firebase/database';
import { BiZoomIn, BiZoomOut, BiImageAdd, BiEraser, BiTrash } from 'react-icons/bi';
import { MdOutlineZoomOutMap, MdPanTool } from 'react-icons/md';
import debounce from 'lodash/debounce';
import { AiOutlineDown, AiOutlineUp, AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import { KonvaEventObject } from 'konva/lib/Node';
import { Canvas as FabricCanvas } from 'fabric';
import * as fabric from 'fabric';
import StickerPicker from '../../components/StickerPicker';
import Image from 'next/image';

interface CanvasProps {
  roomId: string;
  nickname: string;
}

interface LineElement {
  tool: string;
  points: number[];
  strokeWidth: number;
  strokeColor: string;
  tension?: number;
  opacity?: number;
  dash?: number[];
}

interface ImageElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
}

interface Message {
  id: string;
  nickname: string;
  type?: 'text' | 'sticker';
  text?: string;
  content?: string;
  timestamp?: number | null;
}

interface RoomUser {
  nickname: string;
}

const Canvas: React.FC<CanvasProps> = ({ roomId, nickname }) => {
  const [lines, setLines] = useState<LineElement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentLine, setCurrentLine] = useState<LineElement | null>(null);
  const { tool, strokeWidth, strokeColor, setStrokeColor } = useCanvasStore();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({ width: window.innerWidth * 2, height: window.innerHeight * 2 });
  const [dragMode, setDragMode] = useState(false);
  const [images, setImages] = useState<ImageElement[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatHeight, setChatHeight] = useState(160); // 預設高度 160px (4列)
  const [users, setUsers] = useState<string[]>([]);
  const [isRoomInfoMinimized, setIsRoomInfoMinimized] = useState(true);
  const [roomInfoHeight, setRoomInfoHeight] = useState(200); // 預設高度
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectedElements, setSelectedElements] = useState<any[]>([]);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [isToolbarMinimized, setIsToolbarMinimized] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<'right' | 'left' | 'top' | 'bottom'>('right');
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState<{ x: number; y: number } | null>(null);

  // Firebase 監聽
  useEffect(() => {
    const roomRef = ref(database, `rooms/${roomId}/lines`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLines(Object.values(data));
      } else {
        setLines([]);
      }
    });
    return () => unsubscribe();
  }, [roomId]);

  // 監聽 Firebase 中的圖片數據
  useEffect(() => {
    const imagesRef = ref(database, `rooms/${roomId}/images`);
    const unsubscribe = onValue(imagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setImages(Object.values(data));
      } else {
        setImages([]);
      }
    });
    return () => unsubscribe();
  }, [roomId]);

  // 當選中圖片變化時更新 Transformer
  useEffect(() => {
    if (selectedImage && transformerRef.current) {
      const stage = stageRef.current;
      if (!stage) return;
      
      const node = stage.findOne(`#${selectedImage}`);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedImage, images]);

  // 修改監聽聊天訊息的 useEffect
  useEffect(() => {
    const messagesRef = ref(database, `rooms/${roomId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList: Message[] = Object.entries(data)
          .map(([id, msg]: [string, any]) => ({
            id,
            nickname: msg.nickname,
            text: msg.text || '',
            type: msg.type || 'text',  // 添加預設類型
            content: msg.content || '', // 添加 content 字段
            timestamp: msg.timestamp
          }))
          .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(messageList);
      } else {
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    const usersRef = ref(database, `rooms/${roomId}/users`);
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userList = Object.keys(data);
        setUsers(userList);
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (roomId && nickname) {
      const userRef = ref(database, `rooms/${roomId}/users/${nickname}`);
      set(userRef, {
        nickname: nickname,
        lastActive: serverTimestamp()
      });

      // 當用戶離開時移除
      return () => {
        set(userRef, null);
      };
    }
  }, [roomId, nickname]);

  const getLineProperties = (toolType: string) => {
    switch (toolType) {
      case 'pencil':
        return {
          tension: 0.3,
          opacity: 0.9,
          strokeWidth: strokeWidth * 0.8,
          lineCap: 'round',
          lineJoin: 'round',
          globalCompositeOperation: 'source-over',
          shadowColor: strokeColor,
          shadowBlur: 0.5,
          shadowOffsetX: 0.2,
          shadowOffsetY: 0.2,
          bezier: true
        };
      case 'pen':
        return {
          tension: 0.6,
          opacity: 1,
          strokeWidth: strokeWidth,
          lineCap: 'round',
          lineJoin: 'round',
          shadowColor: strokeColor,
          shadowBlur: 0.2,
          bezier: true
        };
      case 'brush':
        return {
          tension: 0.4,
          opacity: 0.7,
          strokeWidth: strokeWidth * 2,
          lineCap: 'round',
          lineJoin: 'round',
          shadowColor: strokeColor,
          shadowBlur: 2,
          bezier: true
        };
      case 'marker':
        return {
          tension: 0.2,
          opacity: 0.5,
          strokeWidth: strokeWidth * 2.5,
          lineCap: 'round',
          lineJoin: 'round',
          shadowColor: strokeColor,
          shadowBlur: 0,
          bezier: false
        };
      case 'eraser':
        return {
          tension: 0.3,
          opacity: 1,
          strokeWidth: strokeWidth * 2,
          lineCap: 'round',
          lineJoin: 'round',
          shadowBlur: 0,
          bezier: true
        };
      default:
        return {
          tension: 0.5,
          opacity: 1,
          strokeWidth,
          lineCap: 'round',
          lineJoin: 'round'
        };
    }
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const mousePointTo = {
      x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
      y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    setScale(newScale);

    setPosition({
      x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
      y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale,
    });
  };

  const handlePointerDown = useCallback((e: any) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();
    
    // 根據輸入類型設置壓力值
    const pressure = e.evt.pointerType === 'mouse' 
      ? 1.0  // 滑鼠使用固定壓力值
      : (e.evt.pressure || 0.5); // 觸控筆才使用壓力感應
    
    const isRightClick = e.evt.button === 2;
    const isMiddleClick = e.evt.button === 1;
    
    // 檢查是否點擊在圖片上
    const clickedOnImage = e.target.className === 'Image';
    
    if (isRightClick || isMiddleClick || e.evt.ctrlKey || e.evt.metaKey || dragMode) {
      setIsDragging(true);
      return;
    }

    if (tool === 'select' && clickedOnImage) {
      return;
    }

    setIsPressing(true);
    setLastPointerPosition({ x: pos.x, y: pos.y });
    
    const lineProps = getLineProperties(tool);
    // 根據壓力值調整筆觸寬度
    const adjustedStrokeWidth = lineProps.strokeWidth * (e.evt.pointerType === 'mouse' ? 1 : pressure * 1.5);

    const newLine: LineElement = {
      tool,
      points: [pos.x, pos.y],
      strokeColor: tool === 'eraser' ? '#ffffff' : strokeColor,
      ...lineProps,
      strokeWidth: adjustedStrokeWidth,
    };

    setCurrentLine(newLine);
    const roomRef = ref(database, `rooms/${roomId}/lines`);
    const newLineRef = push(roomRef);
    set(newLineRef, newLine);
  }, [tool, strokeColor, dragMode, roomId]);

  const handlePointerMove = useCallback((e: any) => {
    e.evt.preventDefault();
    
    if (isDragging) {
      const stage = e.target.getStage();
      setPosition({
        x: stage.x() + e.evt.movementX,
        y: stage.y() + e.evt.movementY,
      });
      return;
    }

    if (!isPressing || !currentLine || !lastPointerPosition) return;

    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();
    const pressure = e.evt.pointerType === 'mouse'
      ? 1.0  // 滑鼠使用固定壓力值
      : (e.evt.pressure || 0.5);
    
    const adjustedStrokeWidth = currentLine.strokeWidth * (e.evt.pointerType === 'mouse' ? 1 : pressure * 1.5);
    
    const newLine = {
      ...currentLine,
      points: [...currentLine.points, pos.x, pos.y],
      strokeWidth: adjustedStrokeWidth
    };
    
    setCurrentLine(newLine);
    setLastPointerPosition({ x: pos.x, y: pos.y });
    debouncedUpdate(`rooms/${roomId}/lines/${lines.length}`, newLine);
  }, [isDragging, isPressing, currentLine, lastPointerPosition, roomId, lines.length]);

  const handlePointerUp = useCallback((e: any) => {
    e.evt.preventDefault();
    setIsPressing(false);
    setIsDragging(false);
    setCurrentLine(null);
    setLastPointerPosition(null);

    if (tool === 'select' && selectionStart) {
      const stage = stageRef.current;
      const pos = stage.getRelativePointerPosition();
      
      const selected = lines.filter(line => {
        return line.points.some((point: number, i: number) => {
          if (i % 2 === 0) {
            const x = point;
            const y = line.points[i + 1];
            return x >= Math.min(selectionStart.x, pos.x) &&
                   x <= Math.max(selectionStart.x, pos.x) &&
                   y >= Math.min(selectionStart.y, pos.y) &&
                   y <= Math.max(selectionStart.y, pos.y);
          }
          return false;
        });
      });
      
      setSelectedElements(selected);
      setIsDraggingSelection(true);
    }

    setSelectionStart(null);
  }, [tool, selectionStart, lines]);

  const zoomIn = () => {
    setScale(scale * 1.2);
  };

  const zoomOut = () => {
    setScale(scale / 1.2);
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    const handleResize = () => {
      setStageSize({
        width: window.innerWidth * 2,
        height: window.innerHeight * 2
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // 清除畫布功
  const handleClearCanvas = useCallback(() => {
    const roomRef = ref(database, `rooms/${roomId}/lines`);
    set(roomRef, null);
  }, [roomId]);

  // 添加清除全部功能
  const handleClearAll = useCallback(() => {
    // 清除所有圖層
    const stage = stageRef.current;
    if (stage) {
      const layers = stage.getLayers();
      layers.forEach((layer: Konva.Layer) => {
        layer.removeChildren();
        layer.batchDraw();
      });
    }
    
    // 清除 Firebase 中的所有數據
    const roomRef = ref(database, `rooms/${roomId}`);
    const updates = {
      'lines': null,      // 清除所有線條
      'images': null,     // 清除所有圖片
      'drawings': null    // 清除其他繪圖數據
    };
    
    // 更新 Firebase
    set(roomRef, updates);
    
    // 清除本地狀態
    setLines([]);
    setImages([]);
    setSelectedImage(null);
  }, [roomId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, isUpload: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imgData = event.target?.result as string;
        const imageId = Date.now().toString();
        
        // 根據來源決定位置
        const position = isUpload ? {
          x: window.innerWidth / 2 - 100,  // 畫面中心
          y: window.innerHeight / 2 - 100
        } : {
          x: e.nativeEvent.offsetX,        // 拖放位置
          y: e.nativeEvent.offsetY
        };

        const imageRef = ref(database, `rooms/${roomId}/images/${imageId}`);
        set(imageRef, {
          id: imageId,
          x: position.x,
          y: position.y,
          src: imgData
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageTransform = (imageId: string, newProps: Partial<ImageElement>) => {
    const imageRef = ref(database, `rooms/${roomId}/images/${imageId}`);
    const updatedImage = images.find((img: ImageElement) => img.id === imageId);
    if (updatedImage) {
      set(imageRef, { ...updatedImage, ...newProps });
    }
  };

  // 添加 stage 引用
  const stageRef = useRef<any>(null);

  // 點擊空白處取消選中
  const checkDeselect = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedImage(null);
    }
  };

  // 防止中鍵點擊的預設行為（通常是自動滾動）
  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener('mousedown', (e) => {
      if (e.button === 1) preventDefault(e);
    });
    return () => {
      document.removeEventListener('mousedown', preventDefault);
    };
  }, []);

  // 使用防抖優化 Firebase 更新
  const debouncedUpdate = useCallback(
    debounce((path: string, data: any) => {
      const dbRef = ref(database, path);
      set(dbRef, data);
    }, 30),
    []
  );

  // 優化圖片渲染
  const imageCache = useMemo(() => {
    const cache: { [key: string]: HTMLImageElement } = {};
    images.forEach(image => {
      if (!cache[image.src]) {
        const img = new window.Image();
        img.src = image.src;
        cache[image.src] = img;
      }
    });
    return cache;
  }, [images]);

  // 使用 memo 優化渲染
  const renderLines = useMemo(() => (
    lines.map((line, i) => (
      <Line
        key={i}
        points={line.points}
        stroke={line.strokeColor}
        strokeWidth={line.strokeWidth / scale}
        tension={line.tension}
        opacity={line.opacity}
        dash={line.dash}
        lineCap="round"
        lineJoin="round"
        globalCompositeOperation={
          line.tool === 'eraser' ? 'destination-out' : 'source-over'
        }
      />
    ))
  ), [lines, scale]);

  const renderImages = useMemo(() => (
    images.map((image, i) => (
      <Group key={i}>
        <KonvaImage
          id={image.id}
          image={imageCache[image.src]}
          x={image.x}
          y={image.y}
          width={image.width}
          height={image.height}
          draggable={true}
          onClick={() => setSelectedImage(image.id)}
          onDragStart={(e) => {
            e.evt.stopPropagation();
          }}
          onDragMove={(e) => {
            e.evt.stopPropagation();
          }}
          onDragEnd={(e) => {
            e.evt.stopPropagation();
            const imageRef = ref(database, `rooms/${roomId}/images/${image.id}`);
            set(imageRef, {
              ...image,
              x: e.target.x(),
              y: e.target.y(),
            });
          }}
        />
        
        {(selectedImage === image.id || dragMode) && (
          <Group 
            x={image.x + image.width - 10}  // 調整位置到右上角
            y={image.y - 10}
            listening={true}
          >
            <Circle
              radius={10}
              fill="red"
              stroke="white"
              strokeWidth={2}
              onClick={(e) => {
                e.cancelBubble = true;
                const imageRef = ref(database, `rooms/${roomId}/images/${image.id}`);
                set(imageRef, null);
                setSelectedImage(null);
              }}
            />
            <KonvaLine
              points={[-5, -5, 5, 5]}
              stroke="white"
              strokeWidth={2}
              listening={false}
            />
            <KonvaLine
              points={[5, -5, -5, 5]}
              stroke="white"
              strokeWidth={2}
              listening={false}
            />
          </Group>
        )}
        {selectedImage === image.id && (
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              const minWidth = 5;
              const minHeight = 5;
              if (newBox.width < minWidth || newBox.height < minHeight) {
                return oldBox;
              }
              return newBox;
            }}
            enabledAnchors={[
              'top-left', 'top-right',
              'bottom-left', 'bottom-right',
              'middle-left', 'middle-right',
              'top-center', 'bottom-center'
            ]}
            rotateEnabled={false}
            keepRatio={false}
            padding={5}
            anchorSize={10}
            anchorCornerRadius={5}
            borderEnabled={true}
            borderStroke="#00ff00"
            borderStrokeWidth={2}
            anchorStroke="#00ff00"
            anchorFill="#ffffff"
            onTransformEnd={(e) => {
              const node = e.target;
              const scaleX = node.scaleX();
              const scaleY = node.scaleY();

              // 重置縮放
              node.scaleX(1);
              node.scaleY(1);

              const imageRef = ref(database, `rooms/${roomId}/images/${image.id}`);
              set(imageRef, {
                ...image,
                x: node.x(),
                y: node.y(),
                width: Math.max(5, node.width() * scaleX),
                height: Math.max(5, node.height() * scaleY),
              });
            }}
          />
        )}
      </Group>
    ))
  ), [images, imageCache, selectedImage, dragMode, roomId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Attempting to send message:', {
      roomId,
      nickname,
      message: newMessage,
      timestamp: new Date()
    });
    
    try {
      if (newMessage.trim() && nickname && roomId) {
        console.log('Creating message ref for room:', roomId);
        const messagesRef = ref(database, `rooms/${roomId}/messages`);
        const newMessageRef = push(messagesRef);
        
        console.log('Setting message data');
        await set(newMessageRef, {
          nickname,
          text: newMessage.trim(),
          timestamp: serverTimestamp()
        });
        
        console.log('Message sent successfully');
        setNewMessage('');
      } else {
        console.log('Missing required fields:', {
          hasMessage: Boolean(newMessage.trim()),
          hasNickname: Boolean(nickname),
          hasRoomId: Boolean(roomId)
        });
      }
    } catch (error) {
      console.error('Error details:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
    }
  };

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const chatContainer = document.getElementById('chat-container');
      if (!chatContainer) return;
      
      const containerRect = chatContainer.getBoundingClientRect();
      const maxHeight = window.innerHeight / 2; // 最大高度為螢幕高度的一半
      const minHeight = 80; // 最小高度 (2列)
      const newHeight = Math.max(minHeight, Math.min(maxHeight, containerRect.bottom - moveEvent.clientY));
      
      setChatHeight(newHeight); // 加上頭部和輸入框的高度
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleRoomInfoResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const container = document.getElementById('room-info-container');
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const newHeight = Math.max(100, Math.min(400, moveEvent.clientY - containerRect.top));
      setRoomInfoHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imgData = event.target?.result as string;
        // @ts-ignore
        fabric.Image.fromURL(imgData, {
          crossOrigin: 'anonymous'
        }, (img: fabric.Image) => {
          const imageId = Date.now().toString();
          const pointer = {
            x: (e.nativeEvent as MouseEvent).offsetX || 100,
            y: (e.nativeEvent as MouseEvent).offsetY || 100
          };
          
          img.set({
            left: pointer.x,
            top: pointer.y,
            cornerColor: 'blue',
            cornerStrokeColor: 'blue',
            cornerSize: 12,
            transparentCorners: false,
            borderColor: 'blue',
            borderScaleFactor: 2,
            padding: 5,
            data: { id: imageId, src: imgData }
          });

          fabricRef.current?.add(img);
          
          // 同步到 Firebase
          const dbImageRef = ref(database, `rooms/${roomId}/images/${imageId}`);
          set(dbImageRef, {
            id: imageId,
            x: img.left,
            y: img.top,
            width: img.width,
            height: img.height,
            src: imgData
          });
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // 初始化 Fabric.js canvas
  useEffect(() => {
    if (stageRef.current) {
      const canvasElement = stageRef.current.canvas as HTMLCanvasElement;
      fabricRef.current = new fabric.Canvas(canvasElement, {
        width: window.innerWidth,
        height: window.innerHeight,
      });

      // 設置 Fabric.js 的事件處理
      fabricRef.current.on('object:modified', (e) => {
        const obj = e.target;
        if (obj && obj.type === 'image') {
          const imageId = obj.get('data')?.id;
          if (imageId) {
            const imageRef = ref(database, `rooms/${roomId}/images/${imageId}`);
            set(imageRef, {
              id: imageId,
              x: obj.left,
              y: obj.top,
              width: obj.width! * obj.scaleX!,
              height: obj.height! * obj.scaleY!,
              src: obj.get('data')?.src
            });
          }
        }
      });
    }

    return () => {
      fabricRef.current?.dispose();
    };
  }, []);

  // 在工具切換時處理 Fabric.js 的交互模式
  useEffect(() => {
    if (fabricRef.current) {
      if (tool === 'select') {
        fabricRef.current.selection = true;
        fabricRef.current.forEachObject((obj) => {
          obj.selectable = true;
        });
      } else {
        fabricRef.current.selection = false;
        fabricRef.current.forEachObject((obj) => {
          obj.selectable = false;
        });
      }
      fabricRef.current.renderAll();
    }
  }, [tool]);

  // 在組件頂部添加 props 檢查
  useEffect(() => {
    console.log('Canvas component props:', {
      roomId,
      nickname
    });
  }, [roomId, nickname]);

  // 檢查 Firebase 連接
  useEffect(() => {
    console.log('Firebase database instance:', database);
    
    // 測試 Firebase 連接
    const testRef = ref(database, '.info/connected');
    onValue(testRef, (snapshot) => {
      console.log('Firebase connection status:', snapshot.val());
    });
  }, []);

  // 修改生成更淺色的函數
  const generatePastelColor = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }

    // 調整為更淺的顏色
    const hue = hash % 360;
    const saturation = 50 + (hash % 20); // 降低飽和度到 50-70%
    const lightness = 80 + (hash % 10);  // 提高亮度到 80-90%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const handleStickerSelect = async (stickerUrl: string) => {
    try {
      console.log('Sending sticker:', stickerUrl); // 添加日誌
      if (nickname && roomId) {
        const messagesRef = ref(database, `rooms/${roomId}/messages`);
        const newMessageRef = push(messagesRef);
        
        const newMessage = {
          nickname,
          type: 'sticker',
          content: stickerUrl,
          text: '', // 添加空的 text 字段
          timestamp: serverTimestamp()
        };

        console.log('New message object:', newMessage); // 添加日誌
        await set(newMessageRef, newMessage);
      }
    } catch (error) {
      console.error('Error sending sticker:', error);
    }
  };

  const handleStageClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    // 檢查點擊的是否為舞台本身
    if (e.target === e.target.getStage()) {
      setSelectedImage(null);
    }
  }, []);

  const handleImageDblClick = useCallback((imageId: string) => {
    setSelectedImage(imageId);
  }, []);

  const handleToolbarDragStart = () => {
    setIsDraggingToolbar(true);
  };

  const handleToolbarDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDraggingToolbar(false);
    
    const { innerWidth, innerHeight } = window;
    const { clientX, clientY } = e;
    
    if (clientX < innerWidth * 0.25) {
      setToolbarPosition('left');
    } else if (clientX > innerWidth * 0.75) {
      setToolbarPosition('right');
    } else if (clientY < innerHeight * 0.25) {
      setToolbarPosition('top');
    } else {
      setToolbarPosition('bottom');
    }
  };

  const getToolbarStyles = () => {
    const baseStyles = "transition-all duration-300 bg-black bg-opacity-50 rounded-lg shadow-lg z-40";
    
    switch (toolbarPosition) {
      case 'left':
        return `fixed left-${isToolbarMinimized ? '0' : '4'} top-1/2 -translate-y-1/2 flex flex-col ${baseStyles}`;
      case 'right':
        return `fixed right-${isToolbarMinimized ? '0' : '4'} top-1/2 -translate-y-1/2 flex flex-col ${baseStyles}`;
      case 'top':
        return `fixed top-${isToolbarMinimized ? '-12' : '4'} left-1/2 -translate-x-1/2 flex flex-row ${baseStyles}`;
      case 'bottom':
        return `fixed bottom-${isToolbarMinimized ? '0' : '4'} right-4 flex flex-row ${baseStyles}`;
    }
  };

  return (
    <div 
      className="relative w-full h-screen"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        style={{ 
          background: '#ffffff',
          touchAction: 'none' // 防止觸控時的預設行為
        }}
        onClick={handleStageClick}
      >
        <Layer>
          {renderImages}
          {renderLines}
          {currentLine && (
            <Line
              points={currentLine.points}
              stroke={currentLine.strokeColor}
              strokeWidth={currentLine.strokeWidth / scale}
              tension={currentLine.tension}
              opacity={currentLine.opacity}
              dash={currentLine.dash}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={
                currentLine.tool === 'eraser' ? 'destination-out' : 'source-over'
              }
            />
          )}
        </Layer>
      </Stage>

      {/* 右側工具列 */}
      <div 
        className={getToolbarStyles()}
        draggable={true}
        onDragStart={handleToolbarDragStart}
        onDragEnd={handleToolbarDragEnd}
        style={{ cursor: isDraggingToolbar ? 'grabbing' : 'grab' }}
      >
        {/* 最小化按鈕 */}
        <div className={`p-2 ${['top', 'bottom'].includes(toolbarPosition) ? 'border-r' : 'border-b'} border-white border-opacity-20`}>
          <button
            onClick={() => setIsToolbarMinimized(!isToolbarMinimized)}
            className="text-white hover:text-gray-300 transition-colors"
            title={isToolbarMinimized ? "展開工具列" : "收起工具列"}
          >
            {isToolbarMinimized ? (
              <div className="w-8 h-8 flex items-center justify-center">
                {toolbarPosition === 'right' && <AiOutlineLeft className="w-5 h-5" />}
                {toolbarPosition === 'left' && <AiOutlineRight className="w-5 h-5" />}
                {toolbarPosition === 'top' && <AiOutlineDown className="w-5 h-5" />}
                {toolbarPosition === 'bottom' && <AiOutlineUp className="w-5 h-5" />}
              </div>
            ) : (
              <div className="w-8 h-8 flex items-center justify-center">
                {toolbarPosition === 'right' && <AiOutlineRight className="w-5 h-5" />}
                {toolbarPosition === 'left' && <AiOutlineLeft className="w-5 h-5" />}
                {toolbarPosition === 'top' && <AiOutlineUp className="w-5 h-5" />}
                {toolbarPosition === 'bottom' && <AiOutlineDown className="w-5 h-5" />}
              </div>
            )}
          </button>
        </div>

        {/* 工具按鈕區域 */}
        <div className={`transition-all duration-300 ${
          isToolbarMinimized ? 'w-0 h-0 overflow-hidden opacity-0' : 'w-auto opacity-100 p-2'
        }`}>
          <div className={`flex ${['top', 'bottom'].includes(toolbarPosition) ? 'flex-row' : 'flex-col'} gap-2`}>
            <button
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              onClick={zoomIn}
              title="放大"
            >
              <BiZoomIn size={24} className="text-white" />
            </button>

            <button
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              onClick={zoomOut}
              title="縮小"
            >
              <BiZoomOut size={24} className="text-white" />
            </button>

            <button
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              onClick={resetZoom}
              title="重置縮放"
            >
              <MdOutlineZoomOutMap size={24} className="text-white" />
            </button>

            <button
              className={`p-2 rounded-lg transition-colors ${
                dragMode 
                  ? 'bg-white text-gray-800 hover:bg-gray-100' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              onClick={() => setDragMode(!dragMode)}
              title="拖曳模式"
            >
              <MdPanTool size={24} />
            </button>

            <div
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors cursor-pointer"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDrop(e);
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e: Event) => {
                  const target = e.target as HTMLInputElement;
                  if (target?.files?.[0]) {
                    const dt = new DataTransfer();
                    dt.items.add(target.files[0]);
                    const mockEvent = {
                      preventDefault: () => {},
                      stopPropagation: () => {},
                      dataTransfer: dt,
                      nativeEvent: {
                        offsetX: 0,  // 這些值不會被使用
                        offsetY: 0
                      }
                    } as React.DragEvent<HTMLDivElement>;
                    
                    handleDrop(mockEvent, true);  // 傳入 isUpload 標記
                  }
                };
                input.click();
              }}
              title="上傳圖片（可拖放）"
            >
              <BiImageAdd size={24} className="text-white" />
            </div>

            <button
              className="p-2 bg-red-500/50 hover:bg-red-500/70 text-white rounded-lg transition-colors"
              onClick={handleClearCanvas}
              title="清除畫布"
            >
              <BiEraser size={24} />
            </button>

          <button
            className="p-2 bg-red-700 text-white rounded-lg hover:bg-red-800"
            onClick={handleClearAll}
            title="清除全部"
          >
            <BiTrash size={24} />
          </button>
        </div>
      </div>
      </div>

      {/* 聊天室面板 */}
      <div 
        id="chat-container"
        className="fixed bottom-4 left-4 w-[400px] bg-black bg-opacity-50 rounded-lg shadow-lg z-40"
      >
        {isMinimized ? (
          // 最小化時只顯示標題欄
          <div className="flex justify-between items-center p-2 border-b border-white border-opacity-20">
            <h3 className="text-white text-sm font-medium">聊天室</h3>
            <button
              onClick={() => setIsMinimized(false)}
              className="text-white hover:text-gray-300"
            >
              +
            </button>
          </div>
        ) : (
          <>
            {/* 拖曳區域 */}
            <div
              className="w-full h-1 cursor-ns-resize hover:bg-gray-500 absolute -top-1"
              onMouseDown={handleResizeStart}
              style={{ backgroundColor: 'transparent' }}
            />
            
            {/* 標題欄 */}
            <div className="flex justify-between items-center p-2 border-b border-white border-opacity-20">
              <h3 className="text-white text-sm font-medium">聊天室</h3>
              <button
                onClick={() => setIsMinimized(true)}
                className="text-white hover:text-gray-300"
              >
                -
              </button>
            </div>
            
            {/* 聊天內容區域 */}
            <div 
              className="overflow-y-auto"
              style={{ 
                height: `${chatHeight - 80}px`,
                scrollBehavior: 'smooth'
              }}
              ref={(el) => {
                if (el) {
                  el.scrollTop = el.scrollHeight;
                }
              }}
            >
              {messages.map((msg) => {
                console.log('Rendering message:', msg); // 添加日誌
                const userColor = generatePastelColor(msg.nickname);
                return (
                  <div 
                    key={msg.id} 
                    className="px-3 py-2 hover:bg-black hover:bg-opacity-40"
                  >
                    <div className="text-sm break-words flex items-start">
                      <span style={{ color: userColor }} className="mr-2 flex-shrink-0">
                        {msg.nickname}:
                      </span>
                      {msg.type === 'sticker' ? (
                        <div className="relative w-32 h-32 inline-block">
                          <Image
                            src={msg.content || ''}
                            alt="sticker"
                            fill
                            className="object-contain"
                            unoptimized
                            onError={(e) => {
                              console.error('Sticker load error:', msg.content); // 添加錯誤日誌
                            }}
                          />
                        </div>
                      ) : (
                        <span className="text-white">{msg.text}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* 輸入框 */}
        <div className="flex items-center gap-2 p-2 border-t border-gray-700">
          <StickerPicker onStickerSelect={handleStickerSelect} />
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="輸入訊息..."
            className="flex-1 px-3 py-1 bg-black bg-opacity-50 text-white border border-white border-opacity-20 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleSendMessage}
            className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            發送
          </button>
        </div>
      </div>

      {/* 房間資訊面板 */}
      <div 
        id="room-info-container"
        className="absolute top-4 right-4 w-64 bg-black bg-opacity-50 rounded-lg shadow-lg z-40"
        style={{ 
          height: isRoomInfoMinimized ? '40px' : `${roomInfoHeight}px`,
          transition: 'height 0.2s'
        }}
      >
        <div className="flex justify-between items-center p-2 border-b border-white border-opacity-20">
          <h3 className="text-white text-sm font-medium">房間名: {roomId}</h3>
          <span className="text-white text-sm">人數: {users.length}</span>
          <button
            onClick={() => setIsRoomInfoMinimized(!isRoomInfoMinimized)}
            className="text-white hover:text-gray-300"
          >
            {isRoomInfoMinimized ? <AiOutlineDown /> : <AiOutlineUp />}
          </button>
        </div>

        {!isRoomInfoMinimized && (
          <>
            <div 
              className="overflow-y-auto px-2"
              style={{ height: `${roomInfoHeight - 70}px` }}
            >
              
              <div className="py-2">
                <p className="text-white text-sm mb-1">在線成員：</p>
                <ul className="space-y-1">
                  {users.map((user, index) => (
                    <li key={index} className="text-white text-sm pl-2">
                      {user}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 拖曳調整大小的區域 */}
            <div
              className="absolute bottom-0 left-0 w-full h-1 cursor-ns-resize hover:bg-gray-500"
              onMouseDown={handleRoomInfoResize}
              style={{ backgroundColor: 'transparent' }}
            />
          </>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
        id="imageUpload"
      />
    </div>
  );
};

export default memo(Canvas);