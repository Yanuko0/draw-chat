import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { database } from '../config/firebase';
import { ref, get, onValue, set } from 'firebase/database';
import { AiOutlineLock, AiOutlineUnlock } from 'react-icons/ai';

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
  }, []);

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

      // 先創建房間的配置
      await set(ref(database, `rooms/${roomName}/config`), {
        isEncrypted: isEncrypted,
        password: isEncrypted ? password : null
      });

      // 再添加用戶
      await set(ref(database, `rooms/${roomName}/users/${nickname}`), true);

      router.push({
        pathname: `/whiteboard/${roomName}`,
        query: { nickname }
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
        setError('此房間不存在，請確認房間名稱或建立新房間');
        return;
      }

      // 先檢查房間是否需要密碼
      const roomConfigRef = ref(database, `rooms/${roomName}/config`);
      const configSnapshot = await get(roomConfigRef);
      const roomConfig = configSnapshot.val();
      
      console.log('Room config:', roomConfig);

      if (roomConfig?.isEncrypted) {
        console.log('Room is encrypted');
        setIsEncrypted(true);
        
        if (!password) {
          console.log('Password required');
          setPasswordError('此房間需要密碼才能加入');
          return;
        }
        
        if (password !== roomConfig.password) {
          console.log('Wrong password');
          setPasswordError('密碼錯誤');
          setPassword('');
          return;
        }
      }

      // 密碼正確或非加密房間才能繼續
      await set(ref(database, `rooms/${roomName}/users/${nickname}`), true);

      router.push({
        pathname: `/whiteboard/${roomName}`,
        query: { nickname }
      });
    } catch (err) {
      console.error('Error:', err);
      setError('檢查房間時發生錯誤，請稍後再試');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 relative">
      {/* 已建房間列表 */}
      <div className="absolute top-4 right-4 w-80 bg-black bg-opacity-50 rounded-lg shadow-lg p-4">
        <h3 className="text-white text-lg font-medium mb-2">
          已建房間 ({rooms?.length || 0})
        </h3>
        <ul className="space-y-2">
          {rooms && rooms.length > 0 ? (
            rooms.map((room) => (
              <li 
                key={room.id} 
                className="flex justify-between items-center text-white text-sm p-2 hover:bg-white/10 rounded cursor-pointer" 
                onClick={() => handleRoomClick(room.name, room.isEncrypted)}
              >
                <span className="flex-1">{room.name}</span>
                <span className="mx-2">
                  {room.isEncrypted ? 
                    <AiOutlineLock className="text-yellow-500" /> : 
                    <AiOutlineUnlock className="text-green-500" />
                  }
                </span>
                <span>{room.userCount} 人</span>
              </li>
            ))
          ) : (
            <li className="text-white text-sm text-center">目前沒有房間</li>
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