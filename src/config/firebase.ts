import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, get, set, update } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import debounce from 'lodash/debounce';

const firebaseConfig = {
  apiKey: "AIzaSyCOqBRh9kzXBHbDt5CrAEWdZxGMM_0tpBU",
  authDomain: "chiikawa-draw-chat.firebaseapp.com",
  databaseURL: "https://chiikawa-draw-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chiikawa-draw-chat",
  storageBucket: "chiikawa-draw-chat.firebasestorage.app",
  messagingSenderId: "737967188728",
  appId: "1:737967188728:web:89f96f4978a127cca4290d",
  measurementId: "G-KMRDL2DQ37"
};

// 確保只初始化一次
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const database = getDatabase(app);
export const auth = getAuth(app);

export const syncStrategy = {
  // 根據網路狀況調整同步頻率
  getSyncInterval: () => {
    const connection = (navigator as any).connection;
    if (!connection) return 200;
    
    switch(connection.effectiveType) {
      case '4g': return 100;
      case '3g': return 300;
      default: return 500;
    }
  }
};

interface LineElement {
  points: number[];
  strokeColor: string;
  strokeWidth: number;
  tool: string;
  deviceType: 'mouse' | 'touch' | 'pen';
  opacity?: number;
  dash?: number[];
  userId: string;
}

// 優化的數據結構介面
interface OptimizedRoom {
  l: {  // lines
    [key: string]: {
      p: number[];    // points
      c: string;      // color
      w: number;      // width
      t: 'b' | 'e';   // tool
      d: 'm' | 't' | 'p';  // device
      o?: number;     // opacity
      u: string;      // userId
      ts: number;     // timestamp
    }
  };
  i?: {  // images
    [key: string]: {
      s: string;      // src
      x: number;      // position x
      y: number;      // position y
      w: number;      // width
      h: number;      // height
    }
  };
  m?: {  // messages
    [key: string]: {
      u: string;      // userId
      t: string;      // text
      ts: number;     // timestamp
    }
  };
  u: {  // users
    [key: string]: {
      n: string;      // nickname
      l: number;      // last active
    }
  };
}

// 新增數據壓縮與過濾
export const dataOptimizer = {
  compressLine: (line: LineElement): OptimizedRoom['l'][string] => ({
    p: line.points.map(n => Math.round(n * 10) / 10),
    c: line.strokeColor,
    w: Math.round(line.strokeWidth),
    t: line.tool === 'eraser' ? 'e' : 'b',
    d: line.deviceType[0] as 'm' | 't' | 'p',
    o: line.opacity,
    u: line.userId,
    ts: Date.now()
  }),

  filterOldData: (data: Record<string, { ts: number }>, timeWindow: number = 30 * 60 * 1000) => {
    const now = Date.now();
    return Object.entries(data).reduce<Record<string, { ts: number }>>((acc, [key, value]) => {
      if (now - value.ts < timeWindow) {
        acc[key] = value;
      }
      return acc;
    }, {});
  }
};

// 數據管理工具
export const dataManager = {
  // 清理舊數據
  cleanOldData: async (roomId: string) => {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const data = snapshot.val();
    
    if (data?.l && Object.keys(data.l).length > 1000) {
      const sortedLines = Object.entries(data.l)
        .sort((a, b) => (b[1] as { ts: number }).ts - (a[1] as { ts: number }).ts)
        .slice(0, 1000);
      
      await set(roomRef, { 
        ...data,
        l: Object.fromEntries(sortedLines)
      });
    }
  },

  batchUpdate: debounce(async (updates: Record<string, any>) => {
    const batch: Record<string, any> = {};
    Object.entries(updates).forEach(([path, data]) => {
      batch[path] = data;
    });
    await update(ref(database), batch);
  }, 200),

  cleanInactiveUsers: async (roomId: string) => {
    const usersRef = ref(database, `rooms/${roomId}/u`);
    const snapshot = await get(usersRef);
    const users = snapshot.val();
    
    if (users) {
      const now = Date.now();
      const activeUsers = Object.entries(users)
        .filter(([_, user]: [string, any]) => 
          now - user.l < 5 * 60 * 1000
        );
      
      await set(usersRef, Object.fromEntries(activeUsers));
    }
  },

  // 新增：錯誤處理和重試機制
  retryOperation: async (operation: () => Promise<any>, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  },

  // 新增：緩存管理
  cache: {
    data: new Map<string, any>(),
    maxAge: 5 * 60 * 1000, // 5分鐘

    set(key: string, value: any) {
      this.data.set(key, {
        value,
        timestamp: Date.now()
      });
    },

    get(key: string) {
      const item = this.data.get(key);
      if (!item) return null;
      
      if (Date.now() - item.timestamp > this.maxAge) {
        this.data.delete(key);
        return null;
      }
      
      return item.value;
    }
  }
};

// 數據壓縮工具
export const dataCompressor = {
  // 壓縮線條數據
  compressLine: (line: LineElement) => ({
    p: line.points.map(n => Math.round(n * 10) / 10), // 減少小數點位數
    c: line.strokeColor,
    w: line.strokeWidth,
    t: line.tool.charAt(0),  // 只保留工具名首字母
    d: line.deviceType.charAt(0), // 設備類型簡化
    o: line.opacity || 1
  }),

  // 解壓線條數據
  decompressLine: (compressed: any): LineElement => ({
    points: compressed.p,
    strokeColor: compressed.c,
    strokeWidth: compressed.w,
    tool: compressed.t === 'e' ? 'eraser' : 'brush',
    deviceType: compressed.d === 'm' ? 'mouse' : 
                compressed.d === 't' ? 'touch' : 'pen',
    opacity: compressed.o,
    dash: undefined,
    userId: compressed.u
  }),

  // 壓縮圖片數據
  compressImage: async (imageData: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // 計算壓縮後的尺寸
        let width = img.width;
        let height = img.height;
        const maxSize = 800;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // 輸出壓縮後的圖片
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = imageData;
    });
  }
};

// 新增：效能監控
export const performanceMonitor = {
  metrics: {
    operations: 0,
    errors: 0,
    latency: [] as number[]
  },

  logOperation(duration: number) {
    this.metrics.operations++;
    this.metrics.latency.push(duration);
    
    if (this.metrics.latency.length > 100) {
      this.metrics.latency.shift();
    }
  },

  getAverageLatency() {
    if (!this.metrics.latency.length) return 0;
    return this.metrics.latency.reduce((a, b) => a + b) / this.metrics.latency.length;
  },

  reset() {
    this.metrics.operations = 0;
    this.metrics.errors = 0;
    this.metrics.latency = [];
  }
};