export interface Word {
  id: string;
  word: string;         // e.g., "accomplish"
  phonetic?: string;    // e.g., "/əˈkʌm.plɪʃ/"
  translation: string;  // e.g., "完成；实现"
  example?: string;     // e.g., "We can accomplish anything if we work together."
  exampleTranslation?: string; // e.g., "如果我们齐心协力，我们就能完成任何事情。"
  source?: string;      // e.g., "手动录入" or "拍照导入: 2026-05-26"
  createdAt: number;
  
  // Statistics
  wrongCount: number;
  correctCount: number;
  lastTestedAt?: number;
  isFavorite?: boolean;
}

export interface DictationItem {
  wordId: string;
  word: string;
  translation: string;
  userAnswer: string;
  isCorrect: boolean;
  phonetic?: string;
}

export interface DictationSession {
  id: string;
  date: number;
  totalCount: number;
  correctCount: number;
  items: DictationItem[];
  type: 'general' | 'mistake-focused';
}

export interface WordList {
  id: string;
  name: string;
  description: string;
  wordIds: string[];
  isDefault?: boolean;
}

export interface AiExplanation {
  mnemonic: string;
  mistakeAnalysis: string;
  tip: string;
}
