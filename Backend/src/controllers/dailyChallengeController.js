const DailyChallenge=require('../models/dailyChallenge');
const Submission=require('../models/submission');
const {getUtcDayBounds,addUtcDays}=require('../utils/dailyChallengeWindow');
const {selectDailyChallenge,effectiveStreakForDisplay}=require('../utils/dailyChallengeSelection');

const problemSummary=(problemDoc)=>({
    _id:problemDoc._id,
    title:problemDoc.title,
    problemNumber:problemDoc.problemNumber,
    difficulty:problemDoc.difficulty,
    tags:problemDoc.tags
});

const getTodayChallenge=async(req,res)=>{
    try{
        const now=new Date();
        const {date:todayStr}=getUtcDayBounds(now);

        const challenge=await selectDailyChallenge(now);
        await challenge.populate('problemId','title problemNumber difficulty tags');

        res.status(200).json({
            date:challenge.date,
            problem:problemSummary(challenge.problemId),
            windowStart:challenge.windowStart,
            windowEnd:challenge.windowEnd,
            solvedInWindowByMe:req.result.lastDailyCreditDate===todayStr,
            myStreak:effectiveStreakForDisplay(req.result,now),
            myCredits:req.result.credits
        });
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

const getCalendar=async(req,res)=>{
    try{
        const {date:todayStr}=getUtcDayBounds();
        const startStr=addUtcDays(todayStr,-29);

        const challenges=await DailyChallenge.find({date:{$gte:startStr}})
            .sort({date:-1})
            .populate('problemId','title problemNumber difficulty tags');

        const problemIds=challenges.map((c)=>c.problemId._id);
        const mySubs=await Submission.find({
            userId:req.result._id,
            problemId:{$in:problemIds},
            status:'accepted'
        }).select('problemId createdAt').lean();

        const calendar=challenges.map((c)=>({
            date:c.date,
            problem:problemSummary(c.problemId),
            wasSolvedByMeInWindow:mySubs.some((s)=>
                String(s.problemId)===String(c.problemId._id) &&
                s.createdAt>=c.windowStart && s.createdAt<c.windowEnd
            )
        }));

        res.status(200).json(calendar);
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

const getChallengeByDate=async(req,res)=>{
    try{
        const {date}=req.params;
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){
            return res.status(400).json({error:"Invalid date format, expected YYYY-MM-DD"});
        }

        const challenge=await DailyChallenge.findOne({date}).populate('problemId','title problemNumber difficulty tags');
        if(!challenge){
            return res.status(404).json({error:"No daily challenge found for this date"});
        }

        const solved=await Submission.findOne({
            userId:req.result._id,
            problemId:challenge.problemId._id,
            status:'accepted',
            createdAt:{$gte:challenge.windowStart,$lt:challenge.windowEnd}
        });

        res.status(200).json({
            date:challenge.date,
            problem:problemSummary(challenge.problemId),
            windowStart:challenge.windowStart,
            windowEnd:challenge.windowEnd,
            wasSolvedByMeInWindow:!!solved
        });
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

module.exports={getTodayChallenge,getCalendar,getChallengeByDate};
