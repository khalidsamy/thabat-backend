const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Thabat AI Coach Controller.
 * Manages conversational sessions with the Google Gemini model.
 * Uses Context Injection to bypass SDK systemInstruction limitations.
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

    // 1. تعريف الموديل الأكثر استقراراً (بدون systemInstruction عشان نمنع الـ 404)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. تعريف شخصية المساعد (Persona)
    const personaPrompt = `You are 'Thabat AI Coach'. You are a specialized expert in Quranic sciences, Hifz techniques, and the methodology of Sheikh Alaa Hamed.
      PERSONA & SPIRIT:
      - Embody the spirit of Sheikh Alaa Hamed: Focus on the love of Allah, the sweetness of connection with the Quran.
      - Be emotionally intelligent. If the user expresses frustration, respond with empathy and Quranic verses about patience (Sabr).
      - Celebrate milestones with encouraging Islamic phrases (e.g., مبارك عليك هذا الفتح!).
      SCOPE CONSTRAINTS:
      - Strictly limited to Quranic Hifz, Tajweed, Tafsir, and spiritual motivation.
      - DO NOT answer questions about politics, sports, or unrelated topics.
      RESPONSE STYLE:
      - Practical, actionable advice.
      - Language: Respond strictly in Arabic unless explicitly asked in English.`;

    // 3. خدعة الحقن: وضع الشخصية كأول محادثة وهمية في التاريخ (Context Injection)
    const systemContext = [
      {
        role: 'user',
        parts: [{ text: `System Instruction: ${personaPrompt}\n\nAcknowledge this role and reply in Arabic.` }]
      },
      {
        role: 'model',
        parts: [{ text: `فهمت دوري جيداً. أنا مساعد "ثبات" الذكي، أحمل روح ومنهج الشيخ علاء حامد. أنا هنا لمساعدتك في حفظ القرآن الكريم، التجويد، ورفع همتك الإيمانية. كيف يمكنني مساعدتك يا حامل القرآن؟` }]
      }
    ];

    // 4. فلترة تاريخ اليوزر القادم من الفرونت-إيند
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

    // 5. دمج المحادثة الوهمية (الشخصية) مع تاريخ اليوزر الحقيقي
    const userHistory = sanitizeHistory(history || []);
    const finalHistory = [...systemContext, ...userHistory];

    // 6. بدء المحادثة
    const chat = model.startChat({
      history: finalHistory,
      generationConfig: { maxOutputTokens: 800 },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({
      success: true,
      reply: text
    });
  } catch (error) {
    console.error("CRITICAL Gemini API Error:", error);
    res.status(500).json({
      success: false,
      message: "نعتذر، المساعد الذكي غير متاح حالياً. يرجى المحاولة لاحقاً."
    });
  }
};