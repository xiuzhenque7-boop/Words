import React, { useState, useEffect, useRef } from "react";
import { Word, DictationItem, DictationSession, AiExplanation } from "../types";
import { 
  Volume2, Check, X, ArrowRight, Play, Award, RotateCcw, 
  HelpCircle, Eye, EyeOff, Sparkles, BookOpen, ChevronRight, AlertCircle, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DictationArenaProps {
  words: Word[];
  selectedListId: string;
  currentBookName: string;
  onUpdateWordStats: (wordId: string, isCorrect: boolean) => void;
}

export default function DictationArena({
  words,
  selectedListId,
  currentBookName,
  onUpdateWordStats
}: DictationArenaProps) {
  // Setup config states
  const [sessionActive, setSessionActive] = useState(false);
  const [testType, setTestType] = useState<"general" | "mistakes">("general");
  const [wordCount, setWordCount] = useState<number>(10);
  
  // Running session states
  const [testPool, setTestPool] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [answers, setAnswers] = useState<DictationItem[]>([]);
  const [showPhoneticHint, setShowPhoneticHint] = useState(true);
  const [showSentenceHint, setShowSentenceHint] = useState(true);
  
  // Session results states
  const [isFinished, setIsFinished] = useState(false);
  const [selectedWordForAi, setSelectedWordForAi] = useState<Word | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiExplanation | null>(null);

  // Auto-play TTS on question transition
  const audioPlayedRef = useRef<string | null>(null);

  // Get candidates based on criteria
  const getCandidates = (type: "general" | "mistakes") => {
    let pool = [...words];
    
    // Filter by book list
    if (selectedListId !== "all") {
      // Find matches in the current pool (already pre-filtered by the parent App logic typically, or we filter here)
      // For precision, the parent component passes the pre-filtered words so "words" is active subset
    }

    if (type === "mistakes") {
      pool = pool.filter(w => w.wrongCount > 0);
    }
    return pool;
  };

  const mistakePoolCount = words.filter(w => w.wrongCount > 0).length;

  // Initialize dictation session
  const startSession = (type: "general" | "mistakes") => {
    const candidates = getCandidates(type);
    if (candidates.length === 0) {
      alert(type === "mistakes" ? "没有找到错词！所有默写全对，太棒了！" : "没有任何词汇，请先添加生词。");
      return;
    }

    // Shuffle and pick
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const limit = type === "mistakes" ? Math.min(candidates.length, 30) : Math.min(candidates.length, wordCount);
    const selected = shuffled.slice(0, limit);

    // If any selected word doesn't have an example sentence, we will fall back or let them generate it
    setTestPool(selected);
    setCurrentIndex(0);
    setInputValue("");
    setAnswers([]);
    setSessionActive(true);
    setIsFinished(false);
    setSelectedWordForAi(null);
    setAiAnalysis(null);
  };

  const currentWord = testPool[currentIndex];

  // Auto pronounce
  useEffect(() => {
    if (sessionActive && currentWord && !isFinished) {
      if (audioPlayedRef.current !== currentWord.id) {
        handleSpeak(currentWord.word);
        audioPlayedRef.current = currentWord.id;
      }
    }
  }, [sessionActive, currentIndex, currentWord, isFinished]);

  // Pronounce helper
  const handleSpeak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    
    // Speak word twice for slow steady capture
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  // Submit single answer
  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord) return;

    const trimmedAnswer = inputValue.trim();
    // Spellcheck: ignore casings and trailing trims
    const isCorrect = trimmedAnswer.toLowerCase() === currentWord.word.toLowerCase();

    // Trigger parent callback to update permanent wrong visual states
    onUpdateWordStats(currentWord.id, isCorrect);

    const matchItem: DictationItem = {
      wordId: currentWord.id,
      word: currentWord.word,
      translation: currentWord.translation,
      userAnswer: trimmedAnswer,
      isCorrect,
      phonetic: currentWord.phonetic
    };

    const nextAnswers = [...answers, matchItem];
    setAnswers(nextAnswers);

    // Advance index
    if (currentIndex + 1 < testPool.length) {
      setInputValue("");
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
    }
  };

  // Skip word
  const handleSkip = () => {
    if (!currentWord) return;
    
    onUpdateWordStats(currentWord.id, false);
    
    const matchItem: DictationItem = {
      wordId: currentWord.id,
      word: currentWord.word,
      translation: currentWord.translation,
      userAnswer: "",
      isCorrect: false,
      phonetic: currentWord.phonetic
    };
    
    const nextAnswers = [...answers, matchItem];
    setAnswers(nextAnswers);

    if (currentIndex + 1 < testPool.length) {
      setInputValue("");
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
    }
  };

  // AI mistake assistance helper fetching from Node backend
  const fetchAiExplanation = async (wordObj: Word, userAnswer: string) => {
    setAiAnalysisLoading(true);
    setSelectedWordForAi(wordObj);
    setAiAnalysis(null);

    try {
      const res = await fetch("/api/word-ai-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: wordObj.word,
          translation: wordObj.translation,
          context: userAnswer ? `写成了 "${userAnswer}"` : "完全不记得拼写"
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "获取错词分析方案失败");
      }
      setAiAnalysis(data.analysis);
    } catch (e: any) {
      console.error(e);
      setAiAnalysis({
        mnemonic: "【拼读联想】您可以试着拆解发音，多写几次拼写来提高手感记忆。",
        mistakeAnalysis: "未能联系上AI导师。请检查是否配置了有效的 Gemimi API Key。",
        tip: "常用短语：" + wordObj.word
      });
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // Hide spelling letters in Example sentence to make context-based filling
  const getObfuscatedSentence = (sentence: string, word: string) => {
    if (!sentence) return "";
    // Regex matching keyword loosely
    const escapedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, "gi");
    
    // Replace whole word with letters count representation like "_____ (8)"
    return sentence.replace(regex, `_ _ _ _ _ (${word.length}字母)`);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-2xl border border-indigo-950/20 shadow-xl overflow-hidden text-white flex flex-col h-full min-h-[500px]">
      
      {/* Session Header */}
      <div className="p-5 border-b border-indigo-800/20 bg-indigo-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-400 animate-pulse" />
          <div>
            <span className="text-xs text-indigo-300 font-bold tracking-wider uppercase block">
              默写竞技场
            </span>
            <span className="text-sm font-semibold text-slate-100">
              {sessionActive ? `正在挑战: ${currentBookName}` : "准备开始全新的默写挑战"}
            </span>
          </div>
        </div>

        {sessionActive && (
          <button
            id="btn-quit-session"
            onClick={() => {
              if (confirm("确定要退出本次默写吗？当前进度不会保存。")) {
                setSessionActive(false);
                setIsFinished(false);
              }
            }}
            className="text-xs font-semibold bg-indigo-800/40 hover:bg-rose-900/40 text-rose-200 px-3 py-1.5 rounded-lg border border-indigo-700/30 transition-colors"
          >
            终止挑战
          </button>
        )}
      </div>

      {/* Screen 1: NOT STARTED CONFIGURATION */}
      {!sessionActive && (
        <div className="flex-1 p-6 flex flex-col justify-between max-w-xl mx-auto w-full my-auto space-y-6">
          <div className="space-y-4 text-center py-6">
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-200 via-sky-100 to-indigo-150 bg-clip-text text-transparent">
              写下声音，记住灵魂
            </h1>
            <p className="text-xs text-indigo-200/70 leading-relaxed">
              请选择您的训练模式。建议拼写时开启扬声器收听。您可以随时通过拍照或手动输入导入新单词。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mode A: ALL / GENERAL */}
            <button
              onClick={() => setTestType("general")}
              className={`p-5 rounded-2xl text-left border-2 transition-all relative group ${
                testType === "general"
                  ? "bg-indigo-900/60 border-indigo-400/80 shadow-indigo-500/10 shadow-lg"
                  : "bg-indigo-950/20 border-indigo-950/30 hover:bg-indigo-900/30"
              }`}
            >
              <span className="absolute right-3 top-3 w-4 h-4 rounded-full flex items-center justify-center text-white bg-indigo-500 text-[10px]">
                {testType === "general" && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
              </span>
              <span className="p-2 bg-indigo-500/20 text-indigo-200 rounded-lg inline-block text-xs font-bold mb-3">
                模式一
              </span>
              <h3 className="font-semibold text-sm text-slate-100">经典全面契机</h3>
              <p className="text-[11px] text-indigo-200/65 mt-1">
                从选定的单词记事本里面，随机抽取指定数量的单词进行听音释义默写。
              </p>
            </button>

            {/* Mode B: WRONG ONLY (错词复习模式) */}
            <button
              onClick={() => {
                if (mistakePoolCount === 0) {
                  alert("🎉 太牛了！您目前还没有任何错词记录。进行一次普通默写测验，凡是写错的单词都会收集到这里分类歼灭！");
                  return;
                }
                setTestType("mistakes");
              }}
              className={`p-5 rounded-2xl text-left border-2 transition-all relative group ${
                mistakePoolCount === 0 ? "opacity-55 cursor-not-allowed" : ""
              } ${
                testType === "mistakes"
                  ? "bg-rose-900/30 border-rose-500/60 shadow-rose-500/10 shadow-lg"
                  : "bg-indigo-950/20 border-indigo-950/30 hover:bg-indigo-900/30"
              }`}
            >
              {testType === "mistakes" && (
                <span className="absolute right-3 top-3 w-4 h-4 rounded-full flex items-center justify-center text-white bg-rose-500 text-[10px]">
                  <Check className="w-2.5 h-2.5 stroke-[3px]" />
                </span>
              )}
              <span className="p-2 bg-rose-500/20 text-rose-300 rounded-lg inline-block text-xs font-bold mb-3">
                模式二
              </span>
              <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                <span>错词歼灭复习</span>
                <span className="bg-rose-500 text-white font-mono text-[9px] px-1.5 py-0.2 rounded-full animate-bounce">
                  {mistakePoolCount}
                </span>
              </h3>
              <p className="text-[11px] text-indigo-200/65 mt-1">
                【专门错词复习模式】针对您之前拼错或忘记的单词，进行反复错词听写巩固，拿下雷区。
              </p>
            </button>
          </div>

          {/* Config options based on Mode selection */}
          {testType === "general" && (
            <div className="bg-indigo-950/40 border border-indigo-900/30 p-4 rounded-xl space-y-3">
              <span className="text-xs text-indigo-300 font-bold block">
                选择默写题量
              </span>
              <div className="flex gap-2.5">
                {[5, 10, 15, 20, 25].map(cnt => (
                  <button
                    key={cnt}
                    onClick={() => setWordCount(cnt)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                      wordCount === cnt
                        ? "bg-indigo-500 text-white shadow"
                        : "bg-indigo-900/30 hover:bg-indigo-800/40 text-indigo-200 border border-indigo-800/20"
                    }`}
                  >
                    {cnt} 题
                  </button>
                ))}
              </div>
            </div>
          )}

          {testType === "mistakes" && (
            <div className="bg-rose-950/20 border border-rose-900/20 p-4 rounded-xl text-xs text-rose-200/70 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                错词特训将优先带您复盘拼写失误超过 1 次的生词，共匹配 <strong>{mistakePoolCount}</strong> 个需攻克死角。全部答对即可洗空错词。
              </span>
            </div>
          )}

          {/* Start CTA */}
          <div className="pt-3">
            <button
              id="btn-trigger-start"
              onClick={() => startSession(testType)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all focus:ring-2 focus:ring-indigo-300"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>开始智能默写测验</span>
            </button>
          </div>
        </div>
      )}

      {/* Screen 2: ACTIVE SESSION PLAYING */}
      {sessionActive && !isFinished && currentWord && (
        <div className="flex-1 p-6 flex flex-col justify-between max-w-xl mx-auto w-full">
          {/* Top progress bar */}
          <div className="space-y-1.5 w-full">
            <div className="flex justify-between items-center text-xs text-indigo-300">
              <span className="font-semibold uppercase tracking-wide">
                当前第 {currentIndex + 1} / {testPool.length} 词
              </span>
              <span className="font-mono bg-indigo-900/60 px-2 py-0.5 rounded text-[10px]">
                进度 {Math.round(((currentIndex) / testPool.length) * 100)}%
              </span>
            </div>
            
            <div className="w-full bg-indigo-950 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-sky-400 h-full transition-all duration-300" 
                style={{ width: `${((currentIndex) / testPool.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Core Word audio cue block */}
          <div className="py-8 space-y-6 flex flex-col items-center">
            {/* Play Sound Big CTA */}
            <button
              type="button"
              onClick={() => handleSpeak(currentWord.word)}
              className="p-8 bg-indigo-800/40 hover:bg-indigo-700/50 border border-indigo-700/30 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 text-indigo-200 hover:text-white group relative"
              title="播放单词发音"
            >
              <Volume2 className="w-12 h-12 stroke-[1.5]" />
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] py-0.5 px-2 rounded-full font-bold shadow whitespace-nowrap">
                听音发声
              </span>
            </button>

            {/* Translation details */}
            <div className="text-center space-y-2 max-w-md">
              <span className="text-[10px] text-indigo-300 tracking-wider font-bold block uppercase">
                拼写释意释义
              </span>
              <p className="text-lg md:text-xl font-bold bg-indigo-900/20 border border-indigo-850 p-3 rounded-2xl block text-white select-none">
                {currentWord.translation}
              </p>
            </div>

            {/* Optional Help Layer (Phonetic & Example) */}
            <div className="w-full space-y-3">
              {/* IPA Toggle */}
              {currentWord.phonetic && (
                <div className="bg-indigo-950/40 border border-indigo-900/20 p-2.5 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-indigo-300">英美音标提示：</span>
                  <div className="flex items-center gap-2">
                    {showPhoneticHint ? (
                      <span className="font-mono font-bold text-sky-300 tracking-wide text-sm bg-indigo-900/60 px-2.5 py-0.5 rounded">
                        {currentWord.phonetic}
                      </span>
                    ) : (
                      <span className="text-indigo-400/50 italic">已隐藏</span>
                    )}
                    <button
                      onClick={() => setShowPhoneticHint(!showPhoneticHint)}
                      className="text-indigo-300 hover:text-white p-1"
                    >
                      {showPhoneticHint ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Word sentence generate block (User asked: "每个单词生成一句话") */}
              {currentWord.example && (
                <div className="bg-indigo-950/40 border border-indigo-900/20 p-3 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-300">情景填空联想：</span>
                    <button
                      onClick={() => setShowSentenceHint(!showSentenceHint)}
                      className="text-indigo-300 hover:text-white p-1"
                    >
                      {showSentenceHint ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {showSentenceHint ? (
                    <div className="space-y-1 border-t border-indigo-900/20 pt-1.5">
                      <p className="text-indigo-50 font-medium tracking-wide leading-relaxed italic">
                        {getObfuscatedSentence(currentWord.example, currentWord.word)}
                      </p>
                      <p className="text-xs text-indigo-300/80">
                        意: {currentWord.exampleTranslation || "（暂无例句翻译）"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-indigo-400/50 italic">情景句已收起</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Interactive Input form */}
          <form onSubmit={handleSubmitAnswer} className="space-y-3">
            <div>
              <input
                id="spell-capture-input"
                type="text"
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="请拼写英文单词并按回车提交..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.replace(/[^a-zA-Z\s-]/g, ""))}
                className="w-full text-center text-lg tracking-wider font-bold bg-indigo-950 border-2 border-indigo-700/50 focus:border-sky-400 rounded-xl py-3 px-4 focus:outline-none transition-colors placeholder:text-indigo-400/40"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                className="flex-1 bg-indigo-900/40 hover:bg-slate-800 text-indigo-200 text-xs font-semibold py-2 rounded-xl transition-colors border border-indigo-800/20"
              >
                我不记得了 (跳过)
              </button>
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:bg-indigo-950 disabled:text-indigo-600 disabled:cursor-not-allowed text-indigo-950 text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1"
              >
                <span>提交本词</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Screen 3: SESSION RESULTS / DETAILED BREAKDOWN PAGE */}
      {isFinished && (
        <div className="flex-1 p-5 overflow-y-auto block space-y-6">
          
          {/* Dashboard Summary score */}
          <div className="bg-indigo-950/60 rounded-2xl border border-indigo-800/30 p-6 text-center space-y-4 max-w-sm mx-auto">
            <span className="inline-flex p-4 bg-yellow-500/10 text-yellow-500 rounded-full">
              <Award className="w-10 h-10" />
            </span>
            <div>
              <h2 className="text-lg font-bold">默写测验已完成！</h2>
              <p className="text-xs text-indigo-300 mt-0.5">
                您可以在此核对结果，针对写错的词随时点击获取 AI 记忆辅助。
              </p>
            </div>

            {/* Scores statistics */}
            <div className="grid grid-cols-2 gap-2 text-center pt-2">
              <div className="p-2.5 bg-indigo-900/30 rounded-xl border border-indigo-800/20">
                <span className="text-[10px] text-indigo-300 block">正确率</span>
                <strong className="text-xl font-mono text-sky-400">
                  {Math.round((answers.filter(a => a.isCorrect).length / answers.length) * 100)}%
                </strong>
              </div>

              <div className="p-2.5 bg-indigo-900/30 rounded-xl border border-indigo-800/20">
                <span className="text-[10px] text-indigo-300 block font-bold">战绩明细</span>
                <strong className="text-xs font-semibold">
                  对 <span className="text-green-400">{answers.filter(a => a.isCorrect).length}</span> / 错 <span className="text-rose-400">{answers.filter(a => !a.isCorrect).length}</span>
                </strong>
              </div>
            </div>

            <button
              onClick={() => {
                setSessionActive(false);
                setIsFinished(false);
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition-colors shrink-0"
            >
              返回大厅
            </button>
          </div>

          {/* Section: Word-by-word Answer details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <span>📚 答题明细与词汇精校</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {answers.map((ans, idx) => {
                const associatedWord = words.find(w => w.id === ans.wordId);
                
                return (
                  <div 
                    key={ans.wordId} 
                    className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                      ans.isCorrect
                        ? "bg-emerald-950/20 border-emerald-500/30"
                        : "bg-rose-950/20 border-rose-500/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {/* Word details */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-indigo-300 font-bold">No.{idx + 1}</span>
                          <span className="font-semibold text-slate-100">{ans.word}</span>
                          <button
                            onClick={() => handleSpeak(ans.word)}
                            className="bg-indigo-900/50 p-1 rounded-md text-indigo-300 hover:text-white"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        </div>
                        {ans.phonetic && (
                          <span className="text-[10px] text-indigo-300/60 font-mono mt-0.5 block">{ans.phonetic}</span>
                        )}
                        <p className="text-xs text-slate-300 font-medium mt-1">释意：{ans.translation}</p>
                      </div>

                      {/* Score signifier badge */}
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        ans.isCorrect ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                      }`}>
                        {ans.isCorrect ? "正确" : "写错"}
                      </span>
                    </div>

                    {/* Answer comparison */}
                    <div className="mt-3 pt-2 border-t border-indigo-900/20 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-indigo-400 block">标准拼写：</span>
                        <strong className="text-slate-100 font-mono tracking-wide">{ans.word}</strong>
                      </div>
                      <div>
                        <span className="text-indigo-400 block">您的拼写：</span>
                        <strong className={`font-mono tracking-wide ${ans.isCorrect ? "text-emerald-400" : "text-rose-400 font-semibold"}`}>
                          {ans.userAnswer || "（跳过未写）"}
                        </strong>
                      </div>
                    </div>

                    {/* AI explanation trigger */}
                    {!ans.isCorrect && associatedWord && (
                      <div className="mt-3.5">
                        <button
                          onClick={() => fetchAiExplanation(associatedWord, ans.userAnswer)}
                          className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-[10px] p-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                          <span>AI 错词助记卡</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Advisor Modal embedded or sliding */}
          {selectedWordForAi && (
            <div className="bg-indigo-900/40 border border-indigo-800/60 p-5 rounded-2xl space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-yellow-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  错词星人克星分析：{selectedWordForAi.word}
                </span>
                <button
                  onClick={() => setSelectedWordForAi(null)}
                  className="text-xs text-indigo-300 hover:text-white"
                >
                  收起卡片 X
                </button>
              </div>

              {aiAnalysisLoading && (
                <div className="p-6 text-center space-y-2">
                  <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-xs text-indigo-200">正在调用 Gemini 心理与拼写认知模型，为您私人订制谐音及易错联想图解...</p>
                </div>
              )}

              {aiAnalysis && (
                <div className="text-xs space-y-3.5 pt-2 border-t border-indigo-800/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-indigo-950/60 border border-indigo-900/30 rounded-xl">
                      <strong className="text-sky-300 block mb-1">💡 谐音/趣味联想拆词记法</strong>
                      <p className="text-slate-100 font-medium leading-relaxed">{aiAnalysis.mnemonic}</p>
                    </div>

                    <div className="p-3 bg-indigo-950/60 border border-indigo-900/30 rounded-xl">
                      <strong className="text-rose-400 block mb-1">⚠️ 易写错扣分项</strong>
                      <p className="text-slate-100 font-medium leading-relaxed">{aiAnalysis.mistakeAnalysis}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                    <strong className="text-amber-400 block mb-0.5">🌿 百搭小搭配或词根</strong>
                    <p className="text-slate-100 font-semibold">{aiAnalysis.tip}</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
