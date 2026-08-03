const Problem=require('../models/problem');
const DailyChallenge=require('../models/dailyChallenge');
const {getUtcDayBounds,addUtcDays}=require('./dailyChallengeWindow');

const pickRandomEligibleProblem=async(matchStage)=>{
    const pool=await Problem.aggregate([
        {$match:matchStage},
        {$sample:{size:1}}
    ]);
    return pool[0]||null;
};

const selectDailyChallenge=async(now=new Date())=>{
    const {date,windowStart,windowEnd}=getUtcDayBounds(now);

    const existing=await DailyChallenge.findOne({date});
    if(existing) return existing;

    const recentlyFeatured=await DailyChallenge.find({
        date:{$gte:addUtcDays(date,-10),$lt:date}
    }).distinct('problemId');

    let chosen=await pickRandomEligibleProblem({
        visibleInProblemList:{$ne:false},
        _id:{$nin:recentlyFeatured}
    });

    if(!chosen){
        const yesterdayFeatured=await DailyChallenge.find({date:addUtcDays(date,-1)}).distinct('problemId');
        chosen=await pickRandomEligibleProblem({
            visibleInProblemList:{$ne:false},
            _id:{$nin:yesterdayFeatured}
        });
    }

    if(!chosen){
        chosen=await pickRandomEligibleProblem({
            visibleInProblemList:{$ne:false}
        });
    }

    if(!chosen){
        throw new Error('No eligible problems available to feature as a daily challenge');
    }

    try{
        return await DailyChallenge.findOneAndUpdate(
            {date},
            {$setOnInsert:{date,problemId:chosen._id,windowStart,windowEnd}},
            {upsert:true,returnDocument:'after'}
        );
    }
    catch(err){
        if(err.code===11000){
            return await DailyChallenge.findOne({date});
        }
        throw err;
    }
};

const effectiveStreakForDisplay=(user,now=new Date())=>{
    const {date:todayStr}=getUtcDayBounds(now);
    const yesterdayStr=addUtcDays(todayStr,-1);
    if(user.lastDailyCreditDate===todayStr || user.lastDailyCreditDate===yesterdayStr){
        return user.dailyStreak;
    }
    return 0;
};

const applyDailyChallengeCredit=(user,challenge,problemId,now)=>{
    const {date:todayStr}=getUtcDayBounds(now);

    if(String(challenge.problemId)!==String(problemId)) return null;
    if(now<challenge.windowStart || now>=challenge.windowEnd) return null;
    if(user.lastDailyCreditDate===todayStr) return null;

    const yesterdayStr=addUtcDays(todayStr,-1);
    user.dailyStreak=(user.lastDailyCreditDate===yesterdayStr) ? user.dailyStreak+1 : 1;

    const baseCredits=10;
    user.credits+=baseCredits;
    user.lastDailyCreditDate=todayStr;

    const streakReached=user.dailyStreak;
    const milestonesHit=[];

    if(streakReached%7===0){
        user.credits+=100;
        milestonesHit.push({days:7,credits:100});
    }
    if(streakReached%30===0){
        user.credits+=1000;
        milestonesHit.push({days:30,credits:1000});
    }
    if(streakReached===365){
        user.credits+=20000;
        milestonesHit.push({days:365,credits:20000});
        user.dailyStreak=0;
    }

    return {
        baseCredits,
        streakReached,
        milestonesHit
    };
};

module.exports={selectDailyChallenge,effectiveStreakForDisplay,applyDailyChallengeCredit};
