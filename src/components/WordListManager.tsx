import React, { useState, useRef } from "react";
import { Word, WordList } from "../types";
import { 
  Camera, Upload, Plus, Trash2, Volume2, Sparkles, BookOpen, 
  Check, X, AlertCircle, Edit, Search, PlusCircle, CheckSquare, 
  MinusSquare, ArrowRight, RefreshCw, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WordListManagerProps {
  words: Word[];
  lists: WordList[];
  selectedListId: string;
  setSelectedListId: (id: string) => void;
  onAddWords: (newWords: Omit<Word, "id" | "createdAt" | "wrongCount" | "correctCount">[]) => void;
  onDeleteWord: (id: string) => void;
  onCreateList: (name: string, description: string, wordIds: string[]) => void;
  currentBook: WordList | undefined;
}

export default function WordListManager({
  words,
  lists,
  selectedListId,
  setSelectedListId,
  onAddWords,
  onDeleteWord,
  onCreateList,
  currentBook
}: WordListManagerProps) {
  // Tabs for Manager: "words" (Word List), "add-manual" (Manual add), "add-camera" (Camera/Photo OCR)
  const [activeTab, setActiveTab] = useState<"list" | "add-manual" | "add-photo">("list");
  const [searchTerm, setSearchTerm] = useState("");
  
  // States for manual adding
  const [manualWord, setManualWord] = useState("");
  const [manualPhonetic, setManualPhonetic] = useState("");
  const [manualTranslation, setManualTranslation] = useState("");
  const [manualExample, setManualExample] = useState("");
  const [manualExampleTrans, setManualExampleTrans] = useState("");
  const [manualError, setManualError] = useState("");
  const [autoGenerating, setAutoGenerating] = useState(false);

  const handleAutoFill = async () => {
    if (!manualWord.trim()) {
      setManualError("请先输入英文单词，再点击AI补全");
      return;
    }
    setAutoGenerating(true);
    setManualError("");
    try {
      const res = await fetch("/api/generate-word-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: manualWord.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "AI解析词汇失败，请检查网络");
      }
      const { phonetic, translation, example, exampleTranslation } = data.detail;
      setManualPhonetic(phonetic || "");
      setManualTranslation(translation || "");
      setManualExample(example || "");
      setManualExampleTrans(exampleTranslation || "");
    } catch (err: any) {
      setManualError(err.message || "智能解析失败，请点击重试或手动录入");
    } finally {
      setAutoGenerating(false);
    }
  };

  const handleLightningImport = async () => {
    if (!manualWord.trim()) {
      setManualError("请先输入英文单词，再点击闪电导入");
      return;
    }
    setAutoGenerating(true);
    setManualError("");
    try {
      const res = await fetch("/api/generate-word-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: manualWord.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "闪电导入解析失败");
      }
      const { word, phonetic, translation, example, exampleTranslation } = data.detail;
      onAddWords([{
        word: word?.trim() || manualWord.trim(),
        phonetic: phonetic?.trim() || undefined,
        translation: translation?.trim() || "未知释义",
        example: example?.trim() || undefined,
        exampleTranslation: exampleTranslation?.trim() || undefined,
        source: "闪电导入"
      }]);
      // Reset
      setManualWord("");
      setManualPhonetic("");
      setManualTranslation("");
      setManualExample("");
      setManualExampleTrans("");
      setActiveTab("list");
    } catch (err: any) {
      setManualError(err.message || "闪电导入失败，请稍后重试");
    } finally {
      setAutoGenerating(false);
    }
  };

  // States for Camera & Upload OCR
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [ocrResultWords, setOcrResultWords] = useState<any[]>([]);
  const [showOcrReview, setShowOcrReview] = useState(false);
  const [selectedOcrIds, setSelectedOcrIds] = useState<number[]>([]);
  const [ocrImagePreview, setOcrImagePreview] = useState<string | null>(null);

  // Live Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create new list states
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");
  const [deletingWordId, setDeletingWordId] = useState<string | null>(null);

  // Filter words belonging to current selected book
  const currentBooksWords = words.filter(w => {
    if (selectedListId === "all") return true;
    return currentBook?.wordIds.includes(w.id);
  });

  const filteredWords = currentBooksWords.filter(w => 
    w.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.translation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pronounce helper
  const handlePronounce = (text: string) => {
    if (!("speechSynthesis" in window)) {
      console.warn("Your browser does not support Speech Synthesis API.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85; // slightly slower for dictation/clear spelling
    window.speechSynthesis.speak(utterance);
  };

  // Manual Word submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualWord.trim() || !manualTranslation.trim()) {
      setManualError("单词和中文翻译为必填项！");
      return;
    }

    onAddWords([{
      word: manualWord.trim(),
      phonetic: manualPhonetic.trim() || undefined,
      translation: manualTranslation.trim(),
      example: manualExample.trim() || undefined,
      exampleTranslation: manualExampleTrans.trim() || undefined,
      source: "手动录入"
    }]);

    // Reset Form
    setManualWord("");
    setManualPhonetic("");
    setManualTranslation("");
    setManualExample("");
    setManualExampleTrans("");
    setManualError("");
    setActiveTab("list");
  };

  // File selection triggering OCR
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      setOcrImagePreview(base64Data);
      await sendImageToOcr(base64Data);
      // Clear input value to allow selecting same file again
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  // Turn on Cam
  const startCamera = async () => {
    try {
      setOcrError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Video play failed:", e));
        }
      }, 100);
    } catch (err: any) {
      console.error(err);
      setOcrError("无法打开摄像头。请使用文件上传模式，或确保摄像头权限正常。");
    }
  };

  // Turn off Cam
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Capture Photo
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setOcrImagePreview(dataUrl);
      stopCamera();
      sendImageToOcr(dataUrl);
    }
  };

  // Send encoded image to Gemini-OCR backend
  const sendImageToOcr = async (base64Image: string) => {
    setOcrLoading(true);
    setOcrError("");
    try {
      const res = await fetch("/api/ocr-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "OCR解析失败，请确保上传的高质量且包含可读词眼图片");
      }

      if (data.words && data.words.length > 0) {
        // Tag words with simple key-id for React selection check
        const parsedWords = data.words.map((item: any, idx: number) => ({
          ...item,
          tempId: idx
        }));
        setOcrResultWords(parsedWords);
        setSelectedOcrIds(parsedWords.map((w: any) => w.tempId));
        setShowOcrReview(true);
      } else {
        setOcrError("Gemini没有在这张复杂的图片中解读出显著的英文单词。请重新上传特写单词表或手写生词卡的照片。");
      }
    } catch (err: any) {
      console.error(err);
      setOcrError(err.message || "请求服务器处理OCR时出错。请检查秘钥或网络配置。");
    } finally {
      setOcrLoading(false);
    }
  };

  // Change individual OCR word properties before adding
  const toggleSelectOcrWord = (tempId: number) => {
    if (selectedOcrIds.includes(tempId)) {
      setSelectedOcrIds(selectedOcrIds.filter(id => id !== tempId));
    } else {
      setSelectedOcrIds([...selectedOcrIds, tempId]);
    }
  };

  const handleEditOcrField = (tempId: number, field: string, val: string) => {
    setOcrResultWords(prev => prev.map(w => {
      if (w.tempId === tempId) {
        return { ...w, [field]: val };
      }
      return w;
    }));
  };

  const handleConfirmOcrImport = () => {
    const toImport = ocrResultWords
      .filter(w => selectedOcrIds.includes(w.tempId))
      .map(w => ({
        word: w.word.trim(),
        phonetic: w.phonetic?.trim() || undefined,
        translation: w.translation.trim(),
        example: w.example?.trim() || undefined,
        exampleTranslation: w.exampleTranslation?.trim() || undefined,
        source: "照片识词"
      }));

    if (toImport.length > 0) {
      onAddWords(toImport);
    }
    
    // Cleanup
    setShowOcrReview(false);
    setOcrResultWords([]);
    setSelectedOcrIds([]);
    setOcrImagePreview(null);
    setActiveTab("list");
  };

  // Create Book
  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    onCreateList(newListName.trim(), newListDesc.trim(), []);
    setNewListName("");
    setNewListDesc("");
    setShowCreateListModal(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col">
      {/* List Header Selector and Info */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <span>我的单词库</span>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-normal">
              共 {words.length} 词
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            选择笔记本或拍照来快速录入生词
          </p>
        </div>

        {/* List Dropdown selector & New Book */}
        <div className="flex items-center gap-2">
          <select 
            id="book-select-dropdown"
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
          >
            <option value="all">所有单词 (全部)</option>
            {lists.map(lst => (
              <option key={lst.id} value={lst.id}>
                📖 {lst.name} ({lst.wordIds.length}词)
              </option>
            ))}
          </select>

          <button
            id="btn-create-book"
            onClick={() => setShowCreateListModal(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            title="新建笔记本"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-5 bg-white">
        <button
          id="tab-word-list"
          onClick={() => { setActiveTab("list"); stopCamera(); }}
          className={`py-3.5 text-sm font-medium border-b-2 px-1 mr-6 transition-colors flex items-center gap-2 ${
            activeTab === "list"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>单词列表</span>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
            {filteredWords.length}
          </span>
        </button>
        
        <button
          id="tab-manual-add"
          onClick={() => { setActiveTab("add-manual"); stopCamera(); }}
          className={`py-3.5 text-sm font-medium border-b-2 px-1 mr-6 transition-colors flex items-center gap-2 ${
            activeTab === "add-manual"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>手动添加</span>
        </button>

        <button
          id="tab-photo-add"
          onClick={() => { setActiveTab("add-photo"); }}
          className={`py-3.5 text-sm font-medium border-b-2 px-1 transition-colors flex items-center gap-2 ${
            activeTab === "add-photo"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Camera className="w-4 h-4 text-rose-500" />
          <span className="text-slate-800">拍照/图片识词</span>
          <span className="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full animate-pulse">
            Gemini AI
          </span>
        </button>
      </div>

      {/* Content wrapper */}
      <div className="flex-1 p-5 overflow-y-auto block">
        {/* TAB 1: LIST / EXPLORE */}
        {activeTab === "list" && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="search-word-input"
                type="text"
                placeholder="搜索单词拼写或中文翻译..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-sm pl-9 pr-4 py-2 bg-slate-100 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List Table */}
            {filteredWords.length === 0 ? (
              <div id="no-words-view" className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                <p className="text-slate-400 text-sm">
                  {searchTerm ? "找不到和搜索词匹配的单词" : "当前笔记本下没有单词"}
                </p>
                {!searchTerm && (
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => setActiveTab("add-photo")}
                      className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1 transition-colors font-medium"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      拍照/上传单词表
                    </button>
                    <button
                      onClick={() => setActiveTab("add-manual")}
                      className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1 transition-colors font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      手动补录一个
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                      <th className="p-3 w-1/3 pl-4">单词与音标</th>
                      <th className="p-3 w-1/3">中文翻译</th>
                      <th className="p-3 w-1/4 hidden md:table-cell">例句</th>
                      <th className="p-3 w-20 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWords.map((w, idx) => (
                      <tr key={w.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors group">
                        {/* Word Spelling & IPA */}
                        <td className="p-3 pl-4 align-top">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800 break-words">{w.word}</span>
                            <button
                              onClick={() => handlePronounce(w.word)}
                              className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-white border border-transparent hover:border-slate-100 transition-all shadow-sm"
                              title="播放发音"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {w.phonetic && (
                            <span className="text-xs text-slate-400 font-mono mt-0.5 block">{w.phonetic}</span>
                          )}
                          <span className="text-[9px] text-slate-400 inline-block bg-slate-100 px-1 py-0.2 rounded mt-1">
                            {w.source || "自建"}
                          </span>
                        </td>

                        {/* Chinese translation */}
                        <td className="p-3 align-top text-sm text-slate-600 break-words font-medium">
                          {w.translation}
                        </td>

                        {/* Example sentence */}
                        <td className="p-3 align-top text-xs text-slate-500 hidden md:table-cell">
                          {w.example ? (
                            <div className="space-y-0.5">
                              <p className="line-clamp-2 text-slate-700 italic">“{w.example}”</p>
                              <p className="line-clamp-1 text-slate-400">{w.exampleTranslation}</p>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3 align-top text-center whitespace-nowrap">
                          {deletingWordId === w.id ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteWord(w.id);
                                  setDeletingWordId(null);
                                }}
                                className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] px-2 py-1 rounded-md font-bold transition-all shadow-sm"
                              >
                                确认
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingWordId(null);
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] px-2 py-1 rounded-md transition-all font-medium"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingWordId(w.id);
                              }}
                              className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors inline-block"
                              title="删除单词"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANUAL ADD */}
        {activeTab === "add-manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-4 max-w-xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">✍️ 录入单个英语单词</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">只需填入英文，即可使用 AI 瞬间闪电录入或补齐音标释义句</p>
              </div>
            </div>

            {manualError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{manualError}</span>
              </div>
            )}

            <div className="bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100/50 space-y-2">
              <label className="text-xs text-indigo-900 font-semibold block">第 1 步：输入待办英文生词</label>
              <div className="relative">
                <input
                  id="manual-word"
                  type="text"
                  placeholder="请输入想要导入的英文单词，如: meticulous"
                  value={manualWord}
                  onChange={(e) => setManualWord(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              {/* AI helper action shortcuts */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1.5">
                <button
                  type="button"
                  disabled={autoGenerating || !manualWord.trim()}
                  onClick={handleAutoFill}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs px-3 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-100"
                >
                  {autoGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {autoGenerating ? "正在解析词典..." : "✨ AI一键补全音标/释义/例句"}
                </button>
                
                <button
                  type="button"
                  disabled={autoGenerating || !manualWord.trim()}
                  onClick={handleLightningImport}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs px-3 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-100"
                  title="自动分析该词并直接建档导入，体验最速的输入"
                >
                  <Check className="w-4 h-4" />
                  ⚡ 录入英文并闪电一键导入
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              <span>智能模式：AI 将全自动在后台为您配制极佳的发音音标、汉字释义和考点例句</span>
            </div>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 font-semibold block mb-1">英/美式音标 (可选)</label>
                  <input
                    id="manual-phonetic"
                    type="text"
                    placeholder="/mɪˈtɪkjələs/"
                    value={manualPhonetic}
                    onChange={(e) => setManualPhonetic(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-300"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-semibold block mb-1">中文释义 *</label>
                  <input
                    id="manual-translation"
                    type="text"
                    placeholder="如: 一丝不苟的，谨慎的"
                    value={manualTranslation}
                    onChange={(e) => setManualTranslation(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200/50">
                <span className="text-xs text-indigo-700 font-bold block">巩固辅助 (例句)</span>
                
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">英文双语例句</label>
                  <textarea
                    id="manual-example"
                    rows={2}
                    placeholder="He is very meticulous in his preparation for the dictation exam."
                    value={manualExample}
                    onChange={(e) => setManualExample(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-300"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">例句中文大意</label>
                  <input
                    id="manual-example-trans"
                    type="text"
                    placeholder="他在准备单词默写考试时非常一丝不苟。"
                    value={manualExampleTrans}
                    onChange={(e) => setManualExampleTrans(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-300"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={autoGenerating}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold px-5 py-2.5 rounded-xl flex items-center gap-1 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>保存并加入单词库</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: PHOTO OCR */}
        {activeTab === "add-photo" && (
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="text-center">
              <span className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-full animate-pulse">
                <Sparkles className="w-6 h-6" />
              </span>
              <h3 className="text-sm font-semibold text-slate-800 mt-2">Gemini 智能拍照识词</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                直接上传整页单词表的照片、绘本生词特写、手写卡片或笔记。AI 自动扣网并重组为完美词汇音标例句本！
              </p>
            </div>

            {/* Error displays */}
            {ocrError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{ocrError}</span>
              </div>
            )}

            {/* Live Camera Feed */}
            {isCameraActive && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-900 shadow-lg relative max-w-md mx-auto aspect-video">
                <video 
                  ref={videoRef} 
                  playsInline 
                  className="w-full h-full object-cover"
                />
                
                <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3">
                  <button
                    onClick={capturePhoto}
                    className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 border border-white"
                    title="点击拍照"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                  <button
                    onClick={stopCamera}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full shadow-lg transition-colors border border-slate-600"
                    title="取消"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Upload Buttons Box */}
            {!isCameraActive && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Camera button */}
                <button
                  onClick={startCamera}
                  className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 p-6 rounded-2xl text-center flex flex-col items-center justify-center gap-2.5 transition-all group"
                >
                  <span className="p-3 bg-rose-50 text-rose-500 rounded-xl group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6" />
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">开摄像机拍单词</span>
                    <span className="text-[10px] text-slate-400">适合拍摄课本、试卷及卡片生词</span>
                  </div>
                </button>

                {/* 2. Upload file button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 p-6 rounded-2xl text-center flex flex-col items-center justify-center gap-2.5 transition-all group cursor-pointer w-full"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <span className="p-3 bg-indigo-50 text-indigo-500 rounded-xl group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">上传图片或屏幕截图</span>
                    <span className="text-[10px] text-slate-400">支持 JPG, PNG, WEBP 图片格式</span>
                  </div>
                </button>
              </div>
            )}

            {/* Sample Guide */}
            <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200/40 text-[10px] text-slate-500 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-700 block">💡 拍照最佳姿势</span>
                <p className="mt-0.5">
                  1. 倾斜对正，避免强烈阴影遮挡字母。 <br />
                  2. 建议一页拍 5-20 个单词左右。Gemini 会自动检测其中的英文拼写、释义，即使只拍到了英文，AI 也能自动帮您匹配音标、翻译并生成中英对照例句！
                </p>
              </div>
            </div>

            {/* Base64 preview displaying while waiting */}
            {ocrLoading && (
              <div className="relative p-6 border border-slate-100 rounded-xl bg-slate-50 flex flex-col items-center justify-center space-y-3">
                <div className="relative">
                  {ocrImagePreview && (
                    <img 
                      src={ocrImagePreview} 
                      alt="Captured wordlist preview" 
                      className="w-32 h-20 object-cover rounded-lg opacity-40 blur-[1px] border border-slate-200"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                  </div>
                </div>

                <div className="text-center">
                  <span className="text-xs block font-semibold text-slate-800 animate-pulse">
                    Gemini 正在全速识别照片并重组解析词库...
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xs">
                    正在执行：OCR图层匹配 ⇒ 拼音校订 ⇒ 精准汉译 ⇒ 匹配生动美式口语例句
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* OCR Result Interactive Preview Modal */}
      <AnimatePresence>
        {showOcrReview && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-850 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500 animate-bounce" />
                    <span>Gemini 识词核对沙盒</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    已从图上捕获到以下共 <span className="font-bold text-indigo-600">{ocrResultWords.length}</span> 个词汇。请勾选并微调释义：
                  </p>
                </div>
                
                <button
                  onClick={() => setShowOcrReview(false)}
                  className="p-1 px-2.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
                >
                  放弃
                </button>
              </div>

              {/* Main review content list */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[300px]">
                {ocrResultWords.map((row) => {
                  const isChecked = selectedOcrIds.includes(row.tempId);
                  
                  return (
                    <div 
                      key={row.tempId}
                      className={`p-3 rounded-xl border transition-all duration-200 ${
                        isChecked 
                          ? "bg-indigo-50/30 border-indigo-200 shadow-sm"
                          : "bg-slate-50/50 border-slate-200/60 opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Selector checkbox */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => toggleSelectOcrWord(row.tempId)}
                            className="p-1.5 rounded-lg border focus:outline-none transition-colors"
                          >
                            <div className={`w-4 h-4 rounded-sm flex items-center justify-center text-white ${
                              isChecked ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-300"
                            }`}>
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                            </div>
                          </button>
                        </div>

                        {/* Editable Form Grid */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Spelling */}
                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">拼写</label>
                            <input
                              type="text"
                              value={row.word}
                              onChange={(e) => handleEditOcrField(row.tempId, "word", e.target.value)}
                              className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              disabled={!isChecked}
                            />
                            <button
                              type="button"
                              onClick={() => handlePronounce(row.word)}
                              className="text-[10px] text-indigo-600 mt-1 hover:underline flex items-center gap-0.5"
                            >
                              <Volume2 className="w-3 h-3" />
                              试听
                            </button>
                          </div>

                          {/* Phonetic & Translation */}
                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">音标</label>
                            <input
                              type="text"
                              value={row.phonetic || ""}
                              onChange={(e) => handleEditOcrField(row.tempId, "phonetic", e.target.value)}
                              placeholder="如 /əˈpɪliŋ/"
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg p-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              disabled={!isChecked}
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">中文翻译</label>
                            <input
                              type="text"
                              value={row.translation}
                              onChange={(e) => handleEditOcrField(row.tempId, "translation", e.target.value)}
                              className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              disabled={!isChecked}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Example sentences info */}
                      {isChecked && (row.example || row.exampleTranslation) && (
                        <div className="mt-3 ml-12 p-2 bg-white/70 border border-slate-100 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-slate-400 font-medium block">情境英文例句</label>
                            <input
                              type="text"
                              value={row.example || ""}
                              onChange={(e) => handleEditOcrField(row.tempId, "example", e.target.value)}
                              className="w-full text-[10px] bg-transparent border-b border-transparent hover:border-slate-250 italic focus:border-indigo-500 py-0.5 focus:outline-none text-slate-650"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 font-medium block">对应中文翻译</label>
                            <input
                              type="text"
                              value={row.exampleTranslation || ""}
                              onChange={(e) => handleEditOcrField(row.tempId, "exampleTranslation", e.target.value)}
                              className="w-full text-[10px] bg-transparent border-b border-transparent hover:border-slate-250 focus:border-indigo-500 py-0.5 focus:outline-none text-slate-650"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  即将导入: <span className="font-bold text-indigo-600">{selectedOcrIds.length}</span> 个单词
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowOcrReview(false)}
                    className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmOcrImport}
                    disabled={selectedOcrIds.length === 0}
                    className="bg-indigo-600 disabled:bg-indigo-300 disabled:cursor-not-allowed hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-md"
                  >
                    <CheckSquare className="w-4 h-4" />
                    确认导入所选生词
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal for creating a new Notebook */}
      {showCreateListModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <span>📖 新建个性化单词本</span>
            </h3>
            
            <form onSubmit={handleCreateList} className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">本子名称 *</label>
                <input
                  type="text"
                  placeholder="如: 外贸词汇 / 错题整理本"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">简介描述 (可选)</label>
                <input
                  type="text"
                  placeholder="如: 用来做雅思口语提分积累"
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateListModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold px-3 py-1.5 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold px-4 py-1.5 rounded-lg"
                >
                  创建本子
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
