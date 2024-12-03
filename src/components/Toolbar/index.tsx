import { useCanvasStore, Tool } from '../../store/useCanvasStore';
import { useEffect, useState } from 'react';
import { MdColorize, MdFormatColorFill, MdSelectAll } from 'react-icons/md';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';

const Toolbar = () => {
  const { tool, strokeColor, strokeWidth, setTool, setStrokeWidth, setStrokeColor } = useCanvasStore();
  const [isToolbarMinimized, setIsToolbarMinimized] = useState(false);

  const handleToolChange = (newTool: Tool) => {
    console.log('Toolbar: Changing tool from', tool, 'to', newTool);
    if (tool === 'eraser' || newTool !== tool) {
      setTool(newTool);
    }
  };

  return (
    <div className={`fixed top-4 left-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 transition-all duration-300 ${
      isToolbarMinimized ? 'w-12' : 'w-auto'
    }`}>
      {isToolbarMinimized ? (
        // 縮小狀態
        <div className="p-2">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setIsToolbarMinimized(false)}
              className="p-1 hover:bg-gray-100 rounded"
              title="展開工具列"
            >
              <AiOutlineRight className="w-4 h-4" />
            </button>
            <div 
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100"
              title={`當前工具: ${
                tool === 'eraser' ? '橡皮擦' :
                tool === 'pencil' ? '鉛筆' :
                tool === 'pen' ? '原子筆' :
                tool === 'brush' ? '毛筆' :
                tool === 'marker' ? '麥克筆' : tool
              }`}
            >
              {tool === 'eraser' ? '擦' :
               tool === 'pencil' ? '筆' :
               tool === 'pen' ? '筆' :
               tool === 'brush' ? '筆' :
               tool === 'marker' ? '筆' : tool.charAt(0)}
            </div>
            {tool !== 'eraser' && (
              <div 
                className="w-6 h-6 rounded-full border border-gray-300"
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
                <select
                  className="px-2 md:px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm"
                  onChange={(e) => handleToolChange(e.target.value as Tool)}
                  value={tool === 'eraser' ? 'pencil' : tool}
                >
                  <option value="pencil">鉛筆</option>
                  <option value="pen">原子筆</option>
                  <option value="brush">毛筆</option>
                  <option value="marker">麥克筆</option>
                </select>

                <button
                  className={`px-3 md:px-4 py-2 rounded-lg border whitespace-nowrap text-sm ${
                    tool === 'eraser' 
                      ? 'bg-blue-500 text-white border-blue-600' 
                      : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
                  }`}
                  onClick={() => handleToolChange(tool === 'eraser' ? 'pencil' : 'eraser')}
                >
                  橡皮擦
                </button>
              </div>

              {tool !== 'eraser' && (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="w-8 h-8 cursor-pointer rounded border border-gray-300"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                      className="w-32"
                    />
                    <span className="text-sm w-12">{strokeWidth}px</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsToolbarMinimized(true)}
              className="ml-4 p-1 hover:bg-gray-100 rounded"
              title="收起工具列"
            >
              <AiOutlineLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Toolbar;