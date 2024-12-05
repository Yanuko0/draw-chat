import { useCanvasStore, Tool } from '../../store/useCanvasStore';
import { useEffect, useState } from 'react';
import { MdColorize, MdFormatColorFill, MdSelectAll } from 'react-icons/md';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';

const Toolbar = () => {
  const { tool, strokeColor, strokeWidth, setTool, setStrokeWidth, setStrokeColor } = useCanvasStore();
  const [isToolbarMinimized, setIsToolbarMinimized] = useState(true);

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
              title="展開工具列"
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
                title="鉛筆"
              >
                筆
              </button>

              <button
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  tool === 'eraser' 
                    ? 'bg-white text-gray-800 hover:bg-gray-100' 
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                onClick={() => handleToolChange('eraser')}
                title="橡皮擦"
              >
                擦
              </button>
            </div>

            {/* 顯示當前顏色 */}
            {tool !== 'eraser' && (
              <div 
                className="w-6 h-6 rounded-full border border-white/30 shadow-sm"
                style={{ backgroundColor: strokeColor }}
                title="當前顏色"
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
                    <option className="bg-gray-800 text-white" value="pencil">鉛筆</option>
                    <option className="bg-gray-800 text-white" value="brush">毛筆</option>
                    <option className="bg-gray-800 text-white" value="marker">麥克筆</option>
                    <option className="bg-gray-800 text-white" value="highlighter">螢光筆</option>
                    <option className="bg-gray-800 text-white" value="ink">墨水筆</option>
                  </select>
                ) : (
                  <span className="px-2 md:px-4 py-2 text-white text-sm">橡皮擦</span>
                )}

                <button
                  className={`px-3 md:px-4 py-2 rounded-lg whitespace-nowrap text-sm transition-colors ${
                    tool === 'eraser' 
                      ? 'bg-white text-gray-800 hover:bg-gray-100' 
                      : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                  onClick={() => handleToolChange(tool === 'eraser' ? 'pencil' : 'eraser')}
                >
                  橡皮擦
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
                  目前使用: {
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
              title="收起工具列"
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