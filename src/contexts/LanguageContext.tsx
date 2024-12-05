import { createContext, useContext, useState, ReactNode } from 'react';
import { auth, database } from '../config/firebase';
import { ref, set } from 'firebase/database';

type Language = 'zh-TW' | 'en' | 'ja';

interface TranslationType {
  readonly title: string;
  readonly nickname: string;
  readonly roomName: string;
  readonly password: string;
  readonly createRoom: string;
  readonly joinRoom: string;
  readonly existingRooms: string;
  readonly noRooms: string;
  readonly people: string;
  readonly hints: {
    readonly title: string;
    readonly items: readonly string[];
  };
  readonly errors: {
    readonly emptyFields: string;
    readonly passwordRequired: string;
    readonly passwordFormat: string;
    readonly roomExists: string;
    readonly createError: string;
    readonly roomNotFound: string;
    readonly wrongPassword: string;
    readonly kicked: string;
    readonly joinError: string;
  };
  readonly searchRoom: string;
  readonly noSearchResults: string;
  readonly roomFilter: {
    readonly all: string;
    readonly public: string;
    readonly private: string;
  };
  readonly chat: {
    readonly title: string;
    readonly placeholder: string;
    readonly send: string;
  };
  readonly whiteboard: {
    readonly kickUser: string;
    readonly kicked: string;
    readonly kickedDesc: string;
    readonly backToHome: string;
    readonly loading: string;
  };
  readonly toolbar: {
    readonly expand: string;
    readonly collapse: string;
    readonly tools: {
      readonly pencil: string;
      readonly brush: string;
      readonly marker: string;
      readonly highlighter: string;
      readonly ink: string;
      readonly eraser: string;
      readonly select: string;
    };
    readonly currentColor: string;
    readonly currentTool: string;
    readonly strokeWidth: string;
  };
}

interface LanguageContextType {
  currentLang: Language;
  setCurrentLang: (lang: Language) => void;
  t: TranslationType;
}

export const translations = {
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
    },
    chat: {
      title: '聊天室',
      placeholder: '輸入訊息...',
      send: '送出'
    },
    whiteboard: {
      kickUser: '踢出用戶',
      kicked: '您已被踢出房間',
      kickedDesc: '房主已將您移出此房間',
      backToHome: '返回首頁',
      loading: '載入中...'
    },
    toolbar: {
      expand: '展開工具列',
      collapse: '收起工具列',
      tools: {
        pencil: '鉛筆',
        brush: '毛筆',
        marker: '麥克筆',
        highlighter: '螢光筆',
        ink: '墨水筆',
        eraser: '橡皮擦',
        select: '選擇'
      },
      currentColor: '當前顏色',
      currentTool: '目前使用',
      strokeWidth: 'px'
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
      roomExists: 'Room name already exists',
      createError: 'Error creating room',
      roomNotFound: 'Room not found',
      wrongPassword: 'Wrong password',
      kicked: 'You have been kicked',
      joinError: 'Error joining room'
    },
    searchRoom: 'Search rooms...',
    noSearchResults: 'No search results',
    roomFilter: {
      all: 'All',
      public: 'Public',
      private: 'Private'
    },
    chat: {
      title: 'Chat',
      placeholder: 'Type a message...',
      send: 'Send'
    },
    whiteboard: {
      kickUser: 'Kick User',
      kicked: 'You have been kicked',
      kickedDesc: 'You have been removed from this room',
      backToHome: 'Back to Home',
      loading: 'Loading...'
    },
    toolbar: {
      expand: 'Expand Toolbar',
      collapse: 'Collapse Toolbar',
      tools: {
        pencil: 'Pencil',
        brush: 'Brush',
        marker: 'Marker',
        highlighter: 'Highlighter',
        ink: 'Ink',
        eraser: 'Eraser',
        select: 'Select'
      },
      currentColor: 'Current Color',
      currentTool: 'Current Tool',
      strokeWidth: 'px'
    }
  },
  'ja': {
    title: '画遊び',
    nickname: 'ニックネームを入力',
    roomName: 'ルーム名を入力',
    password: 'パスワードを入力（8-16文字の英数字）',
    createRoom: 'ルームを作成',
    joinRoom: 'ルームに参加',
    existingRooms: '既存のルーム',
    noRooms: 'ルームがありません',
    people: '人',
    hints: {
      title: 'ヒント：',
      items: [
        'ルーム名は必須です',
        '同じルーム名のユーザーと共同作業ができます',
        '暗号化されたルームには正しいパスワードが必要です'
      ]
    },
    errors: {
      emptyFields: 'ルーム名とニックネームを入力してください',
      passwordRequired: 'パスワードを設定してください',
      passwordFormat: 'パスワードは8-16文字の英数字である必要があります',
      roomExists: 'このルーム名は既に存在します',
      createError: 'ルームの作成に失敗しました',
      roomNotFound: 'ルームが見つかりません',
      wrongPassword: 'パスワードが間違っています',
      kicked: 'キックされました',
      joinError: 'ルームへの参加に失敗しました'
    },
    searchRoom: 'ルームを検索...',
    noSearchResults: '検索結果がありません',
    roomFilter: {
      all: '全て',
      public: '公開',
      private: '非公開'
    },
    chat: {
      title: 'チャット',
      placeholder: 'メッセージを入力...',
      send: '送信'
    },
    whiteboard: {
      kickUser: 'ユーザーをキック',
      kicked: 'キックされました',
      kickedDesc: 'ルームから削除されました',
      backToHome: 'ホームに戻る',
      loading: '読み込み中...'
    },
    toolbar: {
      expand: 'ツールバーを展開',
      collapse: 'ツールバーを折りたたむ',
      tools: {
        pencil: '鉛筆',
        brush: '筆',
        marker: 'マーカー',
        highlighter: '蛍光ペン',
        ink: 'インク',
        eraser: '消しゴム',
        select: '選択'
      },
      currentColor: '現在の色',
      currentTool: '現在のツール',
      strokeWidth: 'px'
    }
  }
} as const;

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    // 檢查是否在客戶端
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('preferredLanguage');
      return (savedLang as Language) || 'zh-TW';
    }
    return 'zh-TW';
  });

  const handleLanguageChange = (newLang: Language) => {
    setCurrentLang(newLang);
    // 檢查是否在客戶端
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLanguage', newLang);
    }
    
    const user = auth.currentUser;
    if (user) {
      set(ref(database, `users/${user.uid}/preferences/language`), newLang);
    }
  };

  const t = translations[currentLang];

  return (
    <LanguageContext.Provider value={{ 
      currentLang, 
      setCurrentLang: handleLanguageChange, 
      t 
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 