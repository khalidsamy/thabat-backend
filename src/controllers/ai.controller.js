const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Thabat AI Coach Controller (Legacy Fallback).
 * Uses 'gemini-1.0-pro' to ensure maximum compatibility in environments where 
 * newer Flash models might return 404.
 * Implements "Context Injection" for the persona since systemInstruction 
 * isn't supported in legacy models.
 */
exports.chatWithCoach = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required." });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Using gemini-1.0-pro as it's the most stable, universally available model.
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });

    // --- CONTEXT INJECTION (Persona definition) ---
    // Pre-pending the persona to the history since systemInstruction is not 
    // available for the 1.0-pro model series.
    const personaMessages = [
      {
        role: "user",
        parts: [{ text: "أنت هو 'مساعد ثبات الذكي'. خبير متخصص في علوم القرآن الكريم، طرق الحفظ، وتثبيت المراجعة، وتتبع منهج الشيخ علاء حامد. يجب أن تكون ردودك دائماً باللغة العربية، مشجعة، وعملية، وتركز على الجانب الإيماني وحب كتاب الله. لا تقدم أي فتاوى دينية بل وجه السائل للعلماء المختصين." }]
      },
      {
        role: "model",
        parts: [{ text: "فهمت تماماً. أنا مساعد ثبات الذكي، رفيقك في رحلة حفظ القرآن وتثبيته. أنا هنا لأدعمك بنصائح عملية وقوة إيمانية، بأسلوب مستلهم من منهج الشيخ علاء حامد. كيف يمكنني أن أعينك في وردك اليوم؟" }]
      }
    ];

    // --- HISTORY SANITIZATION ---
    // Google SDK requires strict User -> Model alternation starting with User.
    let cleanHistory = [...personaMessages];
    
    if (history && Array.isArray(history)) {
      for (let msg of history) {
        // Normalize roles for SDK compatibility
        let role = (msg.role === 'ai' || msg.role === 'model') ? 'model' : 'user';
        let text = msg.parts ? msg.parts[0].text : (msg.text || "");

        if (!text.trim()) continue;

        const lastMsg = cleanHistory[cleanHistory.length - 1];
        
        // Ensure strictly alternating roles by merging consecutive identical roles
        if (lastMsg.role === role) {
          lastMsg.parts[0].text += " \n " + text;
        } else {
          cleanHistory.push({ role, parts: [{ text }] });
        }
      }
    }

    // --- CHAT SESSION ---
    const chat = model.startChat({
      history: cleanHistory,
    });

    // We use result.response.text() as it's reliable across Node SDK versions.
    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    res.status(200).json({ success: true, reply: responseText });

  } catch (error) {
    // Extensive logging for production troubleshooting in Railway
    console.error("🚨 GEMINI 1.0-PRO CRITICAL ERROR:", {
      message: error.message,
      stack: error.stack,
      data: error.response?.data
    });

    res.status(500).json({ 
      success: false, 
      message: "نعتذر، المساعد الذكي غير متاح حالياً. يرجى المحاولة لاحقاً." 
    });
  }
};