import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, AlertCircle, Loader2, Sparkles } from 'lucide-react';

interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  processingProgress: number;
  processingStatus: string;
  error?: string | null;
  scannedWarning?: boolean;
}

const MAX_FILE_SIZE_MB = 50;

export const PDFUploader = ({
  onFileSelect,
  isProcessing,
  processingProgress,
  processingStatus,
  error,
  scannedWarning,
}: PDFUploaderProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcess = (file: File) => {
    setValidationError(null);

    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setValidationError('This file is not a valid PDF. Please select a .pdf file.');
      return;
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setValidationError(`The PDF is too large (${sizeMB.toFixed(1)} MB). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcess(e.target.files[0]);
    }
  };

  const activeError = validationError || error;

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Title Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-3"
          style={{
            background: 'rgba(0,191,255,0.08)',
            border: '1px solid rgba(0,191,255,0.2)',
            color: '#00BFFF',
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Document Reader
        </div>
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
          Upload & Ask Anything About Your PDF
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Extract text, generate instant summaries, find key points, and ask grounded questions with exact page references.
        </p>
      </motion.div>

      {/* Drag and Drop Zone */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
          isDragOver ? 'border-sky-400 bg-sky-500/10 scale-[1.01]' : 'border-slate-700/60 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-900/90'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="py-6 space-y-4">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-sky-400 animate-spin" />
            </div>
            <div>
              <div className="text-base font-semibold text-white mb-1">
                {processingStatus || 'Processing PDF…'}
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Extracting text pages & building AI assistant index…
              </p>
              {/* Progress Bar */}
              <div className="w-full max-w-xs mx-auto h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                <motion.div
                  className="h-full bg-gradient-to-r from-sky-400 to-blue-600 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${processingProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="text-xs font-mono text-sky-400 mt-2">
                {processingProgress}%
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-blue-600/20 border border-sky-400/30 flex items-center justify-center mx-auto text-sky-400">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Drag & drop your PDF here
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                or <span className="text-sky-400 font-medium underline underline-offset-2">browse files</span> from your computer
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] text-slate-400">
              <FileText className="w-3 h-3 text-slate-400" />
              Supported format: PDF (up to {MAX_FILE_SIZE_MB}MB)
            </div>
          </div>
        )}
      </motion.div>

      {/* Scanned Warning */}
      {scannedWarning && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs"
        >
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-200">Scanned PDF Detected</div>
            <p className="mt-0.5 text-amber-300/80">
              This document appears to be scanned or contains image pages with limited selectable text. OCR may be required for full text extractions.
            </p>
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      {activeError && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-rose-200">Upload Failed</div>
            <p className="mt-0.5 text-rose-300/90">{activeError}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};
