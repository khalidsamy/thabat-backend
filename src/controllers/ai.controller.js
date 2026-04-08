const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.chatWithCoach = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) return res.status(400).json({ success: false, message: "Message is required." });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: "أنت 'مساعد ثبات الذكي'. خبير في القرآن الكريم ومنهج الشيخ علاء حامد. رد بالعربية بأسلوب محفز وقصير."
    });

    // --- الفلترة الصارمة للتاريخ ---
    let formattedHistory = [];
    
    if (Array.isArray(history) && history.length > 0) {
      history.forEach((msg) => {
        // تحويل أي Role لـ user أو model فقط
        const role = (msg.role === 'user') ? 'user' : 'model';
        // التأكد من وجود نص
        const text = msg.parts?.[0]?.text || msg.text || "";
        
        if (text.trim() !== "") {
          // لو الرسالة اللي فاتت نفس الـ role، ادمجهم مع بعض (عشان جوجل ميزعلش)
          if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === role) {
            formattedHistory[formattedHistory.length - 1].parts[0].text += "\n" + text;
          } else {
            formattedHistory.push({ role, parts: [{ text }] });
          }
        }
      });
    }

    // قانون جوجل: لازم التاريخ يبدأ بـ user. لو بدأ بـ model، احذفه.
    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory.shift();
    }

    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(message);

    res.status(200).json({ success: true, reply: result.response.text() });

  } catch (error) {
    // أهم سطر: هيطبعلنا في Railway السبب الحقيقي وراء الـ 500
    console.error("❌ GEMINI ERROR:", error.message);
    if (error.response) console.error("📝 ERROR DETAILS:", JSON.stringify(error.response.data));
    
    res.status(500).json({ success: false, message: "نعتذر، المساعد الذكي غير متاح حالياً." });
  }
};