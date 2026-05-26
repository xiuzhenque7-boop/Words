import React, { useState, useEffect } from "react";
import { Word, WordList } from "./types";
import { DEFAULT_WORDS, DEFAULT_BOOK_LISTS } from "./data";
import WordListManager from "./components/WordListManager";
import DictationArena from "./components/DictationArena";
import { 
  Sparkles, Award, BookOpen, AlertCircle, RefreshCw, CheckCircle, 
  HelpCircle, Layers, LogIn, ChevronRight, CheckSquare, Settings
} from "lucide-react";

export default function App() {
  // Global States persisted inside localStorage
  const [words, setWords] = useState<Word[]>([]);
  const [lists, setLists] = useState<WordList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("all");
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize data from localStorage
  useEffect(() => {
    try {
      const storedWords = localStorage.getItem("word_dictation_app_words_v2");
      const storedLists = localStorage.getItem("word_dictation_app_lists_v2");

      if (storedWords) {
        setWords(JSON.parse(storedWords));
      } else {
        setWords(DEFAULT_WORDS);
        localStorage.setItem("word_dictation_app_words_v2", JSON.stringify(DEFAULT_WORDS));
      }

      if (storedLists) {
        setLists(JSON.parse(storedLists));
      } else {
        setLists(DEFAULT_BOOK_LISTS);
        localStorage.setItem("word_dictation_app_lists_v2", JSON.stringify(DEFAULT_BOOK_LISTS));
      }
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
      setWords(DEFAULT_WORDS);
      setLists(DEFAULT_BOOK_LISTS);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save changes to localStorage whenever state updates
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem("word_dictation_app_words_v2", JSON.stringify(words));
    } catch (e) {
      console.error("Failed to save words to localStorage:", e);
    }
  }, [words, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem("word_dictation_app_lists_v2", JSON.stringify(lists));
    } catch (e) {
      console.error("Failed to save lists to localStorage:", e);
    }
  }, [lists, isInitialized]);

  // Master Stats Calculations
  const totalCount = words.length;
  const masteredCount = words.filter(w => w.correctCount > 0 && w.wrongCount === 0).length;
  const mistakeCount = words.filter(w => w.wrongCount > 0).length;

  // Active list item
  const currentBook = lists.find(l => l.id === selectedListId);
  const currentBookName = selectedListId === "all" ? "所有单词 (全体)" : (currentBook?.name || "未知笔记本");

  // Add bulk words
  const handleAddWords = (
    newWords: Omit<Word, "id" | "createdAt" | "wrongCount" | "correctCount">[]
  ) => {
    const timeNow = Date.now();
    const createdItems: Word[] = newWords.map((item, idx) => ({
      ...item,
      id: `word-${timeNow}-${idx}-${Math.floor(Math.random() * 10000)}`,
      createdAt: timeNow,
      wrongCount: 0,
      correctCount: 0
    }));

    // Update words state
    setWords(prev => [createdItems[0], ...createdItems.slice(1), ...prev]);

    // If a specific notebook list is selected, append the IDs to it
    if (selectedListId !== "all") {
      setLists(prevLists => prevLists.map(lst => {
        if (lst.id === selectedListId) {
          const updatedWordIds = [...lst.wordIds, ...createdItems.map(w => w.id)];
          return { ...lst, wordIds: updatedWordIds };
        }
        return lst;
      }));
    } else {
      // By default, if "All" is selected and there's a default list, we can choose to add it to first available list too
      if (lists.length > 0) {
        setLists(prevLists => prevLists.map((lst, idx) => {
          if (idx === 0) {
            return { ...lst, wordIds: [...lst.wordIds, ...createdItems.map(w => w.id)] };
          }
          return lst;
        }));
      }
    }
  };

  // Delete manual or OCR-ed word
  const handleDeleteWord = (id: string) => {
    if (confirm("确定要删除该单词吗？这会清除其所有默写数据。")) {
      setWords(prev => prev.filter(w => w.id !== id));
      // Also remove reference from all binders/lists
      setLists(prevLists => prevLists.map(lst => ({
        ...lst,
        wordIds: lst.wordIds.filter(wid => wid !== id)
      })));
    }
  };

  // Create a brand new customized Notebook
  const handleCreateList = (name: string, description: string, initialWordIds: string[]) => {
    const newList: WordList = {
      id: `list-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      description,
      wordIds: initialWordIds
    };
    setLists(prev => [...prev, newList]);
    setSelectedListId(newList.id);
  };

  // Update stats on answer submission
  const handleUpdateWordStats = (wordId: string, isCorrect: boolean) => {
    setWords(prevWords => prevWords.map(w => {
      if (w.id === wordId) {
        const correctAdd = isCorrect ? 1 : 0;
        const wrongAdd = isCorrect ? 0 : 1;
        
        let newWrongCount = w.wrongCount + wrongAdd;
        // If they get it correct, resolve/decrease past mistake status of this word to ease mistake pool clean up
        if (isCorrect && w.wrongCount > 0) {
          newWrongCount = Math.max(0, w.wrongCount - 1);
        }

        return {
          ...w,
          correctCount: w.correctCount + correctAdd,
          wrongCount: newWrongCount,
          lastTestedAt: Date.now()
        };
      }
      return w;
    }));
  };

  // Pre-filter words of selected list so child components receive synced arrays
  const filteredActiveWords = words.filter(w => {
    if (selectedListId === "all") return true;
    return currentBook?.wordIds.includes(w.id);
  });

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 font-sans selection:bg-indigo-100 flex flex-col">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <span>智能单词默写助手</span>
              <span className="text-[10px] bg-gradient-to-r from-indigo-500 to-sky-500 text-white font-bold py-0.5 px-2 rounded-full shadow">
                Pro
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              听写发声 · 拍照提取 · 错词AI特调辅导
            </p>
          </div>
        </div>

        {/* Top metrics tracker cards */}
        <div className="flex items-center gap-3 font-medium">
          <div className="bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs">
            <Layers className="w-4 h-4 text-indigo-500" />
            <div className="text-left leading-none">
              <span className="text-[10px] text-slate-400 block font-bold">词库单词</span>
              <strong className="text-slate-700 font-mono text-xs">{totalCount} 词</strong>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <div className="text-left leading-none">
              <span className="text-[10px] text-slate-400 block font-bold">已掌握</span>
              <strong className="text-slate-700 font-mono text-xs">{masteredCount} 词</strong>
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <div className="text-left leading-none">
              <span className="text-[10px] text-rose-500 font-bold block">待纠正错词</span>
              <strong className="text-rose-700 font-mono text-xs">{mistakeCount} 词</strong>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Manage & Scan (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col h-full min-h-[500px]">
          <WordListManager
            words={words}
            lists={lists}
            selectedListId={selectedListId}
            setSelectedListId={setSelectedListId}
            onAddWords={handleAddWords}
            onDeleteWord={handleDeleteWord}
            onCreateList={handleCreateList}
            currentBook={currentBook}
          />
        </div>

        {/* Right Column: Arena (Play, feedback, assessment) (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col h-full min-h-[500px]">
          <DictationArena
            words={filteredActiveWords}
            selectedListId={selectedListId}
            currentBookName={currentBookName}
            onUpdateWordStats={handleUpdateWordStats}
          />
        </div>

      </main>

      {/* Aesthetic Footer */}
      <footer className="bg-white border-t border-slate-200/40 p-5 mt-8 text-center text-xs text-slate-400">
        <p className="font-semibold text-slate-500 flex items-center justify-center gap-1.5">
          <span>单词默写 App &copy; 2026</span>
          <span className="text-slate-300">|</span>
          <span>双模默记引擎 v2.3</span>
          <span className="text-slate-300">|</span>
          <span className="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
            Gemini Flash 3.5 智能赋能
          </span>
        </p>
        <p className="mt-1">
          支持整本随机听写，或针对错词循环巩固。遇生词时可随时勾选其由 AI 提供谐音助记或易错诊断卡片。
        </p>
      </footer>
    </div>
  );
}
