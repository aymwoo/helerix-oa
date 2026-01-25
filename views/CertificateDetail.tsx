
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Certificate, HonorLevel } from '../types';
import { CertificateDatabase, FileManager } from '../db';

// Using react-pdf via esm.sh for PDF preview functionality
import { pdfjs, Document, Page } from 'https://esm.sh/react-pdf@9.1.1';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface CertificateDetailProps {
  certId: string;
  onBack: () => void;
}

const CertificatePreview: React.FC<{ url: string }> = ({ url }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isError, setIsError] = useState(false);
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'other'>('other');
  
  // State for resolved data URL (if coming from file://)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  // Image zoom/pan/rotate state
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const resolve = async () => {
        if (!url) return;
        setIsError(false);
        setIsResolving(true);

        let finalUrl = url;

        // Resolve virtual file system paths
        if (url.startsWith('file://')) {
            const dataUrl = await FileManager.resolveToDataUrl(url);
            if (dataUrl) {
                finalUrl = dataUrl;
            } else {
                setIsError(true);
                setIsResolving(false);
                return;
            }
        }
        
        setResolvedUrl(finalUrl);
        setIsResolving(false);

        // Reset view params
        setScale(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
        setCurrentPage(1);
        
        // Determine Type
        const extension = finalUrl.split('.').pop()?.split('?')[0].toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '') || finalUrl.includes('data:image')) {
          setFileType('image');
        } else if (extension === 'pdf' || finalUrl.includes('application/pdf')) {
          setFileType('pdf');
        } else {
          setFileType('other');
        }
    };
    resolve();
  }, [url]);

  // Use Pointer Events for unified Mouse and Touch support
  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || scale <= 1) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (fileType !== 'image') return;
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.2 : 0.2;
        const newScale = Math.min(Math.max(scale + delta, 0.5), 5);
        setScale(newScale);
        if (newScale === 1 && rotation === 0) setPosition({ x: 0, y: 0 });
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.5, 5));
  const zoomOut = () => {
    const newScale = Math.max(scale - 0.5, 0.5);
    setScale(newScale);
    if (newScale <= 1 && rotation === 0) setPosition({ x: 0, y: 0 });
  };

  const rotateClockwise = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const resetView = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleDoubleTap = () => {
    if (scale > 1) {
      resetView();
    } else {
      setScale(2);
    }
  };

  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, numPages || 1));

  if (!url || url === '#') {
    return (
      <div className="w-full aspect-[4/3] bg-background-light/50 rounded-2xl border-2 border-dashed border-border-light flex flex-col items-center justify-center text-text-muted gap-2">
        <span className="material-symbols-outlined text-4xl opacity-20">draft</span>
        <p className="text-xs font-medium">暂未上传电子凭证</p>
      </div>
    );
  }

  if (isResolving) {
      return (
          <div className="w-full min-h-[400px] flex items-center justify-center bg-background-light/30 rounded-2xl">
              <span className="material-symbols-outlined animate-spin text-text-muted">sync</span>
          </div>
      )
  }

  if ((isError || !resolvedUrl) && !url.startsWith('data:')) {
    return (
      <div className="w-full min-h-[400px] bg-red-50/50 rounded-2xl border border-red-100 flex flex-col items-center justify-center p-8 text-center gap-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl">link_off</span>
        </div>
        <div>
          <h4 className="text-lg font-bold text-red-800">档案加载受限</h4>
          <p className="text-sm text-red-600/80 max-w-md mx-auto mt-2 leading-relaxed">
            无法从虚拟文件柜或外部源解析该档案。文件可能已损坏或路径失效。
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-red-100 w-full max-w-md overflow-hidden shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-left">REFERENCE ID</p>
          <p className="text-xs font-mono text-gray-600 break-all text-left bg-gray-50 p-2 rounded border border-gray-100 select-all">{url}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden group relative print:shadow-none print:border-none">
      <div className="absolute top-3 right-3 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 print:hidden">
        {fileType === 'image' && (
           <div className="flex bg-white/95 backdrop-blur-md shadow-xl rounded-xl border border-border-light overflow-hidden">
              <button onClick={zoomOut} disabled={scale <= 0.5} className="p-2.5 text-text-main hover:bg-gray-100 border-r border-border-light disabled:opacity-30 transition-colors" title="缩小 (Ctrl + 滚轮)"><span className="material-symbols-outlined text-[20px]">zoom_out</span></button>
              <button onClick={resetView} className="p-2.5 text-text-main hover:bg-gray-100 border-r border-border-light transition-colors" title="重置视图"><span className="material-symbols-outlined text-[20px]">restart_alt</span></button>
              <button onClick={rotateClockwise} className="p-2.5 text-text-main hover:bg-gray-100 border-r border-border-light transition-colors" title="顺时针旋转 90°"><span className="material-symbols-outlined text-[20px]">rotate_right</span></button>
              <button onClick={zoomIn} className="p-2.5 text-text-main hover:bg-gray-100 transition-colors" title="放大 (Ctrl + 滚轮)"><span className="material-symbols-outlined text-[20px]">zoom_in</span></button>
           </div>
        )}
        
        {fileType === 'pdf' && numPages && numPages > 1 && (
           <div className="flex bg-white/95 backdrop-blur-md shadow-xl rounded-xl border border-border-light overflow-hidden items-center">
              <button onClick={goToPrevPage} disabled={currentPage <= 1} className="p-2.5 text-text-main hover:bg-gray-100 border-r border-border-light disabled:opacity-30 transition-colors" title="上一页"><span className="material-symbols-outlined text-[20px]">chevron_left</span></button>
              <span className="px-4 text-xs font-bold text-text-main min-w-[70px] text-center select-none">{currentPage} / {numPages}</span>
              <button onClick={goToNextPage} disabled={currentPage >= numPages} className="p-2.5 text-text-main hover:bg-gray-100 border-l border-border-light disabled:opacity-30 transition-colors" title="下一页"><span className="material-symbols-outlined text-[20px]">chevron_right</span></button>
           </div>
        )}

        <a 
          href={resolvedUrl || '#'} 
          target="_blank" 
          rel="noreferrer" 
          download={url.startsWith('file://') ? 'certificate_download' : undefined}
          className="bg-primary text-white shadow-xl p-2.5 rounded-xl hover:bg-violet-700 transition-all flex items-center gap-2 text-xs font-bold active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
          查验原件
        </a>
      </div>

      <div 
        ref={containerRef}
        className="flex items-center justify-center min-h-[400px] bg-background-light/30 print:bg-white overflow-hidden relative touch-none"
        onWheel={handleWheel}
      >
        {fileType === 'image' && resolvedUrl ? (
          <div 
            className="w-full h-full flex items-center justify-center p-6 cursor-default min-h-[500px]"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <img 
              src={resolvedUrl} 
              alt="证书预览" 
              draggable={false}
              onDoubleClick={handleDoubleTap}
              className={`max-w-full max-h-[750px] object-contain transition-transform duration-200 ease-out select-none ${scale > 1 ? 'cursor-grab active:cursor-grabbing shadow-2xl' : 'cursor-zoom-in'}`}
              style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)` }}
              onError={() => setIsError(true)}
            />
          </div>
        ) : fileType === 'pdf' && resolvedUrl ? (
          <div className="w-full h-full p-8 flex flex-col items-center overflow-y-auto max-h-[850px] no-scrollbar gap-8 print:max-h-none print:overflow-visible print:p-0">
            <Document
              file={resolvedUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={<div className="flex flex-col items-center gap-3 py-48 text-text-muted print:hidden"><span className="material-symbols-outlined animate-spin text-5xl opacity-30">sync</span><span className="text-sm font-black tracking-widest uppercase opacity-40">解析 PDF 档案...</span></div>}
              onLoadError={() => setIsError(true)}
              error={<div className="flex flex-col items-center gap-4 py-40 text-red-500 text-center px-10 print:text-black"><span className="material-symbols-outlined text-6xl opacity-20">error</span><div><p className="text-xl font-bold">PDF 解析失败</p><p className="text-sm opacity-60 max-w-[350px] mt-2 leading-relaxed">由于跨域限制或文件格式问题，预览器无法处理该卷宗。请尝试查验原件。</p></div></div>}
            >
              {numPages ? (
                <div className="relative group/page">
                  <div className="absolute -left-12 top-0 text-[10px] font-black text-gray-300 vertical-text print:hidden select-none opacity-40 group-hover/page:opacity-100 transition-opacity">SECTION {currentPage} / {numPages}</div>
                  <Page pageNumber={currentPage} width={containerRef.current ? Math.min(containerRef.current.clientWidth - 120, 850) : 600} renderTextLayer={false} renderAnnotationLayer={false} className="shadow-2xl border border-border-light bg-white print:shadow-none print:border-none" />
                </div>
              ) : null}
            </Document>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-40 text-text-muted text-center px-12">
            <div className="w-24 h-24 rounded-[2.5rem] bg-primary/5 flex items-center justify-center text-primary mb-2 print:hidden shadow-inner ring-1 ring-primary/10"><span className="material-symbols-outlined text-6xl">link</span></div>
            <p className="text-xl font-black text-text-main tracking-tight">外部托管档案</p>
            <p className="text-sm opacity-60 max-w-sm leading-relaxed print:hidden">该成果托管于外部官方平台，请点击右上角查验链接即可调取电子凭证。</p>
            <div className="hidden print:block text-[10px] break-all max-w-lg mt-6 border-l-4 border-primary p-4 rounded bg-gray-50 italic font-mono text-gray-400">SOURCE: {resolvedUrl}</div>
          </div>
        )}
      </div>
      
      <div className="px-8 py-5 bg-background-light/50 border-t flex items-center justify-between text-[10px] font-black text-text-muted uppercase tracking-widest print:hidden">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">folder_special</span><span>{fileType === 'pdf' ? `${numPages || 0} PAGES` : 'SINGLE ASSET'}</span></div>
           <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
           <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">fingerprint</span><span>{url.startsWith('file://') ? 'LOCAL STORAGE' : 'REMOTE'}</span></div>
        </div>
        <div className="flex items-center gap-1.5 text-primary"><span className="material-symbols-outlined text-[16px] animate-pulse">verified_user</span>DIGITAL INTEGRITY SECURED</div>
      </div>
    </div>
  );
};

const CertificateDetail: React.FC<CertificateDetailProps> = ({ certId, onBack }) => {
  const [cert, setCert] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchCert = async () => {
      setIsLoading(true);
      try {
        const found = await CertificateDatabase.getById(certId);
        setCert(found);
        if (found?.credentialUrl) {
            if (found.credentialUrl.startsWith('file://')) {
                const dataUrl = await FileManager.resolveToDataUrl(found.credentialUrl);
                setResolvedUrl(dataUrl);
            } else {
                setResolvedUrl(found.credentialUrl);
            }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCert();
  }, [certId]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) return (
    <div className="flex h-full items-center justify-center text-text-muted gap-3">
      <span className="material-symbols-outlined animate-spin text-3xl opacity-20">sync</span>
      <span className="font-black tracking-widest uppercase text-xs">调阅档案中...</span>
    </div>
  );
  
  if (!cert) return (
    <div className="text-center py-20 flex flex-col items-center gap-6">
      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center shadow-inner"><span className="material-symbols-outlined text-4xl">folder_off</span></div>
      <div><h3 className="text-2xl font-black text-text-main">档案索引丢失</h3><p className="text-sm text-text-muted mt-2">无法检索到该项荣誉的数字化档案。</p></div>
      <button onClick={onBack} className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-105 transition-all active:scale-95">返回成果名录</button>
    </div>
  );

  const getLevelColor = (level: HonorLevel) => {
    switch (level) {
      case HonorLevel.National: return 'from-amber-500 to-orange-600';
      case HonorLevel.Provincial: return 'from-purple-500 to-indigo-600';
      case HonorLevel.Municipal: return 'from-blue-500 to-cyan-600';
      default: return 'from-slate-500 to-gray-600';
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-20 print:p-0 print:space-y-8">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          aside, header, nav, .print-hidden, button, a[href^="http"] { display: none !important; }
          body, #root { background: white !important; height: auto !important; overflow: visible !important; }
          main { padding: 0 !important; overflow: visible !important; }
          .print-container { border: none !important; box-shadow: none !important; }
          .print-header { border-bottom: 2px solid #eee !important; padding-bottom: 20px !important; margin-bottom: 30px !important; }
          .print-title { color: black !important; font-size: 24pt !important; }
          .print-footer { display: block !important; position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 9pt; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
        }
        .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); }
      `}} />

      <div className="flex items-center gap-2 text-sm text-text-muted print-hidden">
        <button onClick={onBack} className="hover:text-primary transition-colors flex items-center gap-1 font-medium group"><span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span> 荣誉成果</button>
        <span className="text-gray-300">/</span>
        <span className="text-text-main font-bold">数字化档案详情</span>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-border-light shadow-sm overflow-hidden print-container">
        <div className={`h-48 bg-gradient-to-r ${getLevelColor(cert.level)} w-full flex items-center px-12 relative overflow-hidden print:bg-none print:h-auto print:px-0 print:pt-4 print:pb-8 print:border-b-2 print:border-gray-100`}>
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl print:hidden"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl print:hidden"></div>
            <div className="w-28 h-28 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-white border border-white/30 shadow-2xl relative z-10 print:hidden transform -rotate-3 hover:rotate-0 transition-all duration-500"><span className="material-symbols-outlined text-6xl font-light">workspace_premium</span></div>
            <div className="ml-10 text-white relative z-10 print:ml-0 print:text-black">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 rounded-xl bg-white/20 text-[11px] font-black uppercase tracking-widest print:bg-gray-100 print:text-gray-600 border border-white/20">{cert.level}</span>
                  <span className="px-3 py-1 rounded-xl bg-black/10 text-[11px] font-black uppercase tracking-widest print:bg-gray-100 print:text-gray-600 border border-white/10">{cert.category}</span>
                </div>
                <h1 className="text-4xl font-black tracking-tighter print:text-3xl print-title leading-tight">{cert.name}</h1>
                <p className="hidden print:block text-sm text-gray-400 mt-2 font-black tracking-[0.2em]">HELERIX OFFICIAL ARCHIVE</p>
                <p className="text-white/60 text-sm mt-1 font-medium print:hidden">档案编号: {cert.id}</p>
            </div>
        </div>
        
        <div className="px-12 pb-12 print:px-0">
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-end -mt-12 mb-16 gap-8 print:mt-12 print:mb-12">
            <div className="bg-white px-10 py-7 rounded-[2.5rem] shadow-2xl border border-border-light flex flex-wrap gap-14 print:shadow-none print:border-none print:p-0 print:gap-14">
                <div><p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 opacity-40">荣誉级别</p><p className="font-bold text-text-main text-2xl print:text-xl tracking-tight">{cert.level}</p></div>
                <div className="w-px h-12 bg-border-light self-center hidden sm:block print:hidden"></div>
                <div><p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 opacity-40">取得日期</p><p className="font-bold text-text-main text-2xl font-mono print:text-xl tracking-tight">{cert.issueDate}</p></div>
                <div className="w-px h-12 bg-border-light self-center hidden sm:block print:hidden"></div>
                <div><p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 opacity-40">摘要摘要码</p><p className="font-bold text-text-main font-mono text-base pt-1 tracking-tight uppercase bg-background-light px-4 py-1.5 rounded-xl border border-border-light">{cert.id.slice(-8)}</p></div>
            </div>
            <div className="flex gap-4 w-full md:w-auto print-hidden">
               <button onClick={handlePrint} className="flex-1 md:flex-none px-10 py-4.5 border border-border-light rounded-2xl text-sm font-black hover:bg-background-light transition-all active:scale-95 shadow-sm flex items-center justify-center gap-3"><span className="material-symbols-outlined text-[20px]">print</span>打印档案</button>
               {cert.credentialUrl && (
                  <a 
                    href={resolvedUrl || '#'} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex-1 md:flex-none px-12 py-4.5 bg-primary text-white rounded-2xl text-sm font-black hover:bg-violet-700 shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    查看电子凭证 <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                  </a>
               )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 print:block print:space-y-12">
             <div className="lg:col-span-8 space-y-12 print:space-y-10">
                <div className="space-y-6">
                    <h3 className="text-2xl font-black text-text-main flex items-center gap-4 print:text-xl"><span className="w-2.5 h-8 bg-primary rounded-full print:hidden"></span>教研成果数字化影像</h3>
                    <CertificatePreview url={cert.credentialUrl || ''} />
                </div>

                <div className="space-y-6">
                    <h3 className="text-2xl font-black text-text-main flex items-center gap-4 print:text-xl"><span className="w-2.5 h-8 bg-primary rounded-full print:hidden"></span>官方颁发细节</h3>
                    <div className="bg-background-light/30 border border-border-light rounded-[2.5rem] p-12 space-y-12 print:bg-white print:p-0 print:border-none">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 print:grid-cols-1 print:gap-8">
                            <div>
                                <p className="text-[10px] font-black text-text-muted mb-4 uppercase tracking-[0.2em] opacity-40">颁发单位</p>
                                <p className="text-2xl font-bold text-text-main leading-tight print:text-xl">{cert.issuer}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-text-muted mb-4 uppercase tracking-[0.2em] opacity-40">成果类别</p>
                                <p className="text-2xl font-bold text-text-main leading-tight print:text-xl">{cert.category}</p>
                            </div>
                            <div className="print-hidden">
                                <p className="text-[10px] font-black text-text-muted mb-4 uppercase tracking-[0.2em] opacity-40">凭证查验链接</p>
                                {cert.credentialUrl ? (
                                    <a 
                                      href={resolvedUrl || '#'} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="group inline-flex items-center gap-2 text-primary font-bold hover:underline break-all"
                                    >
                                        <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">open_in_new</span>
                                        <span className="text-sm truncate max-w-[180px]">
                                            {cert.credentialUrl.startsWith('file://') ? '内部数字化存档' : cert.credentialUrl}
                                        </span>
                                    </a>
                                ) : (
                                    <p className="text-sm text-text-muted font-medium italic">暂无有效链接</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
             </div>

             <div className="lg:col-span-4 space-y-12 print:space-y-10">
                <div className="space-y-6">
                    <h3 className="text-2xl font-black text-text-main flex items-center gap-4 print:text-xl"><span className="w-2.5 h-8 bg-primary rounded-full print:hidden"></span>档案摘要</h3>
                    <div className="bg-white border border-border-light rounded-[2.5rem] p-10 h-full shadow-inner relative overflow-hidden print:border-none print:p-0">
                        <div className="absolute top-0 right-0 w-32 h-32 text-primary/5 -mr-8 -mt-8 rotate-12 print:hidden"><span className="material-symbols-outlined text-[140px]">history_edu</span></div>
                        <p className="text-base text-text-muted leading-relaxed relative z-10 font-medium italic print:text-black print:not-italic print:text-sm">“该项荣誉已正式录入 Helerix 教研数字化协作系统。作为教研员职业生涯的重要成果，此档案映射了您在 {cert.category} 领域的突出贡献。数据已通过非对称加密存证。”</p>
                        <div className="mt-16 pt-10 border-t border-dashed border-border-light space-y-5 print:mt-10">
                            <div className="flex justify-between items-center"><span className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-40">同步日期</span><span className="text-xs font-bold text-text-main font-mono">{new Date().toLocaleString()}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-40">核验状态</span><span className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-700 rounded-full text-[10px] font-black border border-green-100 print:text-black print:border-none"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse print:hidden"></span>VERIFIED</span></div>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-primary rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group print:hidden border border-white/5">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl transition-transform group-hover:scale-150 duration-1000"></div>
                    <div className="flex flex-col gap-8 relative z-10">
                        <div className="bg-white/10 backdrop-blur-xl w-16 h-16 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner"><span className="material-symbols-outlined text-4xl font-light">qr_code_scanner</span></div>
                        <div><h4 className="font-black text-xl tracking-tighter mb-4 leading-none uppercase tracking-widest text-white">数字化防伪</h4><p className="text-xs text-white/50 leading-relaxed font-medium">此副本仅供教研档案核验使用。通过 Helerix 智能协作平台可随时调取原始数字化卷宗，确保权威存证。</p></div>
                    </div>
                </div>
             </div>
          </div>
        </div>
        <div className="hidden print-footer">HELERIX EDUCATION - OFFICIAL DIGITAL ARCHIVE TRANSCRIPT - PRINTED ON {new Date().toLocaleDateString()}</div>
      </div>
    </div>
  );
};

export default CertificateDetail;
