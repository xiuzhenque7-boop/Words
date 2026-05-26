import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON parsing with a high limit for base64 photo transfers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy init of Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set.");
    }
    geminiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClient;
}

// 1. OCR Extract Words from Image
app.post("/api/ocr-words", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Missing image data" });
    }

    // Prepare image for Gemini
    // Image base64 string can contain standard metadata like data:image/png;base64,...
    let mimeType = "image/jpeg";
    let base64Data = image;

    const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    const ai = getGeminiClient();

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const promptText = `你是一个专业的英语教育AI助手。请识别并提取这张图片中包含的英文单词、短语或句子中的单词。
针对图片中的每个单词，请进行精细化词典解析：
1. 拼写（Word）
2. 美式/英式音标（Phonetic Symbol，如 /wɜːrd/）
3. 准确的中文翻译（Chinese Translation）
4. 一个简单实用的英文生动例句（Example Sentence）
5. 例句的中文翻译（Example Translation）

注意：如果图片只是一张单词表，请完美还原表中的所有单词。如果是读书、报纸、试卷的段落照片，请提取其中的重点英文词汇或所有出现的英文单词进行建表。如果图片没有清晰词汇，尽量提取可辨识的部分。`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [imagePart, { text: promptText }],
      config: {
        systemInstruction: "你是一个专业的OCR与英文词典解析机器人。你的任务是分析照片中的内容，找出其中的英文单词，并为每一个单词生成高质量的默写属性。必须返回标准的包含单词信息的JSON数组。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "A list of extracted words with their dictionary details.",
          items: {
            type: Type.OBJECT,
            required: ["word", "translation"],
            properties: {
              word: {
                type: Type.STRING,
                description: "Spelling of the English word or phrase (e.g., 'accommodate'). Ensure correct letter casing."
              },
              phonetic: {
                type: Type.STRING,
                description: "Phonetic transcription, e.g., '/əˈkɒmədeɪt/'."
              },
              translation: {
                type: Type.STRING,
                description: "Clear and concise Chinese translation, e.g., '容纳；适应'."
              },
              example: {
                type: Type.STRING,
                description: "A relevant, easy-to-understand example sentence utilizing the word in context."
              },
              exampleTranslation: {
                type: Type.STRING,
                description: "The Chinese translation of the example sentence."
              }
            }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from AI model.");
    }

    const words = JSON.parse(resultText.trim());
    return res.json({ success: true, count: words.length, words });

  } catch (error: any) {
    console.error("OCR Extract Error:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze image and extract words" });
  }
});

// 2. Word AI Helper: Mnemonic / Explanation for incorrect words
app.post("/api/word-ai-helper", async (req, res) => {
  try {
    const { word, translation, context } = req.body;
    if (!word) {
      return res.status(400).json({ error: "Missing word" });
    }

    const ai = getGeminiClient();
    const promptText = `单词："${word}"
中文翻译："${translation || "未知"}"
上下文/错误情况："${context || "拼写错误或遗忘"}"

请为该单词生成一个针对性的“错词克星”学习卡片：
1. 记忆法 (Mnemonic Link): 巧妙有趣的拆词、谐音联想或联想记忆，帮助下次记住拼写。
2. 考点/易错点 (Common Mistake): 分析该单词最容易拼错或记混的地方在哪里（如拼音混淆、双写字母等）。
3. 扩展 (Extra Tip): 一个极简词源或常用搭配（不超过15字）。`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction: "你是一个英语错词和记忆法分析师。能够为用户提供针对性的、生动有趣、言简意赅的单词记忆卡片和易错提醒。必须返回标准的JSON格式。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["mnemonic", "mistakeAnalysis", "tip"],
          properties: {
            mnemonic: {
              type: Type.STRING,
              description: "有趣形象的拆字联想、谐音或顺口溜记忆法"
            },
            mistakeAnalysis: {
              type: Type.STRING,
              description: "指出该词最容易写错的点（如拼写双写、辅音混淆、元音容易拼错的地方）"
            },
            tip: {
              type: Type.STRING,
              description: "实用的小搭配或词根词缀提点"
            }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from helper model");
    }

    const analysis = JSON.parse(resultText.trim());
    return res.json({ success: true, analysis });

  } catch (error: any) {
    console.error("AI Helper Error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate word helper card" });
  }
});

// Serve health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Vite middleware flow
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Failed to start server:", err);
});
