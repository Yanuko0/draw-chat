import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { database } from '../config/firebase';
import { ref, get, onValue, set } from 'firebase/database';
import { AiOutlineLock, AiOutlineUnlock, AiOutlineRight, AiOutlineLeft } from 'react-icons/ai';
import { BsSun, BsMoon } from 'react-icons/bs';
import { IoLanguage, IoSettingsSharp } from 'react-icons/io5';
import styles from '../styles/Home.module.scss';
import { useLanguage } from '../contexts/LanguageContext';

interface Room {
  id: string;
  name: string;
  isEncrypted: boolean;
  userCount: number;
}

interface TimerMap {
  [key: string]: NodeJS.Timeout;
}

// 新增語言配置
const translations = {
  'zh-TW': {
    title: '畫玩',
    nickname: '輸入暱稱',
    roomName: '輸入房間名稱',
    password: '輸入密碼 (8-16個英文字母或數字)',
    createRoom: '建立房間',
    joinRoom: '加入房間',
    existingRooms: '已建房間',
    noRooms: '目前沒有房間',
    people: '人',
    hints: {
      title: '提示：',
      items: [
        '房間名稱不能為空',
        '同一房間名稱的人可以一起協作',
        '加密房間需要輸入正確密碼才能加入'
      ]
    },
    errors: {
      emptyFields: '請輸入房間名稱和暱稱',
      passwordRequired: '請設定密碼',
      passwordFormat: '密碼必須為8-16個英文字母或數字',
      roomExists: '此房間名稱已存在，請選擇其他名稱或直接加入',
      createError: '創建房間時發生錯誤，請稍後再試',
      roomNotFound: '找不到此房間',
      wrongPassword: '密碼錯誤',
      kicked: '您已被踢出該房間，無法重新加入',
      joinError: '加入房間時發生錯誤，請稍後再試'
    },
    searchRoom: '搜尋房間...',
    noSearchResults: '沒有符合的搜尋結果',
    roomFilter: {
      all: '全部',
      public: '公開',
      private: '私密'
    }
  },
  'en': {
    title: 'Draw Fun',
    nickname: 'Enter Nickname',
    roomName: 'Enter Room Name',
    password: 'Enter Password (8-16 alphanumeric characters)',
    createRoom: 'Create Room',
    joinRoom: 'Join Room',
    existingRooms: 'Existing Rooms',
    noRooms: 'No Rooms Available',
    people: 'people',
    hints: {
      title: 'Hints:',
      items: [
        'Room name cannot be empty',
        'People with same room name can collaborate',
        'Encrypted rooms require correct password to join'
      ]
    },
    errors: {
      emptyFields: 'Please enter room name and nickname',
      passwordRequired: 'Please set a password',
      passwordFormat: 'Password must be 8-16 alphanumeric characters',
      roomExists: 'Room name already exists, please choose another or join directly',
      createError: 'Error creating room, please try again later',
      roomNotFound: 'Room not found',
      wrongPassword: 'Wrong password',
      kicked: 'You have been kicked from this room and cannot rejoin',
      joinError: 'Error joining room, please try again later'
    },
    searchRoom: 'Search rooms...',
    noSearchResults: 'No matching rooms found',
    roomFilter: {
      all: 'All',
      public: 'Public',
      private: 'Private'
    }
  },
  'ja': {
    title: '画遊び',
    nickname: 'ニックネームを入力',
    roomName: 'ルーム名を入力',
    password: 'パスワードを入力（8-16文字の英数字）',
    createRoom: 'ルーム作成',
    joinRoom: 'ルーム参加',
    existingRooms: '既存ルーム',
    noRooms: 'ルームがありません',
    people: '人',
    hints: {
      title: 'ヒント：',
      items: [
        'ルーム名は必須です',
        '同じルーム名の人と協働できます',
        '暗号化されたルームはパスワードが必要です'
      ]
    },
    errors: {
      emptyFields: 'ルーム名とニックネームを入力してください',
      passwordRequired: 'パスワードを設定してください',
      passwordFormat: 'パスワードは8-16文字の英数字である必要があります',
      roomExists: 'このルーム名は既に存在します。他の名前を選ぶか、直接参加してください',
      createError: 'ルーム作成中にエラーが発生しました。後でもう一度お試しください',
      roomNotFound: 'ルームが見つかりません',
      wrongPassword: 'パスワードが間違っています',
      kicked: 'このルームから追放されたため、再参加できまん',
      joinError: 'ルーム参加中にエラーが発生しました。後でもう一度お試しください'
    },
    searchRoom: 'ルームを検索...',
    noSearchResults: '該当するルームが見つかりません',
    roomFilter: {
      all: '全て',
      public: '公開',
      private: '非公開'
    }
  }
};

type Language = 'zh-TW' | 'en' | 'ja';

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
  const [isRoomListCollapsed, setIsRoomListCollapsed] = useState(true);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { currentLang, setCurrentLang } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState<'all' | 'public' | 'private'>('all');

  const t = translations[currentLang]; // 獲取當前語言的翻譯

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

  useEffect(() => {
    // 檢查系統預設主題
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }, []);

  // 添加主題切換函數
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.setAttribute('data-theme', !isDarkMode ? 'dark' : 'light');
  };

  const filteredRooms = rooms.filter(room => {
    const nameMatch = room.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (roomFilter === 'all') return nameMatch;
    if (roomFilter === 'public') return nameMatch && !room.isEncrypted;
    if (roomFilter === 'private') return nameMatch && room.isEncrypted;
    return nameMatch;
  });

  return (
    <div className={`${styles.container} ${styles.root} ${isDarkMode ? styles.dark : ''} flex items-center justify-center relative`}>
      {/* 主題切換按鈕 */}
      <button
        className={`${styles.themeToggle} ${isDarkMode ? styles.dark : ''}`}
        onClick={toggleTheme}
        title={isDarkMode ? '切換至亮色模式' : '切換至暗色模式'}
      >
        {isDarkMode ? <BsSun className={styles.sunIcon} /> : <BsMoon className={styles.moonIcon} />}
      </button>

      {/* 已建房間列表 */}
      <div className={`${styles.roomList} ${isRoomListCollapsed ? styles.collapsed : ''} absolute top-4 right-4 transition-all duration-300`}>
        <div className={styles.header}>
          <button
            onClick={() => setIsRoomListCollapsed(!isRoomListCollapsed)}
            className="transition-colors"
            title={isRoomListCollapsed ? "展開房間列表" : "收合房間列表"}
          >
            {isRoomListCollapsed ? (
              <AiOutlineLeft />
            ) : (
              <AiOutlineRight />
            )}
          </button>
          <h3 className={isRoomListCollapsed ? 'hidden' : 'block'}>
            {t.existingRooms} ({rooms?.length || 0})
          </h3>
          
          <div className={`${styles.headerLanguageSelector} ${isRoomListCollapsed ? 'hidden' : 'block'}`}>
            <button
              className={styles.settingsButton}
              onClick={() => setShowLangMenu(!showLangMenu)}
              title="語言設定"
            >
              <IoSettingsSharp />
            </button>
            
            {showLangMenu && (
              <div className={styles.headerLanguageMenu}>
                <div className={styles.languageOptions}>
                  <button onClick={() => { setCurrentLang('zh-TW'); setShowLangMenu(false); }}>
                    繁體中文
                  </button>
                  <button onClick={() => { setCurrentLang('en'); setShowLangMenu(false); }}>
                    English
                  </button>
                  <button onClick={() => { setCurrentLang('ja'); setShowLangMenu(false); }}>
                    日本語
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.roomContent}>
          {!isRoomListCollapsed && (
            <>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchRoom}
                className={styles.searchInput}
              />
              <div className={styles.roomFilters}>
                <button
                  onClick={() => setRoomFilter('all')}
                  className={`${styles.filterButton} ${roomFilter === 'all' ? styles.active : ''}`}
                >
                  {t.roomFilter.all}
                </button>
                <button
                  onClick={() => setRoomFilter('public')}
                  className={`${styles.filterButton} ${roomFilter === 'public' ? styles.active : ''}`}
                >
                  {t.roomFilter.public}
                </button>
                <button
                  onClick={() => setRoomFilter('private')}
                  className={`${styles.filterButton} ${roomFilter === 'private' ? styles.active : ''}`}
                >
                  {t.roomFilter.private}
                </button>
              </div>
            </>
          )}
          
          {filteredRooms.length > 0 ? (
            filteredRooms.map((room) => (
              <li
                key={room.id}
                className={styles.roomItem}
                onClick={() => handleRoomClick(room.name, room.isEncrypted)}
                onContextMenu={(e) => handleContextMenu(e, room)}
              >
                <div className={styles.roomNameSection}>
                  <span className={styles.roomName}>{room.name}</span>
                  {room.isEncrypted ? (
                    <AiOutlineLock className="text-yellow-500" />
                  ) : (
                    <AiOutlineUnlock className="text-green-500" />
                  )}
                </div>
                <span className={styles.userCount}>
                  {room.userCount} {t.people}
                </span>
              </li>
            ))
          ) : (
            <div className={styles.roomItem}>
              {searchQuery ? t.noSearchResults : t.noRooms}
            </div>
          )}
        </div>
      </div>

      {/* 將語言選單移到外層 */}
      {showLangMenu && (
        <>
          <div className={styles.languageMenuOverlay} onClick={() => setShowLangMenu(false)} />
          <div className={styles.languageMenuContainer}>
            <div className={styles.languageMenu}>
              <button onClick={() => { setCurrentLang('zh-TW'); setShowLangMenu(false); }}>
                繁體中文
              </button>
              <button onClick={() => { setCurrentLang('en'); setShowLangMenu(false); }}>
                English
              </button>
              <button onClick={() => { setCurrentLang('ja'); setShowLangMenu(false); }}>
                日本語
              </button>
            </div>
          </div>
        </>
      )}

      <div className={styles.formContainer}>
        <h1 className={styles.title}>{t.title}</h1>

        <form className="mb-6">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t.nickname}
            className={styles.inputField}
          />
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={roomName}
              onChange={(e) => {
                setRoomName(e.target.value);
                setError('');
              }}
              placeholder={t.roomName}
              className={styles.inputField}
            />
            <button
              type="button"
              onClick={() => setIsEncrypted(!isEncrypted)}
              className={`${styles.encryptButton} ${isEncrypted ? styles.encrypted : styles.unencrypted}`}
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
              placeholder={t.password}
              className={styles.inputField}
            />
          )}

          {error && <div className={styles.errorText}>{error}</div>}
          {passwordError && <div className={styles.errorText}>{passwordError}</div>}


          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleCreateRoom}
              className={`${styles.button} ${styles.primary} flex-1`}
            >
              {t.createRoom}
            </button>
            <button
              type="button"
              onClick={handleJoinRoom}
              className={`${styles.button} ${styles.secondary} flex-1`}
            >
              {t.joinRoom}
            </button>
          </div>
        </form>

        <div className={styles.hintText}>
          <p>{t.hints.title}</p>
          <ul>
            {t.hints.items.map((hint, index) => (
              <li key={index}>{hint}</li>
            ))}
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