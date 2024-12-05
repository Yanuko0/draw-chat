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
    <div className={`fixed top-4 left-4 z-50 bg-black bg-opacity-50 rounded-lg shadow-lg transition-all duration-300 ${
      isToolbarMinimized ? 'w-12' : 'w-auto'
    }`}>
      {isToolbarMinimized ? (
        // 縮小狀態
        <div className="p-2">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setIsToolbarMinimized(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title={t.toolbar.expand}
            >
              <AiOutlineRight className="w-4 h-4 text-white" />
            </button>

            {/* 工具選擇按鈕 */}
            <div className="flex flex-col gap-2">
              <button
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  tool !== 'eraser' 
                    ? 'bg-white text-gray-800 hover:bg-gray-100' 
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                onClick={() => handleToolChange('pencil')}
                title={t.toolbar.tools.pencil}
              >
                {t.toolbar.tools.pencil[0]}
              </button>

              <button
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  tool === 'eraser' 
                    ? 'bg-white text-gray-800 hover:bg-gray-100' 
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
                className="w-6 h-6 rounded-full border border-white/30 shadow-sm"
                style={{ backgroundColor: strokeColor }}
                title={t.toolbar.currentColor}
              />
            )}
          </div>
        </div>
      ) : (
        // 展開狀態
        <div className="p-2 md:p-4">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                {tool !== 'eraser' ? (
                  <select
                    className="px-2 md:px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 text-white text-sm transition-colors"
                    onChange={(e) => handleToolChange(e.target.value as Tool)}
                    value={tool}
                  >
                    <option className="bg-gray-800 text-white flex items-center gap-2" value="pencil">
                      <div className="flex items-center gap-2">
                        <BsPencilFill className="w-4 h-4" /> 鉛筆
                      </div>
                    </option>
                    <option className="bg-gray-800 text-white" value="brush">
                      <div className="flex items-center gap-2">
                        <FaPaintBrush className="w-4 h-4" /> 毛筆
                      </div>
                    </option>
                    <option className="bg-gray-800 text-white" value="marker">
                      <div className="flex items-center gap-2">
                        <MdBrush className="w-4 h-4" /> 麥克筆
                      </div>
                    </option>
                    <option className="bg-gray-800 text-white" value="highlighter">
                      <div className="flex items-center gap-2">
                        <FaHighlighter className="w-4 h-4" /> 螢光筆
                      </div>
                    </option>
                    <option className="bg-gray-800 text-white" value="ink">
                      <div className="flex items-center gap-2">
                        <FaPen className="w-4 h-4" /> 墨水筆
                      </div>
                    </option>
                  </select>
                ) : (
                  <span className="px-2 md:px-4 py-2 text-white text-sm">橡皮擦</span>
                )}

                <button
                  className={`px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                    tool === 'eraser' 
                      ? 'bg-white text-gray-800 hover:bg-gray-100' 
                      : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                  onClick={() => handleToolChange(tool === 'eraser' ? 'pencil' : 'eraser')}
                >
                  <BsFillEraserFill className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {tool !== 'eraser' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={strokeColor}
                      onChange={(e) => setStrokeColor(e.target.value)}
                      className="w-8 h-8 cursor-pointer rounded border border-white/30"
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
                    className="w-32"
                  />
                  <span className="text-sm w-12 text-white">
                    {strokeWidth}px
                  </span>
                </div>
                
                <div className="text-white text-xs opacity-70">
                  {t.toolbar.currentTool}: {
                    {
                      'pencil': '鉛筆',
                      'brush': '毛筆',
                      'marker': '麥克筆',
                      'highlighter': '螢光筆',
                      'ink': '墨水筆',
                      'eraser': '橡皮擦',
                      'select': '選擇'
                    }[tool]
                  }
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsToolbarMinimized(true)}
              className="ml-4 p-1 hover:bg-white/20 rounded transition-colors"
              title={t.toolbar.collapse}
            >
              <AiOutlineLeft className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Toolbar;