import { useState } from 'react';
import Image from 'next/image';
import styles from './index.module.css';
import {auth, dataManager, performanceMonitor } from '../../config/firebase';

interface StickerPickerProps {
  onStickerSelect: (stickerUrl: string) => void;
}

interface StickerPickerProps {
  onStickerSelect: (stickerUrl: string) => void;
  roomId: string;
}

const StickerPicker: React.FC<StickerPickerProps> = ({ onStickerSelect, roomId }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const stickers = [
    '/stickers/sticker1.png',
    '/stickers/sticker2.png',
    '/stickers/sticker3.png',
    '/stickers/sticker4.png',
    '/stickers/sticker5.png',
    '/stickers/sticker6.png',
    '/stickers/sticker7.png',
    '/stickers/sticker8.png',
    '/stickers/sticker9.png',
    '/stickers/sticker10.png',
    '/stickers/sticker11.png',
    '/stickers/sticker12.png',
    '/stickers/sticker13.png',
    '/stickers/sticker14.png',
    '/stickers/sticker15.png',
    '/stickers/sticker16.png',
    '/stickers/sticker17.png',
    '/stickers/sticker18.png',
    '/stickers/sticker19.png',
    '/stickers/sticker20.png',
    '/stickers/sticker21.png',
    '/stickers/sticker22.png',
    '/stickers/sticker23.png',
    '/stickers/sticker24.png',
    '/stickers/sticker25.png',
    '/stickers/sticker26.png',
    '/stickers/sticker27.png',
    '/stickers/sticker28.png',
    '/stickers/sticker29.png',
    '/stickers/sticker30.png',
    '/stickers/sticker31.png',
    '/stickers/sticker32.png',
    '/stickers/sticker33.png',
    '/stickers/sticker34.png',
    '/stickers/sticker35.png',
    '/stickers/sticker36.png',
    '/stickers/sticker37.png',
    '/stickers/sticker38.png',
    '/stickers/sticker39.png',
    
  ];

  const handleStickerSelect = async (stickerUrl: string) => {
    const startTime = performance.now();
    try {
      await dataManager.batchUpdate({
        [`rooms/${roomId}/m/${Date.now()}`]: {
          u: auth.currentUser?.uid,
          t: '',
          type: 'sticker',
          content: stickerUrl,
          ts: Date.now()
        }
      });
      performanceMonitor.logOperation(performance.now() - startTime);
    } catch (error) {
      performanceMonitor.metrics.errors++;
      console.error('Sticker send error:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
      >
        <Image 
          src="/stickers/小八.png"
          alt="sticker"
          width={24}
          height={24}
          className="w-6 h-6"
          unoptimized
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 bg-white rounded-lg shadow-lg p-2 grid grid-cols-4 gap-2 max-h-[360px] overflow-y-auto z-30 w-[360px]">
          {stickers.map((sticker, index) => (
            <button
              key={index}
              className="p-2 hover:bg-gray-100 rounded flex items-center justify-center min-w-[80px] min-h-[80px]"
              onClick={() => {
                onStickerSelect(sticker);
                setIsOpen(false);
              }}
            >
              <Image
                src={sticker}
                alt={`sticker-${index}`}
                width={64}
                height={64}
                className="w-16 h-16 object-contain"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StickerPicker; 