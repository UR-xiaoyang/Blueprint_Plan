import React from 'react';
import { Minus, Square, X } from 'lucide-react';


interface TitleBarProps {
  title?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ title = '计划委员会' }) => {
  const handleMinimize = () => {
    if (window.ipcRenderer) {
      window.ipcRenderer.invoke('window-minimize');
    }
  };

  const handleMaximize = () => {
    if (window.ipcRenderer) {
      window.ipcRenderer.invoke('window-maximize');
    }
  };

  const handleClose = () => {
    if (window.ipcRenderer) {
      window.ipcRenderer.invoke('window-close');
    }
  };

  return (
    <div className="titlebar">
      <div className="titlebar-drag-region left">
        <div className="titlebar-icon">
          <img src="LOGO.png" alt="icon" style={{ height: '18px', width: 'auto' }} />
        </div>
        <div className="titlebar-app-name">计划委员会</div>
      </div>
      
      <div className="titlebar-center-title">
        {title}
      </div>

      <div className="titlebar-controls">
        <button className="titlebar-button" onClick={handleMinimize} title="最小化">
          <Minus size={16} />
        </button>
        <button className="titlebar-button" onClick={handleMaximize} title="最大化/还原">
          <Square size={14} />
        </button>
        <button className="titlebar-button close" onClick={handleClose} title="关闭">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
