const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Thabat AI Coach Controller.
 * Manages conversational sessions with the Google Gemini-1.5-Flash model.
 * Implements strict history sanitization to satisfy Google Generative AI SDK constraints.
 */
exports.chatWithCoach = async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, message: "AI Configuration error: API Key missing." });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-latest",
      systemInstruction: `You are 'Thabat AI Coach'. You are a specialized expert in Quranic sciences, Hifz techniques, and the methodology of Sheikh Alaa Hamed.
      
      PERSONA & SPIRIT:
      - Embody the spirit of Sheikh Alaa Hamed: Focus on the love of Allah, the sweetness of connection with the Quran, and that revision is a form of worship (Ibada).
      - Be emotionally intelligent and proactive. If the user expresses frustration, respond with empathy and Quranic verses about patience (Sabr).
      - Celebrate milestones with encouraging Islamic phrases (e.g., مبارك عليك هذا الفتح!).
      
      SCOPE CONSTRAINTS:
      - Strictly limited to Quranic Hifz, Tajweed, Tafsir, and spiritual motivation.
      - DO NOT answer questions about politics, sports, or unrelated topics.
      - Never provide legal rulings (Fatawa). Redirect to scholars for complex matters.
      
      RESPONSE STYLE:
      - Practical, actionable advice (e.g., 'Divide your ward', 'Listen to Sheikh Al-Minshawi').
      - Language: Respond strictly in Arabic unless explicitly asked in English.`
    });

    /**
     * Sanitizes chat history for Gemini compatibility.
     * Rules:
     * 1. Must start with a 'user' role.
     * 2. Must alternate strictly between 'user' and 'model'.
     * 3. Merges consecutive identical roles to prevent SDK crashes.
     */
    const sanitizeHistory = (inputHistory) => {
      if (!Array.isArray(inputHistory) || inputHistory.length === 0) return [];

      let sanitized = [];
      let foundFirstUser = false;

      for (const msg of inputHistory) {
        if (!foundFirstUser) {
          if (msg.role === 'user') {
            foundFirstUser = true;
            sanitized.push(msg);
          }
          continue;
        }

        const lastMsg = sanitized[sanitized.length - 1];
        if (msg.role === lastMsg.role) {
          lastMsg.parts = [...lastMsg.parts, ...msg.parts];
        } else {
          sanitized.push(msg);
        }
      }

      return sanitized;
    };

    const formattedHistory = sanitizeHistory(history || []);

    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: { maxOutputTokens: 500 },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({
      success: true,
      reply: text
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({
      success: false,
      message: "The Hifz Coach is temporarily unavailable. Please try again later."
    });
  }
};
