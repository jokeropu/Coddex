const Problem=require('../models/problem');
const User=require('../models/user');
const Submission=require('../models/submission');
const Contest=require('../models/contest');
const ContestParticipation=require('../models/contestParticipation');
const getContestStatus=require('../utils/contestStatus');

const DIFFICULTIES=['easy','medium','hard'];

const computeStreaks=(sortedDateStrings)=>{
    let maxStreak=0;
    let currentRun=0;
    let prevDate=null;

    for(const dateStr of sortedDateStrings){
        const date=new Date(dateStr+'T00:00:00.000Z');
        if(prevDate && (date-prevDate)===86400000){
            currentRun+=1;
        }
        else{
            currentRun=1;
        }
        maxStreak=Math.max(maxStreak,currentRun);
        prevDate=date;
    }

    return maxStreak;
};

const getProgress=async(req,res)=>{
    try{
        const userId=req.result._id;
        const user=await User.findById(userId).select('problemSolved');
        const isAdmin=req.result.role==='admin';

        const [difficultyTotals,solvedByDifficulty,contests,activityAgg,createdContests]=await Promise.all([
            Problem.aggregate([
                {$match:{visibleInProblemList:{$ne:false}}},
                {$group:{_id:'$difficulty',count:{$sum:1}}}
            ]),
            Problem.aggregate([
                {$match:{_id:{$in:user.problemSolved}}},
                {$group:{_id:'$difficulty',count:{$sum:1}}}
            ]),
            ContestParticipation.find({userId})
                .populate('contestId','title startTime endTime')
                .sort({createdAt:-1}),
            Submission.aggregate([
                {$match:{userId,createdAt:{$gte:new Date(Date.now()-365*24*60*60*1000)}}},
                {$group:{
                    _id:{$dateToString:{format:'%Y-%m-%d',date:'$createdAt',timezone:'UTC'}},
                    count:{$sum:1}
                }}
            ]),
            isAdmin ? Contest.find({createdBy:userId}).sort({startTime:-1}) : Promise.resolve([])
        ]);

        const difficulty={};
        for(const diff of DIFFICULTIES){
            const total=difficultyTotals.find((d)=>d._id===diff)?.count || 0;
            const solved=solvedByDifficulty.find((d)=>d._id===diff)?.count || 0;
            difficulty[diff]={solved,total};
        }

        const totalSolved=user.problemSolved.length;
        const totalProblems=difficultyTotals.reduce((sum,d)=>sum+d.count,0);

        const contestHistory=contests
            .filter((c)=>c.contestId)
            .map((c)=>({
                contestId:c.contestId._id,
                title:c.contestId.title,
                startTime:c.contestId.startTime,
                rank:c.rank,
                totalScore:c.totalScore,
                ratingBefore:c.ratingBefore,
                ratingAfter:c.ratingAfter,
                ratingDelta:c.ratingDelta
            }));

        const days={};
        activityAgg.forEach((a)=>{ days[a._id]=a.count; });
        const sortedDates=Object.keys(days).sort();
        const totalSubmissionsPastYear=activityAgg.reduce((sum,a)=>sum+a.count,0);

        let createdContestHistory=[];
        if(isAdmin && createdContests.length>0){
            const participantCounts=await ContestParticipation.aggregate([
                {$match:{contestId:{$in:createdContests.map((c)=>c._id)}}},
                {$group:{_id:'$contestId',count:{$sum:1}}}
            ]);
            const countByContest={};
            participantCounts.forEach((p)=>{ countByContest[p._id.toString()]=p.count; });

            createdContestHistory=createdContests.map((c)=>({
                contestId:c._id,
                title:c.title,
                startTime:c.startTime,
                endTime:c.endTime,
                status:getContestStatus(c),
                problemsPublished:c.problemsPublished,
                participantCount:countByContest[c._id.toString()] || 0
            }));
        }

        res.status(200).json({
            difficulty,
            totalSolved,
            totalProblems,
            contests:contestHistory,
            createdContests:createdContestHistory,
            activity:{
                totalSubmissionsPastYear,
                totalActiveDays:sortedDates.length,
                maxStreak:computeStreaks(sortedDates),
                days
            }
        });
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

module.exports={getProgress};
