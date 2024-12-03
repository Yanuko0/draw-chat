import { useState } from 'react';
import Image from 'next/image';
import styles from './index.module.css';

interface StickerPickerProps {
  onStickerSelect: (stickerUrl: string) => void;
}

const StickerPicker: React.FC<StickerPickerProps> = ({ onStickerSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const stickers = [
    '/draw-chat/stickers/sticker1.png',
    '/draw-chat/stickers/sticker2.png',
    '/draw-chat/stickers/sticker3.png',
    '/draw-chat/stickers/sticker4.png',
    '/draw-chat/stickers/sticker5.png',
    '/draw-chat/stickers/sticker6.png',
    '/draw-chat/stickers/sticker7.png',
    '/draw-chat/stickers/sticker8.png',
    '/draw-chat/stickers/sticker9.png',
    '/draw-chat/stickers/sticker10.png',
    '/draw-chat/stickers/sticker11.png',
    '/draw-chat/stickers/sticker12.png',
    '/draw-chat/stickers/sticker13.png',
    '/draw-chat/stickers/sticker14.png',
    '/draw-chat/stickers/sticker15.png',
    '/draw-chat/stickers/sticker16.png',
    '/draw-chat/stickers/sticker17.png',
    '/draw-chat/stickers/sticker18.png',
    '/draw-chat/stickers/sticker19.png',
    '/draw-chat/stickers/sticker20.png',
    '/draw-chat/stickers/sticker21.png',
    '/draw-chat/stickers/sticker22.png',
    '/draw-chat/stickers/sticker23.png',
    '/draw-chat/stickers/sticker24.png',
    '/draw-chat/stickers/sticker25.png',
    '/draw-chat/stickers/sticker26.png',
    '/draw-chat/stickers/sticker27.png',
    '/draw-chat/stickers/sticker28.png',
    '/draw-chat/stickers/sticker29.png',
    '/draw-chat/stickers/sticker30.png',
    '/draw-chat/stickers/sticker31.png',
    '/draw-chat/stickers/sticker32.png',
    '/draw-chat/stickers/sticker33.png',
    '/draw-chat/stickers/sticker34.png',
    '/draw-chat/stickers/sticker35.png',
    '/draw-chat/stickers/sticker36.png',
    '/draw-chat/stickers/sticker37.png',
    '/draw-chat/stickers/sticker38.png',
    '/draw-chat/stickers/sticker39.png',
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
      >
        <Image 
          src="/draw-chat/stickers/sticker1.png"
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