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
      
      SCOPE CONSTRAINTS:
      - Your knowledge is strictly limited to Quranic Hifz, Tajweed, Tafsir, and spiritual motivation.
      - DO NOT answer questions about politics, sports, general entertainment, or unrelated topics.
      - Never provide legal rulings (Fatawa). Always redirect the user to qualified scholars for complex legal matters.
      
      RESPONSE STYLE:
      - Use scholarly yet warm and supportive language.
      - If a user asks an out-of-scope question, politely reply in Arabic: (عذراً، أنا هنا لمساعدتك في رحلتك مع القرآن الكريم فقط. هل لديك سؤال يخص حفظك أو مراجعتك اليوم؟)
      - Always refer to the user's progress in 'Thabat' if they mention their current Surah or Hifz goal.
      - Language: Respond in the language the user uses (Arabic/English).`
    });

    const chat = model.startChat({
      history: history || [],
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
