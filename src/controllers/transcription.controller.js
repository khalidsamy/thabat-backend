const axios = require('axios');

/**
 * Normalizes Arabic text for comparison.
 * Removes Tashkeel and standardizes letter forms.
 */
const normalizeArabic = (text) => {
  if (!text) return "";
  return text
    .replace(/[\u064B-\u0652]/g, "") // Remove Tashkeel
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ـ]/g, "") // Remove Tatweel
    .replace(/\s+/g, " ")
    .replace(/[^\u0621-\u064A\s]/g, "") // Keep only Arabic letters and spaces
    .trim();
};

/**
 * @desc    Transcribe recitation using Hugging Face Whisper v3
 * @route   POST /api/ai/transcribe
 * @access  Private
 */
exports.transcribeRecitation = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No audio file provided" });
    }

    if (!process.env.HUGGINGFACE_TOKEN) {
      return res.status(500).json({ success: false, message: "AI Token missing" });
    }

    // Call Hugging Face Inference API (Whisper v3)
    // openai/whisper-large-v3
    const response = await axios({
      method: "post",
      url: "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
      headers: { 
        Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
        "Content-Type": "application/octet-stream" 
      },
      data: req.file.buffer, // Sent from multer memoryStorage
    });

    const transcription = response.data.text || "";
    const normalizedTranscription = normalizeArabic(transcription);

    res.status(200).json({
      success: true,
      text: transcription,
      normalized: normalizedTranscription
    });
  } catch (error) {
    console.error("Transcription Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Speech engine failed. Please try again or check your connection."
    });
  }
};
