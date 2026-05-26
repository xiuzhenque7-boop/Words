import { Word, WordList } from "./types";

export const DEFAULT_WORDS: Word[] = [
  {
    id: "def-1",
    word: "abandon",
    phonetic: "/əˈbændən/",
    translation: "放弃，抛弃",
    example: "The baby was found abandoned in a supermarket.",
    exampleTranslation: "这个婴儿被发现遗弃在一家超市里。",
    createdAt: 1779813200000,
    wrongCount: 0,
    correctCount: 0,
    source: "系统内置"
  },
  {
    id: "def-2",
    word: "beautiful",
    phonetic: "/ˈbjuːtɪfl/",
    translation: "美丽的，漂亮的",
    example: "What a beautiful day it is today!",
    exampleTranslation: "今天天气真好啊！",
    createdAt: 1779813200000,
    wrongCount: 0,
    correctCount: 0,
    source: "系统内置"
  },
  {
    id: "def-3",
    word: "challenge",
    phonetic: "/ˈtʃælɪndʒ/",
    translation: "挑战；向...挑战",
    example: "She welcomed the challenge of her new job.",
    exampleTranslation: "她欢迎新工作带给她的挑战。",
    createdAt: 1779813200000,
    wrongCount: 0,
    correctCount: 0,
    source: "系统内置"
  },
  {
    id: "def-4",
    word: "determine",
    phonetic: "/dɪˈtɜːmɪn/",
    translation: "决定，下定决心",
    example: "Your attitude determines your altitude in life.",
    exampleTranslation: "态度决定你人生的高度。",
    createdAt: 1779813200000,
    wrongCount: 0,
    correctCount: 0,
    source: "系统内置"
  },
  {
    id: "def-5",
    word: "encourage",
    phonetic: "/ɪnˈkʌrɪdʒ/",
    translation: "鼓励，支持",
    example: "My teacher encouraged me to speak English in public.",
    exampleTranslation: "我的老师鼓励我在公共场合说英语。",
    createdAt: 1779813200000,
    wrongCount: 0,
    correctCount: 0,
    source: "系统内置"
  },
  {
    id: "def-6",
    word: "frequently",
    phonetic: "/ˈfriːkwəntli/",
    translation: "频繁地，经常地",
    example: "Buses run frequently between the city and the airport.",
    exampleTranslation: "市区和机场之间有频繁的公共汽车往返。",
    createdAt: 1779813200000,
    wrongCount: 0,
    correctCount: 0,
    source: "系统内置"
  },
  {
    id: "def-7",
    word: "generous",
    phonetic: "/ˈdʒenərəs/",
    translation: "慷慨的，大方的",
    example: "It was generous of you to buy me dinner.",
    exampleTranslation: "你请我吃晚饭真是太大方了。",
    createdAt: 1779813200000,
    wrongCount: 0,
    correctCount: 0,
    source: "系统内置"
  },
  {
    id: "def-8",
    word: "hesitate",
    phonetic: "/ˈhezɪteɪt/",
    translation: "犹豫，踌躇",
    example: "Do not hesitate to contact me if you have questions.",
    exampleTranslation: "如果有问题，请毫不犹豫地联系我。",
    createdAt: 1779813200000,
    wrongCount: 0,
    correctCount: 0,
    source: "系统内置"
  },
  {
    id: "def-9",
    word: "innovative",
    phonetic: "/ˈɪnəveɪtɪv/",
    translation: "创新的，新颖的",
    example: "We need more innovative ideas to increase sales.",
    exampleTranslation: "我们需要更多创新的点子来提升销量。",
    createdAt: 1779813200000,
    wrongCount: 0,
    correctCount: 0,
    source: "系统内置"
  },
  {
    id: "def-10",
    word: "negotiate",
    phonetic: "/nɪˈɡəʊʃieɪt/",
    translation: "谈判，商议",
    example: "They are trying to negotiate a new peace agreement.",
    exampleTranslation: "他们正在试图谈判达成一项新的和平协议。",
    createdAt: 1779813200000,
    wrongCount: 0,
    correctCount: 0,
    source: "系统内置"
  }
];

export const DEFAULT_BOOK_LISTS: WordList[] = [
  {
    id: "book-1",
    name: "常用词汇精选",
    description: "内置高频精选词汇，适合开始初次默写测试",
    wordIds: ["def-1", "def-2", "def-3", "def-4", "def-5", "def-6", "def-7", "def-8", "def-9", "def-10"],
    isDefault: true
  }
];
