const Contest=require('../models/contest');
const Notification=require('../models/notification');
const notify=require('./notify');
const {getUtcDayBounds,addUtcDays}=require('./dailyChallengeWindow');
const {effectiveStreakForDisplay}=require('./dailyChallengeSelection');

const CONTEST_REMINDER_WINDOW_MS=60*60*1000;
const STREAK_AT_RISK_THRESHOLD_MS=4*60*60*1000;

const checkUpcomingContestReminders=async(user,now)=>{
    const soon=new Date(now.getTime()+CONTEST_REMINDER_WINDOW_MS);
    const contests=await Contest.find({
        startTime:{$gte:now,$lte:soon}
    }).select('_id title startTime');

    for(const contest of contests){
        const link=`/contest/${contest._id}`;
        const alreadyNotified=await Notification.findOne({
            userId:user._id,
            type:'contest_reminder',
            link
        });
        if(alreadyNotified) continue;

        const minutesUntil=Math.max(1,Math.round((contest.startTime.getTime()-now.getTime())/60000));
        await notify(
            user._id,
            'contest_reminder',
            `Upcoming: ${contest.title}`,
            `This contest starts in about ${minutesUntil} minute${minutesUntil!==1?'s':''}. Don't miss it!`,
            link
        );
    }
};

const checkStreakAtRisk=async(user,now)=>{
    const {date:todayStr,windowEnd}=getUtcDayBounds(now);
    const yesterdayStr=addUtcDays(todayStr,-1);

    const hasActiveStreak=user.dailyStreak>0 && user.lastDailyCreditDate===yesterdayStr;
    const alreadySolvedToday=user.lastDailyCreditDate===todayStr;
    const timeRemainingMs=windowEnd.getTime()-now.getTime();

    if(!hasActiveStreak || alreadySolvedToday) return;
    if(timeRemainingMs>STREAK_AT_RISK_THRESHOLD_MS || timeRemainingMs<=0) return;

    const link='/daily-challenge';
    const alreadyNotifiedToday=await Notification.findOne({
        userId:user._id,
        type:'streak_at_risk',
        createdAt:{$gte:new Date(now.getTime()-24*60*60*1000)}
    });
    if(alreadyNotifiedToday) return;

    const hoursLeft=Math.max(1,Math.round(timeRemainingMs/(60*60*1000)));
    await notify(
        user._id,
        'streak_at_risk',
        'Your streak is about to break!',
        `You have about ${hoursLeft} hour${hoursLeft!==1?'s':''} left to solve today's Daily Challenge and keep your ${user.dailyStreak}-day streak alive.`,
        link
    );
};

const checkStreakBroken=async(user,now)=>{
    const effectiveStreak=effectiveStreakForDisplay(user,now);
    if(effectiveStreak>0 || user.dailyStreak<=0) return;

    const brokenStreakLength=user.dailyStreak;
    user.dailyStreak=0;
    await user.save();

    await notify(
        user._id,
        'streak_broken',
        'Your streak has ended',
        `Your ${brokenStreakLength}-day Daily Challenge streak was broken. Solve today's challenge to start a new one!`,
        '/daily-challenge'
    );
};

const runLazyNotificationChecks=async(user,now=new Date())=>{
    try{
        await checkStreakBroken(user,now);
        await checkStreakAtRisk(user,now);
        await checkUpcomingContestReminders(user,now);
    }
    catch(err){
        console.error('Lazy notification check failed:',err.message);
    }
};

module.exports={runLazyNotificationChecks};
