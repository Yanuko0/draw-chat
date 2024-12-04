import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const roomsRef = ref(database, 'rooms');

    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomList = Object.entries(data).map(async ([id, room]: [string, any]) => {
          const userCount = room.users ? Object.keys(room.users).length : 0;
          
          // 如果房間沒有人，直接刪除
          if (userCount === 0) {
            await set(ref(database, `rooms/${id}`), null);
          }

          return {
            id,
            name: id,
            isEncrypted: room.config?.isEncrypted || false,
            userCount
          };
        });
        
        // 等待所有操作完成後更新狀態
        Promise.all(roomList).then(setRooms);
      }
    });

    return () => unsubscribe();
  }, []);

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

      // 創建房間時保存加密狀態和密碼
      if (isEncrypted) {
        await set(ref(database, `rooms/${roomName}/config`), {
          isEncrypted: true,
          password: password
        });
      }

      // 添加用戶到房間
      await set(ref(database, `rooms/${roomName}/users/${nickname}`), true);

      // 修改這裡：使用 query 參數傳遞暱稱
      router.push({
        pathname: `/whiteboard/${roomName}`,
        query: { nickname }
      });
    } catch (err) {
      setError('檢查房間時發生錯誤，請稍後再試');
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
      const exists = await checkRoomExists(roomName);
      if (!exists) {
        setError('此房間不存在，請確認房間名稱或建立新房間');
        return;
      }

      // 檢查房間是否需要密碼
      const roomConfigRef = ref(database, `rooms/${roomName}/config`);
      const configSnapshot = await get(roomConfigRef);
      const roomConfig = configSnapshot.val();

      if (roomConfig?.isEncrypted) {
        if (!password) {
          setPasswordError('此房間需要密碼');
          return;
        }
        if (password !== roomConfig.password) {
          setPasswordError('密碼錯誤');
          return;
        }
      }

      // 修改這裡：使用 query 參數傳遞暱稱
      router.push({
        pathname: `/whiteboard/${roomName}`,
        query: { nickname }
      });
    } catch (err) {
      setError('檢查房間時發生錯誤，請稍後再試');
    }
  };

  const checkRoomExists = async (roomName: string) => {
    const roomRef = ref(database, `rooms/${roomName}`);
    const snapshot = await get(roomRef);
    return snapshot.exists();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 relative">
      {/* 已建房間列表 */}
      <div className="absolute top-4 right-4 w-80 bg-black bg-opacity-50 rounded-lg shadow-lg p-4">
        <h3 className="text-white text-lg font-medium mb-2">已建房間</h3>
        <ul className="space-y-2">
          {rooms.map((room) => (
            <li key={room.id} className="flex justify-between items-center text-white text-sm">
              <span>{room.name}</span>
              <span>{room.isEncrypted ? <AiOutlineLock /> : <AiOutlineUnlock />}</span>
              <span>{room.userCount} 人</span>
            </li>
          ))}
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