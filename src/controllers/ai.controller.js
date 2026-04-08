const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.chatWithCoach = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) return res.status(400).json({ success: false, message: "Message is required." });

    // تحديد الـ API Key
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // التعديل الجوهري هنا: نستخدم الموديل بدون كلمة v1beta لو أمكن أو نغير الموديل لـ gemini-1.5-flash-latest
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-latest", // استخدام latest بيجبره يشوف أحدث نسخة مستقرة
    }, { apiVersion: 'v1' }); // إجبار المكتبة على استخدام الإصدار المستقر v1 بدل v1beta

    // إعداد الإرشادات (Persona)
    const systemPrompt = "أنت 'مساعد ثبات الذكي'. خبير في القرآن الكريم ومنهج الشيخ علاء حامد. رد بالعربية بأسلوب محفز وقصير.";

    // تنظيف وتجهيز التاريخ
    let cleanHistory = [];
    if (Array.isArray(history)) {
      history.forEach(msg => {
        const role = (msg.role === 'ai' || msg.role === 'model') ? 'model' : 'user';
        const text = msg.parts?.[0]?.text || msg.text || "";
        if (text.trim()) {
          if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === role) {
            cleanHistory[cleanHistory.length - 1].parts[0].text += "\n" + text;
          } else {
            cleanHistory.push({ role, parts: [{ text }] });
          }
        }
      });
    }

    // التأكد من أن البداية 'user'
    if (cleanHistory.length > 0 && cleanHistory[0].role === 'model') {
      cleanHistory.shift();
    }

    // بدء الدردشة مع تمرير الـ Persona في أول رسالة لو الـ SystemInstruction لسه بتعلق
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: `تعليمات النظام: ${systemPrompt}` }] },
        { role: "model", parts: [{ text: "فهمت تماماً. أنا مساعد ثبات، كيف أخدمك اليوم؟" }] },
        ...cleanHistory
      ]
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    res.status(200).json({ success: true, reply: text });

  } catch (error) {
    console.error("❌ FINAL ATTEMPT ERROR:", error.message);
    res.status(500).json({ success: false, message: "نعتذر، المساعد الذكي غير متاح حالياً." });
  }
};