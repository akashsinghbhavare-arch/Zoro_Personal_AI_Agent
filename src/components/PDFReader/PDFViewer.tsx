import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2,
  Minimize2, RotateCw, Loader2
} from 'lucide-react';
import { ExtractedPage } from '../../types/pdf';

interface PDFViewerProps {
  pdfFileOrBuffer: ArrayBuffer | File | string | null;
  pages: ExtractedPage[];
  currentPage: number;
  onPageChange: (newPage: number) => void;
}

export const PDFViewer = ({
  pdfFileOrBuffer,
  pages,
  currentPage,
  onPageChange,
}: PDFViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);
  const [inputPage, setInputPage] = useState<string>(String(currentPage));
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const totalPages = pages.length || pdfDoc?.numPages || 1;

  // Load PDF Document
  useEffect(() => {
    if (!pdfFileOrBuffer) return;

    let isMounted = true;
    const loadDoc = async () => {
      try {
        setIsLoadingPage(true);
        let loadingTask: any;

        if (typeof pdfFileOrBuffer === 'string') {
          loadingTask = pdfjsLib.getDocument(pdfFileOrBuffer);
        } else if (pdfFileOrBuffer instanceof File) {
          const buf = await pdfFileOrBuffer.arrayBuffer();
          loadingTask = pdfjsLib.getDocument({ data: buf });
        } else {
          loadingTask = pdfjsLib.getDocument({ data: pdfFileOrBuffer });
        }

        const doc = await loadingTask.promise;
        if (isMounted) {
          setPdfDoc(doc);
        }
      } catch (err) {
        console.error('[PDFViewer] Error loading PDF doc:', err);
      } finally {
        if (isMounted) setIsLoadingPage(false);
      }
    };

    loadDoc();
    return () => {
      isMounted = false;
    };
  }, [pdfFileOrBuffer]);

  // Sync input page display
  useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

  // Render Current Page on Canvas
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      setIsLoadingPage(true);
      const pageNum = Math.min(Math.max(1, currentPage), totalPages);
      const page = await pdfDoc.getPage(pageNum);

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale, rotation });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error(`[PDFViewer] Error rendering page ${currentPage}:`, err);
    } finally {
      setIsLoadingPage(false);
    }
  }, [pdfDoc, currentPage, scale, rotation, totalPages]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Controls
  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.6));
  const handleResetZoom = () => setScale(1.2);
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(inputPage, 10);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      onPageChange(num);
    } else {
      setInputPage(String(currentPage));
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-slate-950 border-r border-slate-800/80 overflow-hidden"
    >
      {/* Viewer Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-300 flex-shrink-0 select-none">
        {/* Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-300"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
            <input
              type="text"
              value={inputPage}
              onChange={e => setInputPage(e.target.value)}
              className="w-10 px-1.5 py-1 bg-slate-800 border border-slate-700 rounded text-center font-mono text-xs text-white focus:outline-none focus:border-sky-400"
            />
            <span className="text-slate-500 font-mono">/ {totalPages}</span>
          </form>

          <button
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-300"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={handleZoomOut}
            className="p-1 rounded-lg hover:bg-slate-800 transition-colors text-slate-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="px-2 py-0.5 font-mono text-[11px] text-sky-400 hover:bg-slate-800 rounded transition-colors"
            title="Reset Zoom"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1 rounded-lg hover:bg-slate-800 transition-colors text-slate-300"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleRotate}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
            title="Rotate Page"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Canvas View Area */}
      <div className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-950 relative scrollbar-thin">
        {isLoadingPage && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-sky-400 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              Rendering page {currentPage}…
            </div>
          </div>
        )}

        <div className="relative shadow-2xl rounded-sm border border-slate-800 bg-white">
          <canvas ref={canvasRef} className="block" />
        </div>
      </div>
    </div>
  );
};
