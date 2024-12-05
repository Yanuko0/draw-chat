import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Toolbar from '../../components/Toolbar';
import { ref, get, set, onValue } from 'firebase/database';
import { database } from '../../config/firebase';

const Canvas = dynamic(() => import('../../components/Canvas'), {
  ssr: false
});

const WhiteboardPage = () => {
  const router = useRouter();
  const { roomId, nickname } = router.query;

  const [showUserContextMenu, setShowUserContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isKicked, setIsKicked] = useState(false);

  useEffect(() => {
    // 如果沒有暱稱，重定向回首頁
    if (!nickname && router.isReady) {
      router.push('/');
    }
  }, [nickname, router.isReady]);

  useEffect(() => {
    // 檢查當前用戶是否為創房者
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

  if (!roomId || !nickname) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative">
      <Toolbar />
      <Canvas 
        roomId={roomId as string} 
        nickname={nickname as string} 
      />

      {/* 用戶列表 */}
      <div className="user-list">
        {/* 用戶列表的渲染 */}
      </div>

      {/* 用戶右鍵選單 */}
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
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-xl font-medium mb-4">您已被踢出房間</h3>
            <p className="mb-4">房主已將您移出此房間。</p>
            <button
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg"
              onClick={() => router.push('/')}
            >
              返回首頁
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhiteboardPage;