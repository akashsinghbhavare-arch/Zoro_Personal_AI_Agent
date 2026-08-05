import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, Loader2, Palette, Ratio, Wand2, ShieldCheck,
  ChevronDown, ChevronUp, Trash2, Download, Copy, Check
} from 'lucide-react';
import { generateImageDetailed, ImageStyle, AspectRatio, QualityMode, GeneratedImageResponse } from '../utils/imageGen';
import { enhancePromptWithAI } from '../utils/promptEnhancer';

interface ImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, imageUrl: string) => void;
}

const STYLES: { id: ImageStyle; label: string; icon: string }[] = [
  { id: 'auto', label: 'Auto', icon: '✨' },
  { id: 'photorealistic', label: 'Realistic', icon: '📸' },
  { id: 'cinematic', label: 'Cinematic', icon: '🎬' },
  { id: 'anime', label: 'Anime', icon: '🎏' },
  { id: '3d', label: '3D Render', icon: '🧊' },
  { id: 'illustration', label: 'Illustration', icon: '🎨' },
  { id: 'digital-art', label: 'Digital Art', icon: '🖼️' },
  { id: 'minimalist', label: 'Minimalist', icon: '📐' },
];

const ASPECT_RATIOS: { id: AspectRatio; label: string; desc: string; icon: string }[] = [
  { id: '1:1', label: '1:1', desc: 'Square', icon: '⏹️' },
  { id: '16:9', label: '16:9', desc: 'Landscape', icon: '🖼️' },
  { id: '9:16', label: '9:16', desc: 'Portrait', icon: '📱' },
  { id: '4:3', label: '4:3', desc: 'Standard', icon: '🖥️' },
  { id: '3:4', label: '3:4', desc: 'Vertical', icon: '📄' },
];

const LOADING_STEPS = [
  'Creating composition & lighting...',
  'Applying artistic style textures...',
  'Rendering realistic details...',
  'Finalizing image output...',
];

export const ImageGenerationModal = ({ isOpen, onClose, onGenerate }: ImageGenerationModalProps) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>('auto');
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>('1:1');
  const [qualityMode, setQualityMode] = useState<QualityMode>('standard');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // States
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Result state
  const [resultImage, setResultImage] = useState<GeneratedImageResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Cycle loading steps during generation
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      setLoadingStepIdx(0);
      interval = setInterval(() => {
        setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleEnhancePrompt = async () => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isEnhancing) return;

    setIsEnhancing(true);
    setErrorMsg('');
    try {
      const enhanced = await enhancePromptWithAI(cleanPrompt, selectedStyle);
      setPrompt(enhanced);
    } catch (err) {
      console.error('[ImageModal] Enhancement error:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleClearPrompt = () => {
    setPrompt('');
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isGenerating) return;

    setIsGenerating(true);
    setErrorMsg('');
    setResultImage(null);

    try {
      const res = await generateImageDetailed(cleanPrompt, {
        style: selectedStyle,
        aspectRatio: selectedRatio,
        quality: qualityMode,
        negativePrompt,
      });

      setResultImage(res);
      onGenerate(cleanPrompt, res.url);
    } catch (err: any) {
      console.error('Image Generation Error:', err);
      setErrorMsg(err?.message || 'Unable to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage?.url) return;
    const a = document.createElement('a');
    a.href = resultImage.url;
    a.download = `nova-ai-image-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-3xl shadow-2xl max-w-xl w-full border border-slate-800 overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">AI Image Studio</h2>
                  <p className="text-[11px] text-slate-400">Node.js API Engine & Prompt Enhancer</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin">
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Prompt Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Describe the image you want to create
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-mono">
                        {prompt.length}/1000
                      </span>
                      {prompt && (
                        <button
                          type="button"
                          onClick={handleClearPrompt}
                          className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      disabled={isGenerating || isEnhancing}
                      maxLength={1000}
                      className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-none disabled:opacity-50 text-sm"
                      placeholder="e.g. A realistic golden retriever sitting calmly in a park, natural sunlight..."
                      rows={3}
                      autoFocus
                    />
                  </div>

                  {/* AI Prompt Enhancer Button */}
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={handleEnhancePrompt}
                      disabled={!prompt.trim() || isEnhancing || isGenerating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition-all text-xs font-semibold disabled:opacity-40 shadow-sm"
                    >
                      {isEnhancing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>{isEnhancing ? 'Enhancing prompt...' : '✨ Enhance Prompt with AI'}</span>
                    </button>
                  </div>
                </div>

                {/* Aspect Ratio Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Ratio className="w-3.5 h-3.5 text-cyan-400" /> Aspect Ratio
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {ASPECT_RATIOS.map(r => {
                      const isSelected = selectedRatio === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedRatio(r.id)}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs transition-all border ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold shadow-md shadow-cyan-500/10'
                              : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-sm mb-0.5">{r.icon}</span>
                          <span className="font-mono text-[11px]">{r.label}</span>
                          <span className="text-[9px] text-slate-500">{r.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Style Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-cyan-400" /> Artistic Style
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map(s => {
                      const isSelected = selectedStyle === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedStyle(s.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                            isSelected
                              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10'
                              : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <span>{s.icon}</span>
                          <span>{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Expandable Advanced Options */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center justify-between w-full text-xs font-medium text-slate-400 hover:text-white py-1.5 transition-colors"
                  >
                    <span>Advanced Options (Quality & Negative Prompt)</span>
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 pt-2 overflow-hidden"
                      >
                        {/* Quality */}
                        <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                          <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Render Quality:
                          </span>
                          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                            <button
                              type="button"
                              onClick={() => setQualityMode('standard')}
                              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                                qualityMode === 'standard' ? 'bg-cyan-500 text-white' : 'text-slate-400'
                              }`}
                            >
                              Standard
                            </button>
                            <button
                              type="button"
                              onClick={() => setQualityMode('hd')}
                              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                                qualityMode === 'hd' ? 'bg-cyan-500 text-white' : 'text-slate-400'
                              }`}
                            >
                              HD Ultra
                            </button>
                          </div>
                        </div>

                        {/* Negative Prompt */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Negative Prompt (Elements to avoid)
                          </label>
                          <input
                            type="text"
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            placeholder="e.g. blurry, distorted hands, extra limbs, watermark"
                            className="w-full px-3.5 py-2 bg-slate-800/60 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {errorMsg && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                    {errorMsg}
                  </p>
                )}

                {/* Submit Action */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isGenerating}
                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isGenerating}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white rounded-xl transition-all font-medium text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Image</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Animated Multi-Step Loading State */}
              {isGenerating && (
                <div className="p-6 bg-slate-950/80 rounded-2xl border border-cyan-500/30 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                      className="absolute inset-0 rounded-full border-2 border-cyan-500 border-t-transparent"
                    />
                    <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Generating your image</h3>
                    <p className="text-xs text-cyan-300 font-mono mt-1">
                      {LOADING_STEPS[loadingStepIdx]}
                    </p>
                  </div>
                </div>
              )}

              {/* Generated Image Result Preview */}
              {resultImage && !isGenerating && (
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 group">
                    <img
                      src={resultImage.url}
                      alt={resultImage.prompt}
                      className="w-full max-h-72 object-contain mx-auto"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-2">
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" /> Download
                      </button>
                      <button
                        onClick={handleCopyPrompt}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        {copied ? 'Copied' : 'Copy Prompt'}
                      </button>
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono uppercase">
                      {resultImage.aspectRatio} • {resultImage.style}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
