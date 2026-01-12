import React, { useState, useEffect } from 'react';
import { extensionService, Extension } from '../services/extensionService';
import { RefreshCw, FolderOpen, Play, Plus, Box } from 'lucide-react';

const ExtensionsView: React.FC = () => {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loadedExtIds, setLoadedExtIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const loadExtensions = async () => {
    setIsLoading(true);
    try {
      const exts = await extensionService.loadExtensions();
      setExtensions(exts);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunExtension = (ext: Extension) => {
    extensionService.runExtension(ext);
    setLoadedExtIds(prev => {
        const next = new Set(prev);
        next.add(ext.id);
        return next;
    });
  };

  useEffect(() => {
    loadExtensions();
  }, []);

  return (
    <div className="settings-view">
      <div className="setting-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>扩展功能 (DLC)</h2>
        </div>
        
        <p className="setting-description" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          在这里管理第三方扩展插件。将扩展文件夹放入用户目录下的 extensions 文件夹即可。
        </p>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
          <button 
            onClick={() => extensionService.openExtensionsFolder()}
            className="btn-secondary"
            style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FolderOpen size={18} />
            打开扩展文件夹
          </button>
          <button 
            onClick={async () => {
                await extensionService.createSampleExtension();
                loadExtensions();
            }}
            className="btn-secondary"
            style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} />
            创建示例扩展
          </button>
          <button 
            onClick={loadExtensions}
            className="btn-secondary"
            style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={18} className={isLoading ? "spin" : ""} />
            刷新列表
          </button>
        </div>
        
        {extensions.length === 0 ? (
           <div style={{ 
             padding: '3rem', 
             textAlign: 'center', 
             background: 'var(--bg-secondary)', 
             borderRadius: 'var(--radius-md)',
             color: 'var(--text-secondary)',
             display: 'flex',
             flexDirection: 'column',
             alignItems: 'center',
             gap: '1rem'
           }}>
             <Box size={48} opacity={0.5} />
             <div>暂无已安装的扩展</div>
           </div>
        ) : (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             {extensions.map(ext => (
               <div key={ext.id} style={{ 
                 padding: '1.5rem', 
                 background: 'var(--bg-secondary)', 
                 borderRadius: 'var(--radius-md)',
                 border: '1px solid var(--border-color)',
                 display: 'flex',
                 justifyContent: 'space-between',
                 alignItems: 'center',
                 transition: 'transform 0.2s, box-shadow 0.2s'
               }}>
                 <div>
                   <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       {ext.name} 
                       <span style={{ 
                           fontSize: '0.75rem', 
                           background: 'var(--surface-color)', 
                           padding: '2px 6px', 
                           borderRadius: '4px',
                           opacity: 0.8 
                        }}>
                           v{ext.version}
                       </span>
                    </div>
                   <div style={{ fontSize: '0.9rem', opacity: 0.8, color: 'var(--text-secondary)' }}>{ext.description || '暂无描述'}</div>
                 </div>
                 <button 
                   onClick={() => handleRunExtension(ext)}
                   disabled={loadedExtIds.has(ext.id)}
                   className={loadedExtIds.has(ext.id) ? "" : "btn-primary"}
                   style={{
                     padding: '0.5rem 1rem',
                     borderRadius: '6px',
                     background: loadedExtIds.has(ext.id) ? 'var(--success-color, #10b981)' : undefined,
                     color: '#fff',
                     border: 'none',
                     opacity: loadedExtIds.has(ext.id) ? 0.9 : 1,
                     cursor: loadedExtIds.has(ext.id) ? 'default' : 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '6px',
                     minWidth: '90px',
                     justifyContent: 'center'
                   }}
                 >
                   {loadedExtIds.has(ext.id) ? (
                       <>已加载</>
                   ) : (
                       <><Play size={16} fill="currentColor" /> 加载</>
                   )}
                 </button>
               </div>
             ))}
           </div>
        )}
      </div>
    </div>
  );
};

export default ExtensionsView;
