import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  MessageSquare, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  ChevronLeft,
  Layout,
  FileText,
  Image as ImageIcon,
  GraduationCap,
  Lightbulb,
  Map as MapIcon,
  Play,
  Pause,
  Volume2,
  Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { CURRICULUM } from './constants';
import { Unit, ConversionOutput, StoryScene } from './types';
import { processESLContent, generateSceneImage, generateSceneAudio } from './services/geminiService';

const HighlightedText = ({ scene }: { scene: StoryScene }) => {
  let text = scene.text;
  const sortedHighlights = [...scene.highlights].sort((a, b) => b.text.length - a.text.length);
  
  // This is a simple implementation. For production, a more robust regex-based approach would be better.
  const parts: React.ReactNode[] = [text];

  scene.highlights.forEach((h) => {
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (typeof part === 'string') {
        const index = part.toLowerCase().indexOf(h.text.toLowerCase());
        if (index !== -1) {
          const before = part.substring(0, index);
          const match = part.substring(index, index + h.text.length);
          const after = part.substring(index + h.text.length);
          
          parts.splice(i, 1, 
            before, 
            <span 
              key={`${h.text}-${i}`}
              className={`px-1 rounded cursor-help transition-colors group relative inline-block ${
                h.type === 'grammar' ? 'bg-indigo-100 text-indigo-700 border-b-2 border-indigo-300' : 'bg-amber-100 text-amber-700 border-b-2 border-amber-300'
              }`}
            >
              {match}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 font-sans font-normal normal-case">
                <span className="font-bold block mb-1 uppercase tracking-wider text-[8px] opacity-70">{h.type}</span>
                {h.explanation}
              </span>
            </span>,
            after
          );
          i += 2;
        }
      }
    }
  });

  return <div className="text-xl leading-relaxed text-slate-700 font-serif italic">{parts}</div>;
};

const Storybook = ({ scenes, onUpdateScene }: { scenes: StoryScene[], onUpdateScene: (index: number, updates: Partial<StoryScene>) => void }) => {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAsset, setIsGeneratingAsset] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scene = scenes[currentScene];

  useEffect(() => {
    const loadAssets = async () => {
      if (!scene.imageUrl || !scene.audioBase64) {
        setIsGeneratingAsset(true);
        try {
          const [imageUrl, audioBase64] = await Promise.all([
            !scene.imageUrl ? generateSceneImage(scene.visualPrompt) : Promise.resolve(scene.imageUrl),
            !scene.audioBase64 ? generateSceneAudio(scene.text) : Promise.resolve(scene.audioBase64)
          ]);
          onUpdateScene(currentScene, { imageUrl, audioBase64 });
        } catch (error) {
          console.error("Failed to load assets", error);
        } finally {
          setIsGeneratingAsset(false);
        }
      }
    };
    loadAssets();
  }, [currentScene, scene.visualPrompt, scene.text, scene.imageUrl, scene.audioBase64, onUpdateScene]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  }, [currentScene]);

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[600px]" id="storybook">
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Visual Side */}
        <div className="md:w-1/2 bg-slate-100 relative overflow-hidden group">
          {scene.imageUrl ? (
            <motion.img 
              key={scene.imageUrl}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              src={scene.imageUrl} 
              alt="Scene illustration" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              {isGeneratingAsset ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  >
                    <Sparkles size={48} className="text-emerald-500/40" />
                  </motion.div>
                  <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Generating Scene...</p>
                </>
              ) : (
                <ImageIcon size={64} className="opacity-20" />
              )}
            </div>
          )}
          {scene.imageUrl && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
              <p className="text-white text-xs italic font-mono">{scene.visualPrompt}</p>
            </div>
          )}
        </div>

        {/* Text Side */}
        <div className="md:w-1/2 p-10 flex flex-col justify-center space-y-8 relative">
          <div className="absolute top-6 right-6 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="bg-slate-100 px-2 py-1 rounded">Scene {currentScene + 1} / {scenes.length}</span>
          </div>

          <HighlightedText scene={scene} />

          <div className="flex items-center gap-4 min-h-[48px]">
            {scene.audioBase64 ? (
              <>
                <audio 
                  ref={audioRef} 
                  src={`data:audio/mp3;base64,${scene.audioBase64}`} 
                  onEnded={() => setIsPlaying(false)}
                />
                <button 
                  onClick={toggleAudio}
                  className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                </button>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Listen</span>
                  <span className="text-[10px] text-slate-400">Natural B1 Pronunciation</span>
                </div>
              </>
            ) : isGeneratingAsset ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <Volume2 size={18} className="text-slate-300 animate-pulse" />
                </div>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Preparing Audio...</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="h-20 bg-slate-50 border-t border-slate-100 flex items-center justify-between px-8">
        <button 
          onClick={() => setCurrentScene(prev => Math.max(0, prev - 1))}
          disabled={currentScene === 0}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={20} />
          Previous
        </button>

        <div className="flex gap-2">
          {scenes.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all ${i === currentScene ? 'w-8 bg-emerald-500' : 'w-1.5 bg-slate-200'}`}
            />
          ))}
        </div>

        <button 
          onClick={() => setCurrentScene(prev => Math.min(scenes.length - 1, prev + 1))}
          disabled={currentScene === scenes.length - 1}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [rawInput, setRawInput] = useState('');
  const [format, setFormat] = useState<'Dialogue' | 'Monologue'>('Monologue');
  const [isProcessing, setIsProcessing] = useState(false);
  const [output, setOutput] = useState<ConversionOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!selectedUnit) {
      setError('Por favor, selecciona una unidad del menú lateral.');
      return;
    }
    if (!rawInput.trim()) {
      setError('Por favor, ingresa algún texto o transcripción.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const result = await processESLContent(rawInput, format, selectedUnit);
      setOutput(result);
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al procesar el contenido. Por favor, intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateScene = (index: number, updates: Partial<StoryScene>) => {
    setOutput(prev => {
      if (!prev) return null;
      const newScenes = [...prev.scenes];
      newScenes[index] = { ...newScenes[index], ...updates };
      return { ...prev, scenes: newScenes };
    });
  };

  return (
    <div className="flex h-screen bg-[#f5f5f5] font-sans text-slate-900 overflow-hidden" id="app-container">
      {/* Sidebar - Curriculum Menu */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10" id="sidebar">
        <div className="p-6 border-bottom border-slate-100 bg-slate-50/50" id="sidebar-header">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-600 p-2 rounded-lg text-white">
              <GraduationCap size={24} />
            </div>
            <h1 className="font-bold text-xl tracking-tight">ESL B1 Specialist</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Intermediate Curriculum</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6" id="curriculum-list">
          {['Intermediate 1', 'Intermediate 2'].map((course) => (
            <div key={course} className="space-y-2">
              <h2 className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest">{course}</h2>
              <div className="space-y-1">
                {CURRICULUM.filter(u => u.course === course).map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => setSelectedUnit(unit)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between group ${
                      selectedUnit?.id === unit.id 
                        ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-sm' 
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                    id={`unit-btn-${unit.id}`}
                  >
                    <span className="truncate">Unit {unit.number}: {unit.title}</span>
                    <ChevronRight size={14} className={`transition-transform ${selectedUnit?.id === unit.id ? 'translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative" id="main-content">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-10" id="header">
          <div className="flex items-center gap-4">
            {selectedUnit ? (
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <span>{selectedUnit.course}</span>
                <ChevronRight size={14} />
                <span className="text-slate-900">Unit {selectedUnit.number}: {selectedUnit.title}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-medium text-slate-400 italic">
                <AlertCircle size={14} />
                <span>Please select a unit to begin</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full uppercase">B1 Level</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8" id="scroll-area">
          <div className="max-w-5xl mx-auto space-y-8 pb-20">
            
            {/* Input Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" id="input-section">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-emerald-600" size={20} />
                  <h3 className="font-semibold">Raw Input / Transcript</h3>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {(['Monologue', 'Dialogue'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                        format === f ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6 space-y-4 relative">
                {!selectedUnit && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex items-center justify-center rounded-b-2xl">
                    <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center gap-2 max-w-xs text-center animate-in fade-in zoom-in duration-300">
                      <div className="bg-amber-50 p-3 rounded-full text-amber-500">
                        <Info size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-700">Selection Required</p>
                      <p className="text-xs text-slate-500 leading-relaxed">Select a unit from the curriculum menu on the left to enable input.</p>
                    </div>
                  </div>
                )}
                <textarea
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  disabled={!selectedUnit}
                  placeholder={selectedUnit ? "Ingresa aquí tu texto o transcripción en español o inglés..." : "Selecciona una unidad primero..."}
                  className={`w-full h-32 p-4 rounded-xl border focus:ring-2 outline-none transition-all resize-none text-slate-700 placeholder:text-slate-400 ${
                    !selectedUnit 
                      ? 'bg-slate-50 border-slate-100 cursor-not-allowed' 
                      : 'bg-white border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                  }`}
                  id="raw-input-textarea"
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {selectedUnit && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <BookOpen size={12} />
                        Grammar: {selectedUnit.targetGrammar}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleProcess}
                    disabled={isProcessing || !rawInput.trim()}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${
                      isProcessing || !rawInput.trim()
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                    }`}
                    id="process-btn"
                  >
                    {isProcessing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        >
                          <Sparkles size={18} />
                        </motion.div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Create Storybook
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-700 text-sm font-medium"
                id="error-message"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}

            {/* Output Section */}
            <AnimatePresence mode="wait">
              {output && (
                <motion.div
                  key="output"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12"
                  id="output-container"
                >
                  {/* Storybook Component */}
                  <Storybook scenes={output.scenes} onUpdateScene={handleUpdateScene} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Learning Report */}
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" id="learning-report-section">
                      <div className="p-5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/30">
                        <CheckCircle2 className="text-emerald-600" size={20} />
                        <h3 className="font-semibold">Learning Report</h3>
                      </div>
                      <div className="p-6 space-y-6 flex-1">
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grammar Highlights</h4>
                          <ul className="space-y-2">
                            {output.learningReport.grammarHighlights.map((gh, i) => (
                              <li key={i} className="text-sm flex gap-3 text-slate-600">
                                <span className="text-emerald-500 font-bold">•</span>
                                {gh}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vocabulary Match</h4>
                          <div className="flex flex-wrap gap-2">
                            {output.learningReport.vocabularyMatches.map((vm, i) => (
                              <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-100">
                                {vm}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Mentoring & Gap Analysis */}
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" id="mentoring-section">
                      <div className="p-5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/30">
                        <Lightbulb className="text-amber-500" size={20} />
                        <h3 className="font-semibold">Mentoring & Gap Analysis</h3>
                      </div>
                      <div className="p-6 space-y-6 flex-1">
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-red-400">Missing Topics</h4>
                          <ul className="space-y-2">
                            {output.mentoring.missingTopics.map((mt, i) => (
                              <li key={i} className="text-sm flex gap-3 text-slate-600">
                                <span className="text-red-400 font-bold">•</span>
                                {mt}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-emerald-400">Improvements</h4>
                          <ul className="space-y-2">
                            {output.mentoring.improvements.map((imp, i) => (
                              <li key={i} className="text-sm flex gap-3 text-slate-600">
                                <span className="text-emerald-400 font-bold">•</span>
                                {imp}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Structure Map */}
                  <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" id="structure-map-section">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-2 bg-slate-50/30">
                      <MapIcon className="text-emerald-600" size={20} />
                      <h3 className="font-semibold">Narrative Structure Map</h3>
                    </div>
                    <div className="p-6 overflow-x-auto">
                      <div className="markdown-body">
                        <ReactMarkdown>{output.structureMap}</ReactMarkdown>
                      </div>
                    </div>
                  </section>

                </motion.div>
              )}
            </AnimatePresence>

            {!output && !isProcessing && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4" id="empty-state">
                <div className="bg-slate-100 p-6 rounded-full">
                  <Layout size={48} />
                </div>
                <div className="text-center">
                  <p className="font-medium text-lg">Ready to transform your content</p>
                  <p className="text-sm">Select a unit and provide your raw input to begin.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
