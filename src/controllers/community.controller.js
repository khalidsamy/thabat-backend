const Reflection = require('../models/Reflection.js');
const Progress = require('../models/Progress.model.js');

/**
 * @desc    Post a spiritual reflection
 * @route   POST /api/community/reflect
 * @access  Private
 */
exports.postReflection = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { content } = req.body;

    if (!content || content.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Reflection must be between 1 and 200 characters.'
      });
    }

    // Step 1: Verify if the user completed their daily goal
    const progress = await Progress.findOne({ user: userId });
    
    if (!progress) {
       return res.status(403).json({
         success: false,
         message: 'You must start your journey and complete your first goal before posting.'
       });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastUpdateDate = progress.lastUpdate ? new Date(progress.lastUpdate.getFullYear(), progress.lastUpdate.getMonth(), progress.lastUpdate.getDate()) : null;

    const isToday = lastUpdateDate && today.getTime() === lastUpdateDate.getTime();
    const doneToday = isToday ? progress.doneToday : 0;
    const dailyTarget = progress.dailyTarget;

    if (doneToday < dailyTarget) {
      return res.status(403).json({
        success: false,
        message: 'Daily goal not reached. Finish your Hifz/Review tasks to share a reflection!'
      });
    }

    // Step 2: Create reflection
    const reflection = new Reflection({
      user: userId,
      userName: req.user.name || 'A Servant of Allah',
      content
    });

    await reflection.save();

    res.status(201).json({
      success: true,
      data: reflection
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get latest reflections
 * @route   GET /api/community
 * @access  Private
 */
exports.getReflections = async (req, res, next) => {
  try {
    const reflections = await Reflection.find()
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: reflections
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Pray (Du'a) for a reflection
 * @route   POST /api/community/dua/:id
 * @access  Private
 */
exports.addDua = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const reflection = await Reflection.findById(id);

    if (!reflection) {
      return res.status(404).json({
        success: false,
        message: 'Reflection not found.'
      });
    }

    // Prevent duplicate Du'as from same user
    if (reflection.duas.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You have already offered a Du\'a for this reflection.'
      });
    }

    reflection.duas.push(userId);
    reflection.duaCount += 1;
    await reflection.save();

    res.status(200).json({
      success: true,
      duaCount: reflection.duaCount
    });
  } catch (error) {
    next(error);
  }
};
