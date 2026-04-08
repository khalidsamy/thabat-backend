const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.chatWithCoach = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required." });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 1. الطريقة الرسمية والحديثة لتعريف الشخصية (مدعومة في النسخة الجديدة)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.0-pro",
      systemInstruction: `أنت 'مساعد ثبات الذكي'. خبير في علوم القرآن وطرق الحفظ ومنهج الشيخ علاء حامد.
      ردودك يجب أن تكون باللغة العربية، عملية، ومحفزة إيمانياً. ركز على حب الله وحلاوة القرآن.
      لا تفتي في الدين بل وجه للعلماء.`
    });

    // 2. فلترة التاريخ بشكل مبسط وصارم
    let cleanHistory = [];
    if (history && Array.isArray(history)) {
      let isFirst = true;
      for (let msg of history) {
        // توحيد المسميات لـ user و model فقط
        let role = (msg.role === 'ai' || msg.role === 'model') ? 'model' : 'user';
        let text = msg.parts ? msg.parts[0].text : (msg.text || "");

        if (!text.trim()) continue; // تجاهل الرسائل الفارغة

        // قانون جوجل: يجب أن يبدأ التاريخ بـ user
        if (isFirst && role === 'model') continue;
        isFirst = false;

        // دمج الرسائل المتتالية لنفس الشخص عشان السيرفر ميضربش
        if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === role) {
           cleanHistory[cleanHistory.length - 1].parts[0].text += " \n " + text;
        } else {
           cleanHistory.push({ role, parts: [{ text }] });
        }
      }
    }

    // 3. بدء المحادثة
    const chat = model.startChat({
      history: cleanHistory,
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    res.status(200).json({ success: true, reply: text });

  } catch (error) {
    // السطر ده هو اللي هيفضح المشكلة الحقيقية في Railway لو حصلت
    console.error("🔥 GEMINI CRITICAL ERROR:", error); 
    res.status(500).json({ success: false, message: "نعتذر، المساعد الذكي غير متاح حالياً. يرجى المحاولة لاحقاً." });
  }
};