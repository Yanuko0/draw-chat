import React from 'react';
import Konva from 'konva';
import { Stage, Layer, Line, Image as KonvaImage, Transformer, Group, Circle, Line as KonvaLine } from 'react-konva';
import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { ref, onValue, set, push, serverTimestamp, get, query, orderByKey, limitToLast, update } from 'firebase/database';
import { BiZoomIn, BiZoomOut, BiImageAdd, BiEraser, BiTrash, BiDownload, BiUndo, BiRedo } from 'react-icons/bi';
import { MdOutlineZoomOutMap, MdPanTool } from 'react-icons/md';
import debounce from 'lodash/debounce';
import { AiOutlineDown, AiOutlineUp, AiOutlineLeft, AiOutlineRight, AiOutlineMinus, AiOutlinePlus } from 'react-icons/ai';
import { KonvaEventObject } from 'konva/lib/Node';
import { Canvas as FabricCanvas } from 'fabric';
import * as fabric from 'fabric';
import StickerPicker from '../../components/StickerPicker';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { IoSend } from 'react-icons/io5';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  auth,
  database,
  dataCompressor,
  dataManager,
  performanceMonitor,
  syncStrategy
} from '../../config/firebase';

// Add at the top of the file, after imports
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

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
  deviceType: 'mouse' | 'touch' | 'pen';
  penData?: {
    pressure: number;
    tiltX: number;
    tiltY: number;
    timestamp: number;
  };
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

interface LineWithUser extends LineElement {
  userId: string;
}

// 首先定義回傳類型
interface LineProperties {
  tension: number;
  opacity: number;
  strokeWidth: number;
  lineCap: string;
  lineJoin: string;
  globalCompositeOperation: string;
  shadowBlur: number;
  tiltFactor?: number;  // 添加可選的 tiltFactor
}

const Canvas: React.FC<CanvasProps> = ({ roomId, nickname }) => {
  const { t } = useLanguage();
  const [lines, setLines] = useState<LineWithUser[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentLine, setCurrentLine] = useState<LineWithUser | null>(null);
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
  const [chatHeight, setChatHeight] = useState(240); // 預設高度 160px (4列)
  const [users, setUsers] = useState<string[]>([]);
  const [isRoomInfoMinimized, setIsRoomInfoMinimized] = useState(true);
  const [roomInfoHeight, setRoomInfoHeight] = useState(200); // 預設高度
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectedElements, setSelectedElements] = useState<any[]>([]);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [isToolbarMinimized, setIsToolbarMinimized] = useState(true);
  const [toolbarPosition, setToolbarPosition] = useState<'right' | 'left' | 'top' | 'bottom'>('right');
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState<{ x: number; y: number } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showDeleteButton, setShowDeleteButton] = useState<string | null>(null);
  const [isChatHidden, setIsChatHidden] = useState(false);
  const [startX, setStartX] = useState<number | null>(null);
  const [history, setHistory] = useState<LineWithUser[][]>([[]]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showTutorial, setShowTutorial] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUserContextMenu, setShowUserContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isKicked, setIsKicked] = useState(false);
  const router = useRouter();
  const [lastLoadedKey, setLastLoadedKey] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 50;

  const batchUpdate = useMemo(() => 
    debounce(async (updates: Record<string, any>) => {
      const batch: Record<string, any> = {};
      Object.entries(updates).forEach(([path, data]) => {
        batch[path] = data;
      });
      await update(ref(database), batch);
    }, 200)
  , []);

  // 優化監聽策略
  useEffect(() => {
    // 合併監聽
    const roomRef = ref(database, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.l) setLines(Object.values(data.l).map(dataCompressor.decompressLine));
        if (data.i) setImages(data.i);
        if (data.m) setMessages(Object.values(data.m || {}));  // 轉換為數組
        if (data.u) setUsers(Object.keys(data.u));
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

  // 使用優化後的數據儲存
  const handleDraw = useCallback(async (line: LineElement) => {
    const startTime = performance.now();
    try {
      const lineWithUser = { ...line, userId: nickname };  // 添加 userId
      const compressed = dataCompressor.compressLine(lineWithUser);
      await dataManager.batchUpdate({
        [`rooms/${roomId}/l/${Date.now()}`]: compressed
      });
      performanceMonitor.logOperation(performance.now() - startTime);
    } catch (error) {
      performanceMonitor.metrics.errors++;
      console.error('Draw error:', error);
    }
  }, [roomId]);


  const getLineProperties = (toolType: string, deviceType: 'mouse' | 'touch' | 'pen') => {
    const baseWidthMultiplier = {
      mouse: 1.5,
      touch: isMobile() ? 2.0 : 1.5, // 增加手機觸控的筆觸寬度
      pen: 1.2
    }[deviceType];

    const tensionAdjustment = {
      mouse: 0.1,
      touch: 0.2,
      pen: 0.05
    }[deviceType];

    switch (toolType) {
      case 'pencil':
        return {
          tension: 0.2 - tensionAdjustment,
          opacity: deviceType === 'pen' ? 0.95 : 0.85,
          strokeWidth: strokeWidth * (deviceType === 'mouse' ? 1.2 : 0.8) * baseWidthMultiplier,
          lineCap: 'round',
          lineJoin: 'round',
          globalCompositeOperation: 'source-over',
          shadowBlur: deviceType === 'pen' ? 0.1 : 0.2,
          tiltFactor: 0.2
        };

      case 'brush':
        return {
          tension: 0.4 - tensionAdjustment,
          opacity: 0.6,
          strokeWidth: strokeWidth * 2.0 * baseWidthMultiplier,
          lineCap: 'round',
          lineJoin: 'round',
          globalCompositeOperation: 'source-over',
          shadowBlur: 1.5,
          tiltFactor: 0.2
        };

      case 'marker':
        return {
          tension: 0.2 - tensionAdjustment,
          opacity: 0.4,
          strokeWidth: strokeWidth * 2.5 * baseWidthMultiplier,
          lineCap: 'square',
          lineJoin: 'round',
          globalCompositeOperation: 'multiply',
          shadowBlur: 0,
          tiltFactor: 0.2
        };

      case 'highlighter':
        return {
          tension: 0.1 - tensionAdjustment,
          opacity: 0.3,
          strokeWidth: strokeWidth * 3.0 * baseWidthMultiplier,
          lineCap: 'square',
          lineJoin: 'round',
          globalCompositeOperation: 'multiply',
          shadowBlur: 0,
          tiltFactor: 0.2
        };

      case 'ink':
        return {
          tension: 0.5 - tensionAdjustment,
          opacity: 0.9,
          strokeWidth: strokeWidth * 1.2 * baseWidthMultiplier,
          lineCap: 'round',
          lineJoin: 'round',
          globalCompositeOperation: 'source-over',
          shadowBlur: 0.3,
          tiltFactor: 0.2
        };

      case 'eraser':
        return {
          tension: 0.3 - tensionAdjustment,
          opacity: 1,
          strokeWidth: strokeWidth * 2.0 * baseWidthMultiplier,
          lineCap: 'round',
          lineJoin: 'round',
          globalCompositeOperation: 'destination-out',
          shadowBlur: 0,
          tiltFactor: 0.2
        };

      default:
        return {
          tension: 0.4 - tensionAdjustment,
          opacity: 1,
          strokeWidth: strokeWidth * baseWidthMultiplier,
          lineCap: 'round',
          lineJoin: 'round',
          globalCompositeOperation: 'source-over',
          shadowBlur: 0,
          tiltFactor: 0.2
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
    const getPressure = (evt: any): number => {
      if (evt.pointerType === 'pen') {
        return Math.max(0.15, evt.pressure * 1.5);
      }

      const deviceType = getDeviceType(evt);
      if (deviceType === 'mouse') {  // 只針對滑鼠修改
        return 1;  // 給滑鼠一個固定較高的壓力值
      }

      if (deviceType === 'touch') {
        return 0.9;  // 給手機觸控一個固定較高的壓力值
      }

      // 其他設備保持原邏輯
      const toolPressureRanges = {
        pencil: {
          mouse: { base: 0.5, min: 0.4, max: 0.6 },
          touch: { base: 0.6, min: 0.5, max: 0.7 },
          pen: { base: 0.4, min: 0.3, max: 0.5 }
        },
        pen: {
          mouse: { base: 0.7, min: 0.6, max: 0.8 },
          touch: { base: 0.8, min: 0.7, max: 0.9 },
          pen: { base: 0.6, min: 0.4, max: 0.8 }
        },
        brush: {
          mouse: { base: 0.6, min: 0.5, max: 0.7 },
          touch: { base: 0.7, min: 0.6, max: 0.8 },
          pen: { base: 0.5, min: 0.3, max: 0.7 }
        },
        marker: {
          mouse: { base: 0.8, min: 0.7, max: 0.9 },
          touch: { base: 0.9, min: 0.8, max: 1.0 },
          pen: { base: 0.7, min: 0.6, max: 0.8 }
        },
        eraser: {
          mouse: { base: 0.7, min: 0.6, max: 0.8 },
          touch: { base: 0.8, min: 0.7, max: 0.9 },
          pen: { base: 0.6, min: 0.5, max: 0.7 }
        }
      };

      const ranges = toolPressureRanges[tool as keyof typeof toolPressureRanges]?.[deviceType] ||
        toolPressureRanges.pencil[deviceType];

      return Math.max(ranges.min, Math.min(ranges.max, evt.pressure || ranges.base));
    };

    if (e.evt.pointerType === 'pen') {
      e.evt.preventDefault();
      e.evt.stopPropagation();
    }

    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();
    const deviceType = getDeviceType(e.evt);
    const pressure = getPressure(e.evt);

    if (e.evt.pointerType === 'pen') {
      const lineProps = getLineProperties(tool, 'pen');
      const adjustedStrokeWidth = lineProps.strokeWidth * (pressure * 1.2);

      const newLine: LineWithUser = {
        tool,
        points: [pos.x, pos.y],
        strokeColor: tool === 'eraser' ? '#ffffff' : strokeColor,
        ...lineProps,
        strokeWidth: adjustedStrokeWidth,
        deviceType: 'pen',
        tension: 0.2,
        opacity: Math.min(1, lineProps.opacity * 1.3),
        userId: nickname,
      };

      setCurrentLine(newLine);
      const roomRef = ref(database, `rooms/${roomId}/lines`);
      const newLineRef = push(roomRef);
      set(newLineRef, newLine);
    } else {
      const isRightClick = e.evt.button === 2;
      const isMiddleClick = e.evt.button === 1;

      if (isRightClick || isMiddleClick || e.evt.ctrlKey || e.evt.metaKey || dragMode) {
        setIsDragging(true);
        return;
      }

      setIsPressing(true);
      setLastPointerPosition({ x: pos.x, y: pos.y });

      const lineProps = getLineProperties(tool, deviceType);
      const adjustedStrokeWidth = lineProps.strokeWidth * pressure * 0.5;

      const newLine: LineWithUser = {
        tool,
        points: [pos.x, pos.y],
        strokeColor: tool === 'eraser' ? '#ffffff' : strokeColor,
        ...lineProps,
        strokeWidth: adjustedStrokeWidth,
        deviceType: deviceType,
        userId: nickname,
      };

      setCurrentLine(newLine);
      const roomRef = ref(database, `rooms/${roomId}/lines`);
      const newLineRef = push(roomRef);
      set(newLineRef, newLine);
    }
  }, [tool, strokeColor, dragMode, roomId, nickname]);

  const debouncedUpdate = useCallback(
    debounce((path: string, data: any) => {
      const dbRef = ref(database, path);
      set(dbRef, data);
    }, 200),
    []
  );

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
    
    if (currentLine?.deviceType === 'pen') {
      const pressure = Math.max(0.2, e.evt.pressure * 1.5);
      const tiltX = e.evt.tiltX || 0;
      const tiltY = e.evt.tiltY || 0;
      const tiltAngle = Math.sqrt(tiltX * tiltX + tiltY * tiltY);
      
      const lineProps = getLineProperties(tool, 'pen');
      const tiltFactor = lineProps.tiltFactor || 0.2;
      
      // 更新筆觸寬度
      const tiltAdjustedWidth = currentLine.strokeWidth * (1 + tiltAngle * tiltFactor);
      const finalStrokeWidth = tiltAdjustedWidth * pressure;
      
      // 更新線條屬性
      currentLine.strokeWidth = finalStrokeWidth;
      currentLine.opacity = Math.min(1, lineProps.opacity * (1 + pressure * 0.2));
      currentLine.penData = {
        pressure,
        tiltX,
        tiltY,
        timestamp: Date.now()
      };
    }

    if (!isPressing || !currentLine || !lastPointerPosition) return;

    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();

    requestAnimationFrame(() => {
      const dx = pos.x - lastPointerPosition.x;
      const dy = pos.y - lastPointerPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const minDistance = 4;

      if (distance > minDistance) {
        const newPoints = [...currentLine.points, pos.x, pos.y].slice(-2000); // 只保留最後 50 個點

        const newLine = {
          ...currentLine,
          points: newPoints,
          strokeWidth: currentLine.strokeWidth
        };

        setCurrentLine(newLine);
        setLastPointerPosition({ x: pos.x, y: pos.y });

        if (newPoints.length % 8 === 0) {
          debouncedUpdate(`rooms/${roomId}/lines/${lines.length}`, newLine);
        }

        if (stageRef.current) {
          stageRef.current.batchDraw();
        }
      }
    });
  }, [isDragging, isPressing, currentLine, lastPointerPosition, roomId, lines.length, debouncedUpdate]);

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
  const handleClearCanvas = useCallback(async () => {
    try {
      const startTime = performance.now();
      const roomRef = ref(database, `rooms/${roomId}/lines`);
      
      // 獲取所有線條
      const snapshot = await get(roomRef);
      const lines = snapshot.val();
      
      if (lines) {
        // 找出所有當前用戶的線條
        const entries = Object.keys(lines).filter(key => 
          lines[key].userId === nickname
        );
        
        // 批量更新，將所有當前用戶的線條設為 null
        const updates = entries.reduce((acc, key) => {
          acc[`rooms/${roomId}/lines/${key}`] = null;
          return acc;
        }, {} as Record<string, any>);
        
        // 單次更新
        await update(ref(database), updates);
        
        // 更新本地狀態
        setLines(prev => prev.filter(line => line.userId !== nickname));
      }
      
      performanceMonitor.logOperation(performance.now() - startTime);
    } catch (error) {
      console.error('Clear canvas error:', error);
    }
  }, [roomId, nickname]);

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
      reader.onload = async (event) => {
        const imgData = event.target?.result as string;

        // 創建臨時圖片獲取尺寸
        const img = new window.Image();
        img.src = imgData;

        await new Promise((resolve) => {
          img.onload = () => {
            // 計算適當的圖片尺寸
            const maxWidth = window.innerWidth * 0.8;
            const maxHeight = window.innerHeight * 0.8;

            let width = img.width;
            let height = img.height;

            // 保持寬高比例進行縮放
            if (width > maxWidth) {
              const ratio = maxWidth / width;
              width = maxWidth;
              height = height * ratio;
            }

            if (height > maxHeight) {
              const ratio = maxHeight / height;
              height = maxHeight;
              width = width * ratio;
            }

            const stage = stageRef.current;
            let x, y;

            if (isUpload) {
              // 上傳時置中
              x = (window.innerWidth - width) / 2;
              y = (window.innerHeight - height) / 2;
            } else {
              // 拖放時使用滑鼠位置
              x = (e.nativeEvent.offsetX - stage.x()) / stage.scaleX();
              y = (e.nativeEvent.offsetY - stage.y()) / stage.scaleY();
            }

            // 調整位置考慮當前的縮放和平移
            const adjustedX = (x - position.x) / scale;
            const adjustedY = (y - position.y) / scale;

            const imageId = `image_${Date.now()}`;
            const imageRef = ref(database, `rooms/${roomId}/images/${imageId}`);

            set(imageRef, {
              id: imageId,
              x: adjustedX,
              y: adjustedY,
              width: width / scale,
              height: height / scale,
              src: imgData
            });

            resolve(true);
          };

          img.onerror = () => {
            console.error('圖片載入失敗');
            resolve(false);
          };
        });
      };

      reader.onerror = () => {
        console.error('檔案讀取失敗');
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

  // 1. 確保正確監聽圖片數據
  useEffect(() => {
    const imagesRef = ref(database, `rooms/${roomId}/images`);
    const unsubscribe = onValue(imagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const imagesList = Object.values(data) as ImageElement[];
        console.log('Loaded images:', imagesList); // 添加日誌
        setImages(imagesList);
      } else {
        setImages([]);
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  // 2. 優化圖片快取
  const imageCache = useMemo(() => {
    const cache: { [key: string]: HTMLImageElement } = {};
    
    images.forEach(image => {
      if (!cache[image.src]) {
        const img = new window.Image();
        img.src = image.src;
        cache[image.src] = img;
        
        // 添加載入完成的日誌
        img.onload = () => {
          console.log('Image loaded:', image.id);
          if (stageRef.current) {
            stageRef.current.batchDraw();
          }
        };
      }
    });
    
    return cache;
  }, [images]);

  // 使用 memo 優化渲染
  const renderLines = useMemo(() => {
    // 只渲染視窗範圍內的線條
    const visibleLines = lines.filter(line => {
      if (!line.points.length) return false;

      // 簡單的視窗範圍檢查
      const [x, y] = line.points;
      const viewportX = -position.x / scale;
      const viewportY = -position.y / scale;
      const viewportWidth = window.innerWidth / scale;
      const viewportHeight = window.innerHeight / scale;

      return x >= viewportX - 100 &&
        x <= viewportX + viewportWidth + 100 &&
        y >= viewportY - 100 &&
        y <= viewportY + viewportHeight + 100;
    });

    return visibleLines.map((line, i) => (
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
        perfectDrawEnabled={false}
        listening={false}
      />
    ));
  }, [lines, scale, position]);

  const handleDeleteImage = useCallback((imageId: string) => {
    const imageRef = ref(database, `rooms/${roomId}/images/${imageId}`);
    set(imageRef, null);
    setShowDeleteButton(null);
    setSelectedImage(null);
  }, [roomId]);

  const renderImages = useMemo(() => (
    images.map((image, i) => (
      <Group key={`image-${image.id}`}>
        <KonvaImage
          id={image.id}
          image={imageCache[image.src]}
          x={image.x}
          y={image.y}
          width={image.width}
          height={image.height}
          draggable={true}
          onClick={(e) => {
            e.cancelBubble = true;
            console.log('Image clicked:', image.id); // 添加點擊日誌
            setSelectedImage(image.id);
          }}
          onDragEnd={(e) => {
            const imageRef = ref(database, `rooms/${roomId}/images/${image.id}`);
            const updates = {
              ...image,
              x: e.target.x(),
              y: e.target.y()
            };
            console.log('Updating image position:', updates); // 添加更新日誌
            set(imageRef, updates);
          }}
        />
        {selectedImage === image.id && (
          <Transformer
            ref={transformerRef}
            resizeEnabled={true}
            rotateEnabled={true}
            boundBoxFunc={(oldBox, newBox) => {
              const minWidth = 5;
              const minHeight = 5;
              return {
                ...newBox,
                width: Math.max(minWidth, newBox.width),
                height: Math.max(minHeight, newBox.height),
              };
            }}
          />
        )}
      </Group>
    ))
  ), [images, imageCache, selectedImage, roomId]);

  const handleSendMessage = (e: React.FormEvent | React.KeyboardEvent) => {
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
        set(newMessageRef, {
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

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imgData = event.target?.result as string;

        // 創建臨時圖片獲取尺寸
        const img = new window.Image();
        img.src = imgData;

        await new Promise((resolve) => {
          img.onload = () => {
            // 計算適當的圖片尺寸
            const maxWidth = window.innerWidth * 0.8;
            const maxHeight = window.innerHeight * 0.8;

            let width = img.width;
            let height = img.height;

            // 保持寬高比例進行縮放
            if (width > maxWidth) {
              const ratio = maxWidth / width;
              width = maxWidth;
              height = height * ratio;
            }

            if (height > maxHeight) {
              const ratio = maxHeight / height;
              height = maxHeight;
              width = width * ratio;
            }

            // 計算中心位置
            const stage = stageRef.current;
            const centerX = (window.innerWidth - width) / 2;
            const centerY = (window.innerHeight - height) / 2;

            // 考慮當前的縮放和平移
            const adjustedX = (centerX - position.x) / scale;
            const adjustedY = (centerY - position.y) / scale;

            // 生成唯一 ID 並添加時間戳
            const imageId = `image_${Date.now()}`;

            // 更新到 Firebase
            const imageRef = ref(database, `rooms/${roomId}/images/${imageId}`);
            const newImage = {
              id: imageId,
              x: adjustedX,
              y: adjustedY,
              width: width / scale,
              height: height / scale,
              src: imgData,
              draggable: true // 添加可拖曳屬性
            };

            set(imageRef, newImage);
            setSelectedImage(imageId); // 上傳後自動選中圖片
          };
        });
      };
      reader.readAsDataURL(file);
    }
  }, [roomId, position, scale]);

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

  //清理不必要的監聽
  useEffect(() => {
    const cleanupListeners: (() => void)[] = [];

    // Firebase 監聽
    const roomRef = ref(database, `rooms/${roomId}/lines`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // 限制歷史記錄長度
        const newLines = Object.values(data).slice(-1000) as LineWithUser[];
        setLines(newLines);
      }
    });

    cleanupListeners.push(unsubscribe);

    return () => {
      cleanupListeners.forEach(cleanup => cleanup());
    };
  }, [roomId]);

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
    // 只有點擊到舞台本身（空白處）時才取消選中
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

  // 獲取適當的圖標大小
  const getIconSize = () => {
    return isMobile() ? 32 : 24;
  };

  // 定義統一的背景顏色樣式
  const commonBgStyle = isMobile() 
  ? 'bg-black/50 backdrop-blur-sm' 
  : 'bg-black/50 backdrop-blur-sm';

  // 修改工具列樣式
  const getToolbarStyles = () => {
    return `fixed transition-all duration-300 
      bg-black/30 
      backdrop-blur-md 
      rounded-lg 
      shadow-lg 
      z-40`; // 設定比房間資訊面板更高的 z-index
  };

  // 確保頂部工具列也在上方
  const getTopToolbarStyles = () => {
    return `fixed top-3 left-1/2 transform -translate-x-1/2 
      bg-black/30 
      backdrop-blur-md 
      rounded-lg 
      shadow-lg 
      z-40`; // 與右側工具列相同的 z-index
  };

  // 修改聊天室容器樣式
  const getChatContainerStyles = () => {
    return `fixed bottom-3 transition-all duration-300 
      ${isChatHidden ? '-left-[280px]' : 'left-3'} 
      w-[310px] 
      ${commonBgStyle}
      rounded-lg 
      shadow-lg 
      z-40`;
  };

  // 修改房間資訊面板樣式
  const getRoomInfoStyles = () => {
    return {
      container: `fixed top-3 right-3 
        w-[66vw] // 改為視窗寬度的三分之一
        bg-black/30 
        backdrop-blur-md 
        rounded-lg 
        shadow-lg 
        z-30`, // 降低 z-index，讓工具列在上方
      header: 'px-4 py-2',
      userList: 'text-white/90 text-sm'
    };
  };

  // 輔助函數：判斷設備類型
  const getDeviceType = (evt: any): 'mouse' | 'touch' | 'pen' => {
    if (evt.pointerType === 'pen') return 'pen';
    if (evt.pointerType === 'touch') return 'touch';
    return 'mouse';
  };

  // 輔助函數：獲取壓力值
  const getPressure = (evt: any): number => {
    if (evt.pointerType === 'pen') {
      return Math.max(0.15, evt.pressure * 1.5);
    }

    const deviceType = getDeviceType(evt);
    if (deviceType === 'mouse' || deviceType === 'touch') {
      return 1;  // 將手機觸控的壓力值設置為與滑鼠相同的固定值
    }

    // 其他設備保持原邏輯
    const toolPressureRanges = {
      pencil: {
        mouse: { base: 0.5, min: 0.4, max: 0.6 },
        touch: { base: 0.6, min: 0.5, max: 0.7 },
        pen: { base: 0.4, min: 0.3, max: 0.5 }
      },
      pen: {
        mouse: { base: 0.7, min: 0.6, max: 0.8 },
        touch: { base: 0.8, min: 0.7, max: 0.9 },
        pen: { base: 0.6, min: 0.4, max: 0.8 }
      },
      brush: {
        mouse: { base: 0.6, min: 0.5, max: 0.7 },
        touch: { base: 0.7, min: 0.6, max: 0.8 },
        pen: { base: 0.5, min: 0.3, max: 0.7 }
      },
      marker: {
        mouse: { base: 0.8, min: 0.7, max: 0.9 },
        touch: { base: 0.9, min: 0.8, max: 1.0 },
        pen: { base: 0.7, min: 0.6, max: 0.8 }
      },
      eraser: {
        mouse: { base: 0.7, min: 0.6, max: 0.8 },
        touch: { base: 0.8, min: 0.7, max: 0.9 },
        pen: { base: 0.6, min: 0.5, max: 0.7 }
      }
    };

    const ranges = toolPressureRanges[tool as keyof typeof toolPressureRanges]?.[deviceType] ||
      toolPressureRanges.pencil[deviceType];

    const basePressure = evt.pressure || ranges.base;
    return Math.max(ranges.min, Math.min(ranges.max, basePressure));
  };

  const handleDownloadCanvas = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    try {
      // 直接使用 toDataURL
      const dataURL = stage.toDataURL({
        pixelRatio: window.devicePixelRatio || 1,
        mimeType: 'image/png',
        quality: 1
      });

      // 創建下載連結
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `whiteboard-${timestamp}.png`;
      link.href = dataURL;

      // 觸發下載
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('下載畫布時發生錯誤:', error);
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setLines(history[currentStep - 1]);
      // 同步到 Firebase
      const roomRef = ref(database, `rooms/${roomId}/lines`);
      set(roomRef, history[currentStep - 1]);
    }
  }, [currentStep, history, roomId]);

  const handleRedo = useCallback(() => {
    if (currentStep < history.length - 1) {
      const nextStep = currentStep + 1;
      const nextLines = history[nextStep];

      // 確保只重做當前用戶的操作
      if (nextLines?.some(line => line.userId === nickname)) {
        setCurrentStep(nextStep);
        setLines(nextLines);

        // 同步到 Firebase
        const roomRef = ref(database, `rooms/${roomId}/lines`);
        set(roomRef, nextLines);
      }
    }
  }, [currentStep, history, roomId, nickname]);

  // 添加快捷鍵支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // 修改兩指縮放功能，只在拖曳模式下生效
  useEffect(() => {
    let lastDistance = 0;
    let lastCenter = { x: 0, y: 0 };

    const handleTouchStart = (e: TouchEvent) => {
      if (!dragMode) return; // 只在拖曳模式下處理

      if (e.touches.length === 2) {
        // 計算初始兩指距離
        lastDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );

        // 計算兩指中心點
        lastCenter = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2
        };
      }
    };


    

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragMode) return; // 只在拖曳模式下處理

      if (e.touches.length === 2) {
        e.preventDefault(); // 防止頁面被縮放

        // 計算當前兩指距離
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );

        // 計算當前中心點
        const center = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2
        };

        if (lastDistance > 0) {
          // 計算縮放比例
          const scaleChange = distance / lastDistance;
          const newScale = scale * scaleChange;

          // 限制縮放範圍
          const limitedScale = Math.min(Math.max(0.1, newScale), 5);

          // 更新縮放
          setScale(limitedScale);

          // 更新位置以保持縮放中心點
          const deltaX = center.x - lastCenter.x;
          const deltaY = center.y - lastCenter.y;

          setPosition(prev => ({
            x: prev.x + deltaX,
            y: prev.y + deltaY
          }));
        }

        // 更新參考值
        lastDistance = distance;
        lastCenter = center;
      }
    };

    const handleTouchEnd = () => {
      lastDistance = 0;
    };

    // 添加事件監聽器
    if (dragMode) {
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    // 清理事件監聽器
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragMode, scale, setScale, setPosition]); // 添加相關依賴

  // 添加自動清理
  useEffect(() => {
    const interval = setInterval(() => {
      dataManager.cleanOldData(roomId);
      dataManager.cleanInactiveUsers(roomId);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [roomId]);

  const canUndo = useCallback(() => {
    if (currentStep <= 0) return false;
    const currentLines = history[currentStep];
    return currentLines.some(line => line.userId === nickname);
  }, [currentStep, history, nickname]);

  const canRedo = useCallback(() => {
    if (currentStep >= history.length - 1) return false;
    const nextLines = history[currentStep + 1];
    return nextLines?.some(line => line.userId === nickname);
  }, [currentStep, history, nickname]);

  // 添加檢查創房者的 useEffect
  useEffect(() => {
    const checkCreator = async () => {
      const configRef = ref(database, `rooms/${roomId}/config`);
      const snapshot = await get(configRef);
      const config = snapshot.val();
      setIsCreator(config?.creator === nickname);
    };

    checkCreator();
  }, [roomId, nickname]);

  // 添加踢出用戶的處理函數
  const handleKickUser = async (userToKick: string) => {
    if (!isCreator || userToKick === nickname) return;

    try {
      // 刪除該用戶
      await set(ref(database, `rooms/${roomId}/users/${userToKick}`), null);
      // 添加踢出記錄
      await set(ref(database, `rooms/${roomId}/kickedUsers/${userToKick}`), true);
      setShowUserContextMenu(false);
    } catch (error) {
      console.error('踢出用戶時發生錯誤:', error);
    }
  };

  // 添加監聽被踢出的 useEffect
  useEffect(() => {
    if (!roomId || !nickname) return;

    const kickedRef = ref(database, `rooms/${roomId}/kickedUsers/${nickname}`);
    const unsubscribe = onValue(kickedRef, (snapshot) => {
      if (snapshot.exists()) {
        setIsKicked(true);
        // 顯示被踢出提示，然後導向回首頁
        setTimeout(() => {
          router.push('/');
        }, 3000); // 3秒後自動返回首頁
      }
    });

    return () => unsubscribe();
  }, [roomId, nickname, router]);

  // 優化點6: 添加渲染優化
  useEffect(() => {
    if (stageRef.current) {
      const stage = stageRef.current;
      stage.batchDraw();
    }
  }, []);

  const loadMoreData = useCallback(async () => {
    const roomRef = ref(database, `rooms/${roomId}/lines`);
    const queryRef = query(roomRef, orderByKey(), limitToLast(ITEMS_PER_PAGE));
    const snapshot = await get(queryRef);
    // ... 處理數據
  }, [roomId]);

  // 新增電繪筆相關的處理函數
  const handlePenInput = useCallback((e: any) => {
    if (e.evt.pointerType === 'pen') {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      const pos = stage.getRelativePointerPosition();
      
      // 獲取電繪筆的額外資訊
      const pressure = Math.max(0.2, e.evt.pressure * 1.5);
      const tiltX = e.evt.tiltX || 0;
      const tiltY = e.evt.tiltY || 0;
      const tiltAngle = Math.sqrt(tiltX * tiltX + tiltY * tiltY);
      
      const lineProps = getLineProperties(tool, 'pen');
      const tiltFactor = lineProps.tiltFactor || 0.2;
      
      // 根據傾斜角度調整筆觸寬度
      const tiltAdjustedWidth = strokeWidth * (1 + tiltAngle * tiltFactor);
      const finalStrokeWidth = tiltAdjustedWidth * pressure;
  
      const newLine: LineWithUser = {
        tool,
        points: [pos.x, pos.y],
        strokeColor: tool === 'eraser' ? '#ffffff' : strokeColor,
        strokeWidth: finalStrokeWidth,
        tension: lineProps.tension,
        opacity: Math.min(1, lineProps.opacity * (1 + pressure * 0.2)),
        deviceType: 'pen',
        userId: nickname,
        // 儲存電繪筆的額外資訊
        penData: {
          pressure,
          tiltX,
          tiltY,
          timestamp: Date.now()
        }
      };
  
      setCurrentLine(newLine);
      setLastPointerPosition({ x: pos.x, y: pos.y });
    }
  }, [tool, strokeColor, strokeWidth, nickname]);

  // 修改聊天室隱藏按鈕樣式
  const getChatToggleButton = () => {
    if (isMobile() && isChatHidden) {
      return (
        <button
          onClick={() => setIsChatHidden(false)}
          className={`fixed bottom-4 right-4 w-12 h-12 
            ${commonBgStyle} rounded-full shadow-lg z-40 
            flex items-center justify-center
            border border-white/20`}
        >
          <AiOutlineUp size={24} className="text-white" />
        </button>
      );
    }
    return null;
  };

  // 1. 添加 meta viewport 設置
  useEffect(() => {
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
  }, []);

  // 2. 修改聊天室輸入框
  <input
    type="text"
    value={newMessage}
    onChange={(e) => setNewMessage(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(e);
      }
    }}
    onFocus={() => {
      // 防止輸入框聚焦時的自動縮放
      document.body.style.zoom = '1';
    }}
    placeholder="message..."
    className="flex-1 px-3 py-1 bg-black bg-opacity-50 text-white border border-white border-opacity-20 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
    style={{
      fontSize: '16px', // 防止 iOS 自動縮放
      transform: 'translateZ(0)', // 強制 GPU 渲染
      WebkitAppearance: 'none', // 移除預設樣式
    }}
  />

  return (
    <div
      className="relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onPointerDown={(e) => {
          if (e.evt.pointerType === 'pen') {
            handlePenInput(e);
          } else {
            handlePointerDown(e);
          }
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          touchAction: 'none'
        }}
        scale={{ x: scale, y: scale }}
        x={position.x}
        y={position.y}
        onWheel={handleWheel}
      >
        <Layer>
          {/* 先渲染圖片 */}
          {images.map((image, i) => (
            <Group key={`image-${image.id}`}>
              <KonvaImage
                id={image.id}
                image={imageCache[image.src]}
                x={image.x}
                y={image.y}
                width={image.width}
                height={image.height}
                draggable={true}
                onClick={(e) => {
                  e.cancelBubble = true;
                  console.log('Image clicked:', image.id); // 添加點擊日誌
                  setSelectedImage(image.id);
                }}
                onDragEnd={(e) => {
                  const imageRef = ref(database, `rooms/${roomId}/images/${image.id}`);
                  const updates = {
                    ...image,
                    x: e.target.x(),
                    y: e.target.y()
                  };
                  console.log('Updating image position:', updates); // 添加更新日誌
                  set(imageRef, updates);
                }}
              />
              {selectedImage === image.id && (
                <Transformer
                  ref={transformerRef}
                  resizeEnabled={true}
                  rotateEnabled={true}
                  boundBoxFunc={(oldBox, newBox) => {
                    const minWidth = 5;
                    const minHeight = 5;
                    return {
                      ...newBox,
                      width: Math.max(minWidth, newBox.width),
                      height: Math.max(minHeight, newBox.height),
                    };
                  }}
                />
              )}
            </Group>
          ))}
          
          {/* 然後渲染線條 */}
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
        className={`${getToolbarStyles()} right-3 top-1/2 -translate-y-1/2`}
        draggable={true}
        onDragStart={handleToolbarDragStart}
        onDragEnd={handleToolbarDragEnd}
        style={{ cursor: isDraggingToolbar ? 'grabbing' : 'grab' }}
      >
        {/* 最小化按鈕 */}
        <div className={`p-1 ${['top', 'bottom'].includes(toolbarPosition) ? 'border-r' : 'border-b'} border-white border-opacity-20`}>
          <button
            onClick={() => setIsToolbarMinimized(!isToolbarMinimized)}
            className="text-white hover:text-gray-300 transition-colors"
            title={isToolbarMinimized ? "展開工具列" : "收起工具列"}
          >
            {isToolbarMinimized ? (
              <div className="w-8 h-8 flex items-center justify-center ">
                {toolbarPosition === 'right' && <AiOutlineLeft size={24} />}
                {toolbarPosition === 'left' && <AiOutlineRight size={24} />}
                {toolbarPosition === 'top' && <AiOutlineDown size={24} />}
                {toolbarPosition === 'bottom' && <AiOutlineUp size={24} />}
              </div>
            ) : (
              <div className="w-8 h-8 flex items-center justify-center ml-2">
                {toolbarPosition === 'right' && <AiOutlineRight size={24} />}
                {toolbarPosition === 'left' && <AiOutlineLeft size={24} />}
                {toolbarPosition === 'top' && <AiOutlineUp size={24} />}
                {toolbarPosition === 'bottom' && <AiOutlineDown size={24} />}
              </div>
            )}
          </button>
        </div>

        {/* 工具按鈕區域 */}
        <div className={`transition-all duration-300 ${isToolbarMinimized ? 'w-0 h-0 overflow-hidden opacity-0' : 'w-auto opacity-100 p-2'
          }`}>
          <div className={`flex ${['top', 'bottom'].includes(toolbarPosition) ? 'flex-row' : 'flex-col'} gap-2`}>
            <button
              className={`p-2 rounded-lg transition-colors ${canUndo()
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-white/10 text-white/50 cursor-not-allowed'
                }`}
              onClick={handleUndo}
              disabled={!canUndo()}
              title="復原 (Ctrl+Z)"
            >
              <BiUndo size={24} />
            </button>

            <button
              className={`p-2 rounded-lg transition-colors ${canRedo()
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-white/10 text-white/50 cursor-not-allowed'
                }`}
              onClick={handleRedo}
              disabled={!canRedo()}
              title="重做 (Ctrl+Shift+Z)"
            >
              <BiRedo size={24} />
            </button>

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
              className={`p-2 rounded-lg transition-colors ${dragMode
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
                      preventDefault: () => { },
                      stopPropagation: () => { },
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

            <button
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              onClick={handleDownloadCanvas}
              title="下載畫布"
            >
              <BiDownload size={24} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* 聊天室面板 */}
      <div
        id="chat-container"
        className={getChatContainerStyles()}
        onTouchStart={(e) => setStartX(e.touches[0].clientX)}
        onTouchMove={(e) => {
          if (startX !== null) {
            const currentX = e.touches[0].clientX;
            if (startX - currentX > 50) { // 如果向左滑動超過 50px
              setIsChatHidden(true);
            }
          }
        }}
        onTouchEnd={() => setStartX(null)}
      >
        {isMinimized ? (
          // 最小化時的標題欄
          <div className="flex justify-between items-center p-2 border-b border-white border-opacity-20">
            <h3 className="text-white text-sm font-medium">{t.chat.title}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(false)}
                className="text-white hover:text-gray-300"
              >
                <AiOutlinePlus size={24} className="icon" />
              </button>
              <button
                onClick={() => setIsChatHidden(!isChatHidden)}
                className="text-white hover:text-gray-300"
                title={isChatHidden ? "顯示聊天室" : "隱藏聊天室"}
              >
                {isChatHidden ? <AiOutlineRight size={24} className="icon" /> : <AiOutlineLeft size={24} className="icon" />}
              </button>

            </div>
          </div>
        ) : (
          <>
            {/* 展開時的標題欄 */}
            <div className="flex justify-between items-center p-2 border-b border-white border-opacity-20">
              <h3 className="text-white text-sm font-medium">{t.chat.title}</h3>
              <div className="flex items-center gap-2">

                <button
                  onClick={() => setIsMinimized(true)}
                  className="text-white hover:text-gray-300"
                >
                  <AiOutlineMinus size={24} className="icon" />
                </button>
                <button
                  onClick={() => setIsChatHidden(!isChatHidden)}
                  className="text-white hover:text-gray-300"
                  title={isChatHidden ? "顯示聊天室" : "隱藏聊天室"}
                >
                  {isChatHidden ? <AiOutlineRight size={24} className="icon" /> : <AiOutlineLeft size={24} className="icon" />}
                </button>
              </div>
            </div>

            {/* 拖曳區域 */}
            <div
              className="w-full h-1 cursor-ns-resize hover:bg-gray-500 absolute -top-1"
              onMouseDown={handleResizeStart}
              style={{ backgroundColor: 'transparent' }}
            />

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

        {/* 輸入框區域 */}
        <div className="flex items-center gap-1 p-2 border-t border-gray-700">
          {/* Sticker Picker */}
          <div className="w-[30px] flex-shrink-0">
            <StickerPicker 
              onStickerSelect={handleStickerSelect} 
              roomId={roomId}
            />
          </div>
          
          {/* 輸入框 */}
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="message..."
            className="flex-1 min-w-0 px-2 py-1 bg-black bg-opacity-50 text-white border border-white border-opacity-20 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          
          {/* 發送按鈕 */}
          <button
            onClick={handleSendMessage}
            className="w-[32px] h-[32px] flex-shrink-0 bg-[#87A9B2] text-white rounded-lg hover:bg-[#6B8B95] 
                     transition-colors duration-200 flex items-center justify-center
                     shadow-md hover:shadow-lg active:scale-95 transform"
          >
            <IoSend size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* 房間資訊面板 */}
      <div
        id="room-info-container"
        className={getRoomInfoStyles().container}
        style={{
          height: isRoomInfoMinimized ? (isMobile() ? '50px' : '40px') : `${roomInfoHeight}px`,
          transition: 'height 0.2s'
        }}
      >
        <div className={`flex justify-between items-center border-b border-white/20 ${getRoomInfoStyles().header}`}>
          <h3 className={getRoomInfoStyles().userList + ' flex-1'}>{t.roomInfo.roomName}: {roomId}</h3>
          <span className={getRoomInfoStyles().userList + ' mx-4'}>{t.roomInfo.userCount}: {users.length}</span>
          <button
            onClick={() => setIsRoomInfoMinimized(!isRoomInfoMinimized)}
            className="text-white hover:text-gray-300"
          >
            {isRoomInfoMinimized ? (
              <AiOutlineDown size={24} />
            ) : (
              <AiOutlineUp size={24} />
            )}
          </button>
        </div>

        {!isRoomInfoMinimized && (
          <>
            <div
              className="overflow-y-auto px-2"
              style={{ height: `${roomInfoHeight - 70}px` }}
            >

              <div className="py-2">
                <p className={getRoomInfoStyles().userList}>{t.roomInfo.onlineMembers}:</p>
                <ul className="space-y-1">
                  {users.map((user, index) => (
                    <li
                      key={index}
                      className={getRoomInfoStyles().userList}
                      onContextMenu={(e) => {
                        if (isCreator && user !== nickname) {
                          e.preventDefault();
                          setContextMenuPosition({ x: e.pageX, y: e.pageY });
                          setSelectedUser(user);
                          setShowUserContextMenu(true);
                        }
                      }}
                    >
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

      {/* 添加右鍵選單 */}
      {showUserContextMenu && selectedUser && (
        <>
          <div
            className="fixed bg-white rounded-lg shadow-lg py-2 z-50"
            style={{
              left: contextMenuPosition.x,
              top: contextMenuPosition.y
            }}
          >
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600"
              onClick={() => handleKickUser(selectedUser)}
            >
              踢出用戶
            </button>
          </div>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowUserContextMenu(false)}
          />
        </>
      )}

      {/* 被踢出提示 */}
      {isKicked && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <h3 className="text-xl font-medium mb-4">您已被踢出房間</h3>
            <p className="mb-4">房主已將您移出此房間</p>
            <p className="text-sm text-gray-500">3秒後自動返回首頁...</p>
          </div>
        </div>
      )}

      {/* 添加聊天室切換按鈕 */}
      {/* {getChatToggleButton()} */}
    </div>
  );
};

export default memo(Canvas);