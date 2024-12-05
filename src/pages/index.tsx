import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { database } from '../config/firebase';
import { ref, get, onValue, set } from 'firebase/database';
import { AiOutlineLock, AiOutlineUnlock, AiOutlineRight, AiOutlineLeft } from 'react-icons/ai';

interface Room {
  id: string;
  name: string;
  isEncrypted: boolean;
  userCount: number;
}

interface TimerMap {
  [key: string]: NodeJS.Timeout;
}

const Home = () => {
  const [roomName, setRoomName] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const router = useRouter();
  const roomTimers = useRef<TimerMap>({});
  const [isRoomListCollapsed, setIsRoomListCollapsed] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    console.log('Starting rooms listener');
    
    const roomsRef = ref(database, 'rooms');
    console.log('Listening to:', roomsRef.toString());

    const unsubscribe = onValue(roomsRef, (snapshot) => {
      console.log('Got snapshot, exists:', snapshot.exists());
      const data = snapshot.val();
      console.log('Raw rooms data:', JSON.stringify(data, null, 2));
      
      if (data) {
        const roomList = Object.entries(data).map(([id, room]: [string, any]) => {
          console.log('Processing room:', id, room);
          const userCount = room.users ? Object.keys(room.users).length : 0;
          console.log('Room user count:', userCount);
          
          // 清除該房間之前的計時器（如果存在）
          if (roomTimers.current[id]) {
            clearTimeout(roomTimers.current[id]);
            delete roomTimers.current[id];
          }

          // 如果房間沒有人，開始計時
          if (userCount === 0) {
            console.log(`Room ${id} is empty, starting 30s timer`);
            roomTimers.current[id] = setTimeout(async () => {
              console.log(`Deleting empty room ${id}`);
              try {
                await set(ref(database, `rooms/${id}`), null);
                console.log(`Room ${id} deleted successfully`);
              } catch (error) {
                console.error(`Error deleting room ${id}:`, error);
              }
            }, 30000); // 30 秒
          }

          const roomData = {
            id,
            name: id,
            isEncrypted: room.config?.isEncrypted || false,
            userCount
          };
          console.log('Processed room data:', roomData);
          return roomData;
        });
        
        console.log('Setting rooms state with:', roomList);
        setRooms(roomList);
      } else {
        console.log('No data, setting empty rooms array');
        setRooms([]);
      }
    }, (error) => {
      console.error('Firebase error:', error);
    });

    // 添加一個立即檢查當前 rooms 狀態的功能
    setTimeout(() => {
      console.log('Current rooms state:', rooms);
    }, 1000);

    return () => {
      console.log('Cleaning up rooms listener');
      unsubscribe();
      // 清除所有計時器
      Object.values(roomTimers.current).forEach(timer => clearTimeout(timer));
      roomTimers.current = {};
    };
  }, [rooms]);

  // 在 return 之前添加一個檢查
  console.log('Rendering with rooms:', rooms);

  const validatePassword = (pass: string) => {
    const regex = /^[A-Za-z0-9]{8,16}$/;
    return regex.test(pass);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordError('');
    
    if (!roomName.trim() || !nickname.trim()) {
      setError('請輸入房間名稱和暱稱');
      return;
    }

    if (isEncrypted) {
      if (!password) {
        setPasswordError('請設定密碼');
        return;
      }
      if (!validatePassword(password)) {
        setPasswordError('密碼必須為8-16個英文字母或數字');
        return;
      }
    }

    try {
      const roomRef = ref(database, `rooms/${roomName}`);
      const snapshot = await get(roomRef);
      if (snapshot.exists()) {
        setError('此房間名稱已存在，請選擇其他名稱或直接加入');
        return;
      }

      // 創建房間時設置配置和創房者
      await set(ref(database, `rooms/${roomName}/config`), {
        isEncrypted: isEncrypted,
        password: isEncrypted ? password : null,
        creator: nickname
      });

      // 添加創房者到用戶列表
      await set(ref(database, `rooms/${roomName}/users/${nickname}`), {
        isCreator: true,
        joinTime: Date.now()
      });

      router.push({
        pathname: `/whiteboard/${roomName}`,
        query: { nickname, isCreator: 'true' }
      });
    } catch (err) {
      setError('創建房間時發生錯誤，請稍後再試');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordError('');
    
    if (!roomName.trim() || !nickname.trim()) {
      setError('請輸入房間名稱和暱稱');
      return;
    }

    try {
      const roomRef = ref(database, `rooms/${roomName}`);
      const snapshot = await get(roomRef);
      
      if (!snapshot.exists()) {
        setError('找不到此房間');
        return;
      }

      const roomData = snapshot.val();
      if (roomData.config?.isEncrypted) {
        if (!password) {
          setPasswordError('請輸入密碼');
          return;
        }
        if (password !== roomData.config.password) {
          setPasswordError('密碼錯誤');
          return;
        }
      }

      // 檢查是否被踢出
      if (roomData.kickedUsers?.[nickname]) {
        setError('您已被踢出該房間，無法重新加入');
        return;
      }

      // 加入房間
      await set(ref(database, `rooms/${roomName}/users/${nickname}`), {
        isCreator: false,
        joinTime: Date.now()
      });

      router.push({
        pathname: `/whiteboard/${roomName}`,
        query: { nickname, isCreator: 'false' }
      });
    } catch (err) {
      console.error('Error:', err);
      setError('加入房間時發生錯誤，請稍後再試');
    }
  };

  const checkRoomExists = async (roomName: string) => {
    const roomRef = ref(database, `rooms/${roomName}`);
    const snapshot = await get(roomRef);
    return snapshot.exists();
  };

  // 添加點擊房間的處理函數
  const handleRoomClick = async (roomId: string, isEncrypted: boolean) => {
    setRoomName(roomId);
    setError('');
    setPasswordError('');
    
    if (isEncrypted) {
      setIsEncrypted(true);
      setPasswordError('此房間需要密碼才能加入');
    } else {
      setIsEncrypted(false);
      setPassword('');
    }
  };

  // 添加右鍵選單處理函數
  const handleContextMenu = (e: React.MouseEvent, room: Room) => {
    e.preventDefault();
    if (room.userCount > 0) return; // 如果房間有人，不顯示選單

    setContextMenuPosition({ x: e.pageX, y: e.pageY });
    setSelectedRoom(room);
    setShowContextMenu(true);
  };

  // 添加刪除房間函數
  const handleDeleteRoom = async () => {
    if (!selectedRoom) return;
    
    if (deletePassword !== '0323') {
      setDeleteError('密碼錯誤');
      return;
    }

    try {
      // 再次確認房間是否為空
      const roomRef = ref(database, `rooms/${selectedRoom.id}`);
      const snapshot = await get(roomRef);
      const roomData = snapshot.val();
      
      if (roomData?.users && Object.keys(roomData.users).length > 0) {
        setDeleteError('無法刪除有人的房間');
        return;
      }

      // 刪除房間
      await set(roomRef, null);
      setShowDeleteDialog(false);
      setDeletePassword('');
      setDeleteError('');
      setSelectedRoom(null);
    } catch (error) {
      console.error('刪除房間時發生錯誤:', error);
      setDeleteError('刪除房間時發生錯誤');
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gray-100 relative"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 已建房間列表 */}
      <div 
        className={`absolute top-4 right-4 transition-all duration-300 ${
          isRoomListCollapsed ? 'w-12' : 'w-80'
        } bg-black bg-opacity-50 rounded-lg shadow-lg`}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div 
          className="flex items-center justify-between p-4"
          onContextMenu={(e) => e.preventDefault()}
        >
          <h3 className={`text-white text-lg font-medium ${
            isRoomListCollapsed ? 'hidden' : 'block'
          }`}>
            已建房間 ({rooms?.length || 0})
          </h3>
          <button
            onClick={() => setIsRoomListCollapsed(!isRoomListCollapsed)}
            className="text-white hover:text-gray-300 transition-colors"
          >
            {isRoomListCollapsed ? (
              <AiOutlineRight className="w-6 h-6" />
            ) : (
              <AiOutlineLeft className="w-6 h-6" />
            )}
          </button>
        </div>
        
        <ul 
          className={`space-y-2 px-4 pb-4 ${isRoomListCollapsed ? 'hidden' : 'block'}`}
          onContextMenu={(e) => e.preventDefault()}
        >
          {rooms && rooms.length > 0 ? (
            rooms.map((room) => (
              <li 
                key={room.id} 
                className="flex justify-between items-center text-white text-sm p-2 hover:bg-white/10 rounded cursor-pointer" 
                onClick={() => handleRoomClick(room.name, room.isEncrypted)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (room.userCount === 0) {
                    handleContextMenu(e, room);
                  }
                }}
              >
                <span 
                  className="flex-1"
                  onContextMenu={(e) => e.preventDefault()}
                >{room.name}</span>
                <span 
                  className="mx-2"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {room.isEncrypted ? 
                    <AiOutlineLock className="text-yellow-500" /> : 
                    <AiOutlineUnlock className="text-green-500" />
                  }
                </span>
                <span
                  onContextMenu={(e) => e.preventDefault()}
                >{room.userCount} 人</span>
              </li>
            ))
          ) : (
            <li 
              className="text-white text-sm text-center"
              onContextMenu={(e) => e.preventDefault()}
            >目前沒有房間</li>
          )}
        </ul>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">白板協作</h1>
        
        <form className="mb-6">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="輸入暱稱"
            className="w-full px-4 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={roomName}
              onChange={(e) => {
                setRoomName(e.target.value);
                setError('');
              }}
              placeholder="輸入房間名稱"
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setIsEncrypted(!isEncrypted)}
              className={`p-2 rounded-lg transition-colors ${
                isEncrypted 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}
              title={isEncrypted ? '取消加密' : '設定加密'}
            >
              {isEncrypted ? <AiOutlineLock size={24} /> : <AiOutlineUnlock size={24} />}
            </button>
          </div>

          {(isEncrypted || error.includes('密碼')) && (
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              placeholder="輸入密碼 (8-16個英文字母或數字)"
              className="w-full px-4 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {error && (
            <div className="mb-4 text-red-500 text-sm">
              {error}
            </div>
          )}
          {passwordError && (
            <div className="mb-4 text-red-500 text-sm">
              {passwordError}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleCreateRoom}
              className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              建立房間
            </button>
            <button
              type="button"
              onClick={handleJoinRoom}
              className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              加入房間
            </button>
          </div>
        </form>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>提示：</p>
          <ul className="list-disc pl-5 mt-2">
            <li>房間名稱不能為空</li>
            <li>可以分享網址給其他人加入</li>
            <li>同一房間名稱的人可以一起協作</li>
            <li>加密房間需要輸入正確密碼才能加入</li>
          </ul>
        </div>
      </div>

      {/* 右鍵選單 */}
      {showContextMenu && (
        <div 
          className="fixed bg-white rounded-lg shadow-lg py-2 z-50"
          style={{ 
            left: contextMenuPosition.x, 
            top: contextMenuPosition.y 
          }}
        >
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600"
            onClick={() => {
              setShowDeleteDialog(true);
              setShowContextMenu(false);
            }}
          >
            刪除房間
          </button>
        </div>
      )}

      {/* 刪除確認對話框 */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">刪除房間</h3>
            <p className="mb-4">&quot;{selectedRoom?.name}&quot;請輸入管理員密碼以刪除房間</p>
            
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError('');
              }}
              placeholder="輸入密碼"
              className="w-full px-4 py-2 border rounded-lg mb-4"
            />
            
            {deleteError && (
              <p className="text-red-500 text-sm mb-4">{deleteError}</p>
            )}
            
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeletePassword('');
                  setDeleteError('');
                }}
              >
                取消
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg"
                onClick={handleDeleteRoom}
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 點擊其他地方關閉右鍵選單 */}
      {showContextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowContextMenu(false)}
        />
      )}
    </div>
  );
};

// 添加 getStaticProps
export async function getStaticProps() {
  return {
    props: {}
  };
}


export default Home;