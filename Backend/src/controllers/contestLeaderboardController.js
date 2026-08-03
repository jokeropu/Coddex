const Contest=require('../models/contest');
const ContestSubmission=require('../models/contestSubmission');
const ContestParticipation=require('../models/contestParticipation');
const User=require('../models/user');
const getContestStatus=require('../utils/contestStatus');
const {computeRatingDeltas}=require('../utils/ratingEngine');
const {MIN_PARTICIPANTS_FOR_RATED}=require('../config/contestConfig');
const notify=require('../utils/notify');

const totalWrongAttempts=(participation)=>
    participation.problemScores.reduce((sum,ps)=>sum+ps.wrongAttempts,0);

const creditsForRank=(rank)=>{
    if(rank>=1 && rank<=3) return 200;
    if(rank>=4 && rank<=10) return 100;
    if(rank>=11 && rank<=20) return 50;
    return 0;
};

const rankParticipants=(participations)=>{
    return [...participations].sort((a,b)=>{
        if(b.totalScore!==a.totalScore) return b.totalScore-a.totalScore;

        const aTime=a.lastAcceptedAtElapsedMs ?? Infinity;
        const bTime=b.lastAcceptedAtElapsedMs ?? Infinity;
        if(aTime!==bTime) return aTime-bTime;

        const aWrong=totalWrongAttempts(a);
        const bWrong=totalWrongAttempts(b);
        if(aWrong!==bWrong) return aWrong-bWrong;

        return a.userId.toString().localeCompare(b.userId.toString());
    });
};

const processContestRatings=async(contest)=>{
    const participations=await ContestParticipation.find({contestId:contest._id});
    const ranked=rankParticipants(participations);

    ranked.forEach((p,index)=>{ p.rank=index+1; });

    const users=await User.find({_id:{$in:ranked.map((p)=>p.userId)}}).select('_id contestRating');
    const ratingByUserId=new Map(users.map((u)=>[u._id.toString(),u.contestRating]));

    const participants=ranked.map((p)=>({
        rating:ratingByUserId.get(p.userId.toString()) ?? 500,
        rank:p.rank
    }));

    const deltas=computeRatingDeltas(participants);
    const wasRated=ranked.length>=MIN_PARTICIPANTS_FOR_RATED;

    for(let i=0;i<ranked.length;i++){
        const p=ranked[i];
        const ratingBefore=participants[i].rating;
        const ratingDelta=deltas[i];
        const ratingAfter=Math.max(0,ratingBefore+ratingDelta);

        p.ratingBefore=ratingBefore;
        p.ratingDelta=ratingDelta;
        p.ratingAfter=ratingAfter;
        await p.save();

        const creditsEarned=creditsForRank(p.rank);
        const update={$set:{contestRating:ratingAfter}};
        if(creditsEarned>0){
            update.$inc={credits:creditsEarned};
        }
        await User.updateOne({_id:p.userId},update);

        const ratingText=ratingDelta>=0 ? `+${ratingDelta}` : `${ratingDelta}`;
        const creditsText=creditsEarned>0 ? ` and +${creditsEarned} credits` : '';
        await notify(
            p.userId,
            'contest_result',
            `Contest results: ${contest.title}`,
            `You ranked #${p.rank} with ${p.totalScore} points. Rating: ${ratingText} (now ${ratingAfter})${creditsText}.`,
            `/contest/${contest._id}/leaderboard`
        );
    }

    contest.wasRated=wasRated;
    await contest.save();
};

const getContestLeaderboard=async(req,res)=>{
    const {id}=req.params;
    try{
        const contest=await Contest.findById(id);
        if(!contest){
            return res.status(404).json({error:"Contest not found"});
        }

        const status=getContestStatus(contest);
        if(status!=='ended'){
            return res.status(403).json({error:"Leaderboard is available after the contest ends"});
        }

        if(!contest.ratingsProcessed){
            const claimed=await Contest.findOneAndUpdate(
                {_id:id,ratingsProcessed:false},
                {$set:{ratingsProcessed:true}}
            );
            if(claimed){
                try{
                    await processContestRatings(contest);
                }
                catch(err){
                    await Contest.updateOne({_id:id},{$set:{ratingsProcessed:false}});
                    throw err;
                }
            }
        }

        const participations=await ContestParticipation.find({contestId:id})
            .populate('userId','firstName lastName')
            .sort({rank:1,totalScore:-1});

        const leaderboard=participations.map((p)=>({
            rank:p.rank,
            userId:p.userId._id,
            firstName:p.userId.firstName,
            lastName:p.userId.lastName,
            totalScore:p.totalScore,
            ratingBefore:p.ratingBefore,
            ratingAfter:p.ratingAfter,
            ratingDelta:p.ratingDelta
        }));

        res.status(200).json({wasRated:contest.wasRated,leaderboard});
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

const getTopSubmissions=async(req,res)=>{
    const {id:contestId,problemId}=req.params;
    try{
        const contest=await Contest.findById(contestId);
        if(!contest){
            return res.status(404).json({error:"Contest not found"});
        }

        const status=getContestStatus(contest);
        if(status!=='ended'){
            return res.status(403).json({error:"Top submissions are available after the contest ends"});
        }

        const hasParticipated=await ContestParticipation.findOne({contestId,userId:req.result._id});
        if(!hasParticipated){
            return res.status(403).json({error:"Only contest participants can view top submissions"});
        }

        const topSubmissions=await ContestSubmission.find({
            contestId,problemId,status:'accepted',isVirtual:false
        })
            .populate('userId','firstName lastName')
            .sort({pointsAwarded:-1,submittedAtElapsedMs:1})
            .limit(5);

        res.status(200).json(topSubmissions.map((s)=>({
            userId:s.userId._id,
            firstName:s.userId.firstName,
            lastName:s.userId.lastName,
            code:s.code,
            language:s.language,
            pointsAwarded:s.pointsAwarded,
            submittedAtElapsedMs:s.submittedAtElapsedMs
        })));
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

const getRatingLeaderboard=async(req,res)=>{
    try{
        const page=Math.max(parseInt(req.query.page)||1,1);
        const limit=10;
        const skip=(page-1)*limit;

        const [totalUsers,users]=await Promise.all([
            User.countDocuments({}),
            User.find({}).select('firstName lastName contestRating').sort({contestRating:-1}).skip(skip).limit(limit)
        ]);

        res.status(200).json({
            users,
            currentPage:page,
            totalPages:Math.ceil(totalUsers/limit),
            totalUsers
        });
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

module.exports={getContestLeaderboard,getTopSubmissions,getRatingLeaderboard};
