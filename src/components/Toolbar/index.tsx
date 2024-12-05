import { useCanvasStore, Tool } from '../../store/useCanvasStore';
import { useEffect, useState } from 'react';
import { MdColorize, MdFormatColorFill, MdSelectAll, MdBrush } from 'react-icons/md';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import { useLanguage } from '../../contexts/LanguageContext';
import { BsFillEraserFill, BsPencilFill, BsPaintBucket } from 'react-icons/bs';
import { FaPaintBrush, FaHighlighter, FaPen } from 'react-icons/fa';

const Toolbar = () => {
  const { tool, strokeColor, strokeWidth, setTool, setStrokeWidth, setStrokeColor } = useCanvasStore();
  const [isToolbarMinimized, setIsToolbarMinimized] = useState(true);
  const { t } = useLanguage();

  const handleToolChange = (newTool: Tool) => {
    console.log('Toolbar: Changing tool from', tool, 'to', newTool);
    if (tool === 'eraser' || newTool !== tool) {
      setTool(newTool);
    }
  };

  return (
    <div className={`fixed top-2 left-2 z-50 bg-black/50 backdrop-blur-sm rounded-lg shadow-lg 
                     transition-all duration-300 border border-white/10 ${
      isToolbarMinimized ? 'w-12' : 'w-[245px]'
    }`}>
      {isToolbarMinimized ? (
        // 縮小狀態
        <div className="p-2">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setIsToolbarMinimized(false)}
              className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
              title={t.toolbar.expand}
            >
              <AiOutlineRight size={20} className="text-white" />
            </button>

            {/* 工具選擇按鈕 */}
            <div className="flex flex-col gap-2">
              <button
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
                  tool !== 'eraser' 
                    ? 'bg-white text-gray-800 hover:bg-gray-100 shadow-md' 
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                onClick={() => handleToolChange('pencil')}
                title={t.toolbar.tools.pencil}
              >
                {t.toolbar.tools.pencil[0]}
              </button>

              <button
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
                  tool === 'eraser' 
                    ? 'bg-white text-gray-800 hover:bg-gray-100 shadow-md' 
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                onClick={() => handleToolChange('eraser')}
                title={t.toolbar.tools.eraser}
              >
                <BsFillEraserFill className="w-4 h-4" />
              </button>
            </div>

            {/* 顯示當前顏色 */}
            {tool !== 'eraser' && (
              <div 
                className="w-6 h-6 rounded-full border border-white/30 shadow-md"
                style={{ backgroundColor: strokeColor }}
                title={t.toolbar.currentColor}
              />
            )}
          </div>
        </div>
      ) : (
        // 展開狀態
        <div className="p-3 md:p-4">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                {tool !== 'eraser' ? (
                  <select
                    className="px-3 py-2 bg-white/20 rounded-md hover:bg-white/30 
                               text-white text-sm transition-all shadow-sm
                               border border-white/20 focus:outline-none focus:border-white/50
                               [&>option]:text-gray-800 [&>option]:bg-white"
                    onChange={(e) => handleToolChange(e.target.value as Tool)}
                    value={tool}
                  >
                    <option value="pencil">
                      <BsPencilFill className="w-4 h-4" /> {t.toolbar.tools.pencil}
                    </option>
                    <option value="brush">
                      <FaPaintBrush className="w-4 h-4" /> {t.toolbar.tools.brush}
                    </option>
                    <option value="marker">
                      <MdBrush className="w-4 h-4" /> {t.toolbar.tools.marker}
                    </option>
                    <option value="highlighter">
                      <FaHighlighter className="w-4 h-4" /> {t.toolbar.tools.highlighter}
                    </option>
                    <option value="ink">
                      <FaPen className="w-4 h-4" /> {t.toolbar.tools.ink}
                    </option>
                  </select>
                ) : (
                  <span className="px-3 py-2 text-white text-sm">{t.toolbar.tools.eraser}</span>
                )}

                <button
                  className={`px-3 py-2 rounded-md flex items-center gap-2 text-sm transition-all shadow-sm ${
                    tool === 'eraser' 
                      ? 'bg-white text-gray-800 hover:bg-gray-100' 
                      : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                  onClick={() => handleToolChange(tool === 'eraser' ? 'pencil' : 'eraser')}
                >
                  <BsFillEraserFill className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {tool !== 'eraser' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={strokeColor}
                      onChange={(e) => setStrokeColor(e.target.value)}
                      className="w-8 h-8 cursor-pointer rounded-md border border-white/30 shadow-sm"
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                    className="w-32 accent-white"
                  />
                  <span className="text-sm text-white min-w-[3rem]">
                    {strokeWidth}{t.toolbar.strokeWidth}
                  </span>
                </div>
                
                <div className="text-white/70 text-xs">
                  {t.toolbar.currentTool}: {t.toolbar.tools[tool as keyof typeof t.toolbar.tools]}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsToolbarMinimized(true)}
              className="ml-0 p-1.5 hover:bg-white/20 rounded-md transition-colors"
              title={t.toolbar.collapse}
            >
              <AiOutlineLeft size={20} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Toolbar;