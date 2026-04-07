const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from current dir (backend)
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const Progress = require('../models/Progress.model');

async function testErrorWall() {
    try {
        console.log('Connecting to MongoDB...');
        if (!process.env.MONGO_URI) throw new Error('MONGO_URI not found in .env');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        let progress = await Progress.findOne();
        if (!progress) {
            console.log('No progress document found. Create one first.');
            process.exit(0);
        }

        const surahNumber = 1;
        const surahName = 'Al-Fatihah';

        console.log(`Current error counts for Surah ${surahNumber}:`, progress.errorCounts.get(surahNumber.toString()) || 0);

        // Simulate 3 errors
        for (let i = 1; i <= 3; i++) {
            const currentCount = progress.errorCounts.get(surahNumber.toString()) || 0;
            const newCount = currentCount + 1;
            progress.errorCounts.set(surahNumber.toString(), newCount);

            if (newCount >= 3) {
                const weakIdx = progress.weakSurahs.findIndex(s => s.surahNumber === surahNumber);
                if (weakIdx === -1) {
                    progress.weakSurahs.push({
                        surahNumber,
                        surahName,
                        lastFailed: new Date(),
                        errorCount: newCount
                    });
                } else {
                    progress.weakSurahs[weakIdx].errorCount = newCount;
                    progress.weakSurahs[weakIdx].lastFailed = new Date();
                }
            }
            await progress.save();
            console.log(`- Update ${i}: New count ${newCount} (Is Weak: ${newCount >= 3})`);
        }

        const updated = await Progress.findById(progress._id);
        const weak = updated.weakSurahs.find(s => s.surahNumber === surahNumber);
        if (weak) {
            console.log('\n✅ SUCCESS: Surah added to 3-Error Wall!');
            console.log('Details:', { surah: weak.surahName, fails: weak.errorCount, date: weak.lastFailed });
        } else {
            console.log('\n❌ FAILURE: Surah not found in weakSurahs.');
        }

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

testErrorWall();
