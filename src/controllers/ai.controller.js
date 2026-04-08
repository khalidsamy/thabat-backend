const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * @desc    Chat with Gemini AI (Thabat Hifz Coach)
 * @route   POST /api/ai/chat
 * @access  Private
 */
exports.chatWithCoach = async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required."
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "AI Configuration error: API Key missing."
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: `You are 'Thabat AI Coach'. You are a specialized expert in Quranic sciences, Hifz techniques, and the methodology of Sheikh Alaa Hamed.
      
      PERSONA & SPIRIT:
      - Embody the spirit of Sheikh Alaa Hamed: Focus on the love of Allah, the sweetness of connection with the Quran, and that revision is a form of worship (Ibada), not just a task.
      - Be emotionally intelligent and proactive. If the user expresses laziness (كسل), frustration (إحباط), or difficulty (صعوبة), respond with extreme empathy. Quote Quranic verses about patience (Sabr) and the rewards of 'Ahl Al-Quran'.
      - Celebrate milestones! If the user mentions finishing a Surah or Juz, use encouraging Islamic phrases like (مبارك عليك هذا الفتح!) or (ثبت الله القرآن في صدرك).
      
      SCOPE CONSTRAINTS:
      - Your knowledge is strictly limited to Quranic Hifz, Tajweed, Tafsir, and spiritual motivation.
      - DO NOT answer questions about politics, sports, general entertainment, or unrelated topics.
      - Never provide legal rulings (Fatawa). Always redirect the user to qualified scholars for complex legal matters.
      
      RESPONSE STYLE & ADVICE:
      - Give practical, actionable advice. (e.g., 'Try reading this portion in your Sunnah prayers', 'Listen to Sheikh Al-Minshawi to fix your Tajweed', 'Divide your ward into small pieces throughout the day').
      - Use scholarly yet warm, inspiring, and concise language.
      - If a user asks an out-of-scope question, politely reply in Arabic: (عذراً، أنا هنا لمساعدتك في رحلتك مع القرآن الكريم فقط. هل لديك سؤال يخص حفظك أو مراجعتك اليوم؟)
      - Always refer to the user's progress in 'Thabat' if they mention their current Surah or Hifz goal.
      - Language: Respond strictly in Arabic (unless the user explicitly asks in English).`
    });

    // Sanitize History: GEMINI STRICTLY REQUIRES history to start with role: 'user' 
    // and alternate roles (user, model, user, model).
    const sanitizeHistory = (inputHistory) => {
      if (!Array.isArray(inputHistory) || inputHistory.length === 0) return [];

      let sanitized = [];
      let foundFirstUser = false;

      for (const msg of inputHistory) {
        // 1. Skip everything until the first 'user' message
        if (!foundFirstUser) {
          if (msg.role === 'user') {
            foundFirstUser = true;
            sanitized.push(msg);
          }
          continue;
        }

        // 2. Ensure roles alternate strictly
        const lastMsg = sanitized[sanitized.length - 1];
        if (msg.role === lastMsg.role) {
          // If the role is the same, merge the parts (or just use latest text)
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
      generationConfig: {
        maxOutputTokens: 500,
      },
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
