import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

interface DrawLine {
  tool: string;
  points: number[];
  strokeWidth: number;
  strokeColor: string;
  tension?: number;
  opacity?: number;
  dash?: number[];
}

io.on('connection', (socket) => {
  console.log('使用者連接:', socket.id);

  // 加入房間
  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    console.log(`使用者 ${socket.id} 加入房間 ${roomId}`);
  });

  // 處理繪圖事件
  socket.on('draw-line', ({ roomId, line }: { roomId: string; line: DrawLine }) => {
    socket.to(roomId).emit('draw-line', line);
  });

  // 處理清除畫布事件
  socket.on('clear-canvas', (roomId: string) => {
    socket.to(roomId).emit('clear-canvas');
  });

  socket.on('disconnect', () => {
    console.log('使用者斷開連接:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`伺服器運行在 port ${PORT}`);
}); 