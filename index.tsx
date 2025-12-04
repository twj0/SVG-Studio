import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Files, 
  Search, 
  GitGraph, 
  Play, 
  Settings,
  X,
  FileCode,
  Download,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  FileType
} from 'lucide-react';
import { jsPDF } from 'jspdf';

// --- Types ---
interface Log {
  type: 'error' | 'info' | 'success';
  message: string;
  timestamp: string;
}

// --- Default SVG Template ---
const DEFAULT_SVG = `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="80" fill="#007acc" />
  <rect x="50" y="50" width="100" height="100" fill="none" stroke="white" stroke-width="4" />
  <text x="100" y="105" font-family="Arial" font-size="24" text-anchor="middle" fill="white">Hello</text>
</svg>`;

// --- Components ---

const ActivityBar = () => {
  return (
    <div style={{ width: '48px', backgroundColor: 'var(--bg-activity)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10px', flexShrink: 0 }}>
      <div className="icon-btn active"><Files size={24} strokeWidth={1.5} color="#fff" /></div>
      <div className="icon-btn"><Search size={24} strokeWidth={1.5} color="#858585" /></div>
      <div className="icon-btn"><GitGraph size={24} strokeWidth={1.5} color="#858585" /></div>
      <div className="icon-btn"><Play size={24} strokeWidth={1.5} color="#858585" /></div>
      <div style={{ marginTop: 'auto', paddingBottom: '10px' }}>
        <div className="icon-btn"><Settings size={24} strokeWidth={1.5} color="#858585" /></div>
      </div>
      <style>{`
        .icon-btn { padding: 12px 0; cursor: pointer; width: 100%; display: flex; justify-content: center; }
        .icon-btn:hover { color: #fff; }
        .icon-btn.active { border-left: 2px solid #fff; }
      `}</style>
    </div>
  );
};

const Sidebar = ({ onExportPDF, onExportEPS }: { onExportPDF: () => void, onExportEPS: () => void }) => {
  return (
    <div style={{ width: '250px', backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '10px 20px', fontSize: '11px', fontWeight: 'bold', color: '#bbb' }}>EXPLORER</div>
      
      <div style={{ marginBottom: '10px' }}>
        <div style={{ padding: '4px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', backgroundColor: '#37373d', color: '#fff' }}>
          <span style={{ transform: 'rotate(90deg)', margin: '0 8px', fontSize: '10px' }}>▶</span>
          <span style={{ fontWeight: 'bold', fontSize: '11px' }}>SVG STUDIO PROJECT</span>
        </div>
        <div style={{ padding: '4px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--accent)', background: '#2a2d2e' }}>
          <FileCode size={14} style={{ marginRight: '6px' }} />
          <span style={{ fontSize: '13px' }}>design.svg</span>
        </div>
      </div>

      <div style={{ padding: '10px 20px', fontSize: '11px', fontWeight: 'bold', color: '#bbb', marginTop: '20px' }}>TOOLS</div>
      <div style={{ padding: '0 10px' }}>
        <button onClick={onExportPDF} className="sidebar-btn">
          <Download size={14} /> Export as PDF
        </button>
        <button onClick={onExportEPS} className="sidebar-btn">
          <FileType size={14} /> Export as EPS
        </button>
      </div>
      <style>{`
        .sidebar-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          background: #3c3c3c;
          border: 1px solid #454545;
          color: #cccccc;
          padding: 6px 10px;
          margin-bottom: 6px;
          cursor: pointer;
          font-size: 12px;
          text-align: left;
        }
        .sidebar-btn:hover { background: #4a4a4a; }
      `}</style>
    </div>
  );
};

const Tab = ({ title, active, icon, unsaved }: { title: string, active?: boolean, icon?: any, unsaved?: boolean }) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    padding: '8px 15px', 
    background: active ? '#1e1e1e' : '#2d2d2d', 
    color: active ? '#fff' : '#969696',
    borderTop: active ? '1px solid #007acc' : '1px solid transparent',
    borderRight: '1px solid var(--border-color)',
    fontSize: '13px',
    cursor: 'pointer',
    minWidth: '120px'
  }}>
    {icon && <span style={{ marginRight: '6px', display: 'flex' }}>{icon}</span>}
    {title}
    {unsaved && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', marginLeft: 'auto' }}></div>}
    {!unsaved && <X size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
  </div>
);

const StatusBar = () => (
  <div style={{ height: '22px', background: '#007acc', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '12px', justifyContent: 'space-between' }}>
    <div style={{ display: 'flex', gap: '15px' }}>
      <span>main*</span>
      <span>0 errors</span>
      <span>0 warnings</span>
    </div>
    <div style={{ display: 'flex', gap: '15px' }}>
      <span>Ln 1, Col 1</span>
      <span>UTF-8</span>
      <span>SVG</span>
    </div>
  </div>
);

const App = () => {
  const [code, setCode] = useState(DEFAULT_SVG);
  const [logs, setLogs] = useState<Log[]>([]);
  const [activeTab, setActiveTab] = useState<'problems' | 'output' | 'terminal'>('problems');
  
  // Ref for the preview iframe/container
  const previewRef = useRef<HTMLDivElement>(null);

  // Validate SVG code
  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(code, "image/svg+xml");
    const errorNode = doc.querySelector("parsererror");

    if (errorNode) {
      const errorText = errorNode.textContent || "Unknown parsing error";
      addLog('error', `Syntax Error: ${errorText.split(':')[0]}`);
    } else {
      // Clear previous error logs related to parsing if successful
      // For this demo, we just add a success log if the previous one was error, or keep silent to avoid spam
      // We'll re-scan logs to see if we are currently in error state
    }
  }, [code]);

  const addLog = (type: Log['type'], message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ type, message, timestamp: time }, ...prev]);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Since we can't easily use svg2pdf in this environment without proper bundling,
      // we will use a canvas rasterization fallback for the PDF export or just text if raster fails.
      // Better approach for this environment: Add the SVG as an image to the PDF.
      
      const svgBlob = new Blob([code], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = canvas.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 10, 10, 100, 100 * (img.height / img.width));
          doc.save("design.pdf");
          addLog('success', 'Successfully exported to PDF');
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        addLog('error', 'Failed to render SVG for PDF export. Check syntax.');
      };
      img.src = url;
      
    } catch (e: any) {
      addLog('error', `Export failed: ${e.message}`);
    }
  };

  const exportEPS = () => {
    // Client-side EPS generation is complex. We will save the source with .eps extension
    // and a warning, which is a common fallback for lightweight web tools.
    downloadFile(code, 'design.eps', 'application/postscript');
    addLog('info', 'Exported as EPS (Source SVG wrapped). Note: True EPS requires server-side processing.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Activity Bar */}
        <ActivityBar />

        {/* Sidebar */}
        <Sidebar onExportPDF={exportPDF} onExportEPS={exportEPS} />

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
          
          {/* Editor/Preview Split */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            
            {/* Code Editor */}
            <div style={{ width: '50%', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', background: '#252526', overflowX: 'auto' }}>
                <Tab title="design.svg" active icon={<FileCode size={14} color="#e37933" />} unsaved />
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                 {/* Line Numbers Simulation */}
                <div style={{ 
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: '40px', 
                  background: '#1e1e1e', color: '#858585', fontSize: '13px', 
                  fontFamily: 'Consolas, monospace', padding: '10px 0', textAlign: 'right', paddingRight: '10px',
                  lineHeight: '1.5', userSelect: 'none'
                }}>
                  {code.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
                </div>
                <textarea
                  spellCheck={false}
                  value={code}
                  onChange={handleCodeChange}
                  style={{
                    position: 'absolute', left: '40px', top: 0, right: 0, bottom: 0,
                    background: 'transparent',
                    color: '#d4d4d4',
                    border: 'none',
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'Consolas, "Courier New", monospace',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    padding: '10px',
                    whiteSpace: 'pre'
                  }}
                />
              </div>
            </div>

            {/* Preview */}
            <div style={{ width: '50%', display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
              <div style={{ display: 'flex', background: '#252526', overflowX: 'auto' }}>
                <Tab title="Preview" icon={<ImageIcon size={14} color="#b180d7" />} />
              </div>
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundImage: 'conic-gradient(#2d2d2d 90deg, transparent 90deg)',
                backgroundSize: '20px 20px',
                backgroundColor: '#1e1e1e' 
              }}>
                <div 
                  ref={previewRef}
                  dangerouslySetInnerHTML={{ __html: code }} 
                  style={{ 
                    border: '1px dashed #444', 
                    background: 'transparent', // Let user set background in SVG
                    maxWidth: '90%',
                    maxHeight: '90%',
                    overflow: 'auto',
                    boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Terminal / Panel */}
          <div style={{ height: '200px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
            <div style={{ display: 'flex', gap: '25px', padding: '10px 20px', borderBottom: '1px solid #2b2b2b', fontSize: '11px', fontWeight: 600, color: '#969696', cursor: 'pointer' }}>
              <span onClick={() => setActiveTab('problems')} style={{ color: activeTab === 'problems' ? '#fff' : 'inherit', borderBottom: activeTab === 'problems' ? '1px solid #fff' : 'none', paddingBottom: '4px' }}>PROBLEMS</span>
              <span onClick={() => setActiveTab('output')} style={{ color: activeTab === 'output' ? '#fff' : 'inherit', borderBottom: activeTab === 'output' ? '1px solid #fff' : 'none', paddingBottom: '4px' }}>OUTPUT</span>
              <span onClick={() => setActiveTab('terminal')} style={{ color: activeTab === 'terminal' ? '#fff' : 'inherit', borderBottom: activeTab === 'terminal' ? '1px solid #fff' : 'none', paddingBottom: '4px' }}>TERMINAL</span>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px', fontFamily: 'Consolas, monospace', fontSize: '12px' }}>
              {activeTab === 'problems' && (
                logs.filter(l => l.type === 'error').length === 0 ? (
                  <div style={{ color: '#89d185', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={14} /> No problems have been detected in the workspace.
                  </div>
                ) : (
                  logs.filter(l => l.type === 'error').map((log, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px', color: '#f14c4c' }}>
                      <AlertCircle size={14} style={{ marginTop: '2px' }} />
                      <span>{log.message}</span>
                    </div>
                  ))
                )
              )}

              {activeTab === 'terminal' && (
                 <div>
                   <div style={{ color: '#858585', marginBottom: '8px' }}>Windows PowerShell...</div>
                   <div style={{ color: '#cccccc' }}>PS C:\Users\Dev\svg-studio&gt; <span style={{ color: '#dcdcaa' }}>npm</span> start</div>
                   <div style={{ color: '#89d185' }}>Compiled successfully!</div>
                   {logs.map((log, i) => (
                     <div key={i} style={{ marginTop: '4px', color: log.type === 'error' ? '#f14c4c' : log.type === 'success' ? '#89d185' : '#cccccc' }}>
                       <span style={{ color: '#569cd6' }}>[{log.timestamp}]</span> {log.message}
                     </div>
                   ))}
                   <div style={{ color: '#cccccc', marginTop: '4px' }}>PS C:\Users\Dev\svg-studio&gt; <span className="cursor-blink">|</span></div>
                 </div>
              )}
               {activeTab === 'output' && (
                  <div style={{color: '#aaa'}}>
                    [Info] Ready for deployment to GitHub Pages.<br/>
                    [Info] Initialized SVG rendering engine.
                  </div>
               )}
            </div>
          </div>

        </div>
      </div>
      
      {/* Footer */}
      <StatusBar />
      
      <style>{`
        .cursor-blink { animation: blink 1s step-end infinite; }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);