const User=require('../models/user');
const Problem=require('../models/problem');
const Contest=require('../models/contest');
const SolutionVideo=require('../models/solutionVideo');
const UnlockedContent=require('../models/unlockedContent');
const getContestStatus=require('../utils/contestStatus');
const {VIDEO_UNLOCK_COST,EDITORIAL_UNLOCK_COST}=require('../config/unlockConfig');

const COST_BY_TYPE={
    video:VIDEO_UNLOCK_COST,
    editorial:EDITORIAL_UNLOCK_COST
};

const unlockContent=async(req,res)=>{
    try{
        const {problemId}=req.params;
        const {type}=req.body;

        if(!COST_BY_TYPE[type]){
            return res.status(400).json({error:"Invalid unlock type"});
        }

        const problem=await Problem.findById(problemId).select('_id contestId');
        if(!problem){
            return res.status(404).json({error:"Problem not found"});
        }

        if(problem.contestId){
            const contest=await Contest.findById(problem.contestId).select('startTime endTime');
            const status=contest?getContestStatus(contest):'ended';
            if(status!=='ended'){
                return res.status(403).json({error:"This problem's editorial can't be unlocked until its contest has ended"});
            }
        }

        if(type==='video'){
            const video=await SolutionVideo.findOne({problemId});
            if(!video){
                return res.status(400).json({error:"No video solution exists for this problem"});
            }
        }

        const existing=await UnlockedContent.findOne({userId:req.result._id,problemId,type});
        if(existing){
            return res.status(200).json({message:"Already unlocked",credits:req.result.credits});
        }

        const cost=COST_BY_TYPE[type];

        const debited=await User.findOneAndUpdate(
            {_id:req.result._id,credits:{$gte:cost}},
            {$inc:{credits:-cost}},
            {returnDocument:'after'}
        );

        if(!debited){
            return res.status(400).json({error:"Not enough credits"});
        }

        await UnlockedContent.findOneAndUpdate(
            {userId:req.result._id,problemId,type},
            {$setOnInsert:{userId:req.result._id,problemId,type}},
            {upsert:true}
        );

        res.status(200).json({message:"Unlocked successfully",credits:debited.credits});
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

module.exports={unlockContent};
