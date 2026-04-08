const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.chatWithCoach = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!process.env.GEMINI_API_KEY) {
       throw new Error("API Key is missing from environment variables!");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 1. استخدام الموديل الأحدث مع تعريف الشخصية (متاح الآن بفضل المفتاح الجديد)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: "أنت 'مساعد ثبات الذكي'، خبير في علوم القرآن وحفظه بمنهج الشيخ علاء حامد. أجب باللغة العربية بأسلوب محفز، عملي، ومختصر."
    });

    // 2. تنظيف التاريخ مبدئياً
    let rawHistory = (history || []).map(msg => ({
      role: (msg.role === 'ai' || msg.role === 'model') ? 'model' : 'user',
      parts: [{ text: msg.parts ? msg.parts[0].text : (msg.text || "") }]
    })).filter(msg => msg.parts[0].text.trim() !== "");

    // حذف أي رسالة للذكاء الاصطناعي لو كانت هي الأولى
    if (rawHistory.length > 0 && rawHistory[0].role === 'model') {
        rawHistory.shift();
    }

    // 3. دمج الرسائل المتتالية (عشان جوجل متضربش إيرور)
    let cleanHistory = [];
    let lastRole = null;
    for (let msg of rawHistory) {
        if (msg.role !== lastRole) {
            cleanHistory.push(msg);
            lastRole = msg.role;
        } else {
            cleanHistory[cleanHistory.length - 1].parts[0].text += "\n" + msg.parts[0].text;
        }
    }

    // 4. إرسال الطلب
    const chat = model.startChat({ history: cleanHistory });
    const result = await chat.sendMessage(message);

    res.status(200).json({ success: true, reply: result.response.text() });

  } catch (error) {
    // السطر ده هيطبع المشكلة الحقيقية الجديدة (لو حصلت)
    console.error("🔥 LATEST GEMINI ERROR:", error);
    res.status(500).json({ success: false, message: "نعتذر، المساعد الذكي غير متاح حالياً. يرجى المحاولة لاحقاً." });
  }
};