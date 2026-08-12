const {getLanguageById,submitBatch,submitToken}=require('../utils/problemUtility');

const Problem=require('../models/problem');
const User=require('../models/user');
const Submission=require('../models/submission');
const SolutionVideo=require('../models/solutionVideo');
const Contest=require('../models/contest');
const UnlockedContent=require('../models/unlockedContent');
const getContestStatus=require('../utils/contestStatus');
const {isContestEditable}=require('../utils/contestStatus');
const {VIDEO_UNLOCK_COST,EDITORIAL_UNLOCK_COST}=require('../config/unlockConfig');

const createProblem=async(req,res)=>{
    const {title,description,difficulty,tags,visibleTestCases,hiddenTestCases,startCode,referenceSolution,problemCreator}=req.body;

    try{
        for(const {language,completeCode} of referenceSolution){
            const languageId=getLanguageById(language);

            const submissions=visibleTestCases.map((testcase)=>({
                source_code:completeCode,
                language_id:languageId,
                stdin:testcase.input,
                expected_output:testcase.output
            }));

            const submitResult=await submitBatch(submissions);

            const resultToken=submitResult.map((value)=>value.token);

            const testResult=await submitToken(resultToken);

            for(const test of testResult){
                if(test.status.id!=3){
                    return res.status(400).json({error:`Reference solution (${language}) failed on a test case: ${test.status.description}`});
                }
            }
        }

        const lastProblem=await Problem.findOne().sort({problemNumber:-1}).select('problemNumber');
        const problemNumber=lastProblem?.problemNumber ? lastProblem.problemNumber+1 : 1;

        await Problem.create({
            ...req.body,
            problemNumber,
            problemCreator:req.result._id
        })

        res.status(201).send("Problem Created Successfully");
    }
    catch(err){
        res.status(400).json({error:err.message});
    }
}

const updateProblem=async(req,res)=>{
    const {id}=req.params;
    const {title,description,difficulty,tags,visibleTestCases,hiddenTestCases,startCode,referenceSolution,problemCreator}=req.body;

    try{
        if(!id){
            return res.status(400).send("Missing Problem Id");
        }

        const DsaProblem=await Problem.findById(id);
        if(!DsaProblem){
            return res.status(404).send("Problem ID is not present in DB");
        }

        if(DsaProblem.contestId){
            const contest=await Contest.findById(DsaProblem.contestId).select('startTime endTime createdBy');
            if(contest){
                if(contest.createdBy.toString()!==req.result._id.toString()){
                    return res.status(403).send("Only the contest creator can edit this contest's problems");
                }
                if(!isContestEditable(contest)){
                    return res.status(400).send("A contest problem can no longer be edited within an hour of the contest opening");
                }
            }
        }

        for(const {language,completeCode} of referenceSolution){
            const languageId=getLanguageById(language);

            const submissions=visibleTestCases.map((testcase)=>({
                source_code:completeCode,
                language_id:languageId,
                stdin:testcase.input,
                expected_output:testcase.output
            }));

            const submitResult=await submitBatch(submissions);

            const resultToken=submitResult.map((value)=>value.token);

            const testResult=await submitToken(resultToken);

            for(const test of testResult){
                if(test.status.id!=3){
                    return res.status(400).send("Error Occured");
                }
            }
        }

        const {problemNumber,...updateData}=req.body;
        const newProblem=await Problem.findByIdAndUpdate(id,updateData,{runValidators:true});
        res.status(200).send(newProblem);
    }
    catch(err){
        res.status(500).send(err.message || String(err));
    }
}

const deleteProblem=async(req,res)=>{
    const {id}=req.params;
    try{

        if(!id){
            return res.status(400).send("Missing Problem Id");
        }
        const problem=await Problem.findById(id).select('contestId');
        if(!problem){
            return res.status(404).send("Problem ID is not present in DB");
        }

        if(problem.contestId){
            await Problem.updateOne({_id:id},{$set:{removedByAdmin:true,visibleInProblemList:false}});
            return res.status(200).send("Problem removed from the problem list");
        }

        await Problem.deleteOne({_id:id});
        res.status(200).send("Problem Deleted Successfully");
    }
    catch(err){
        res.status(500).send(err.message || String(err));
    }
}

const getProblemById=async(req,res)=>{
    const {id}=req.params;
    try{

        if(!id){
            return res.status(400).send("Missing Problem Id");
        }
        const getProblem=await Problem.findById(id).select("_id problemNumber title description difficulty tags visibleTestCases startCode contestId hints referenceSolution");

        if(!getProblem){
            return res.status(404).send("Problem ID is not present in DB");
        }

        let contestEnded=true;
        if(getProblem.contestId){
            const contest=await Contest.findById(getProblem.contestId).select('startTime endTime');
            const status=contest?getContestStatus(contest):'ended';
            if(status==='upcoming'){
                return res.status(403).send("This problem is part of a contest that has not started yet");
            }
            contestEnded=status==='ended';
        }

        const responseData=getProblem.toObject();
        delete responseData.hints;
        delete responseData.referenceSolution;

        const unlocks=await UnlockedContent.find({userId:req.result._id,problemId:id}).select('type');
        const unlockedTypes=new Set(unlocks.map((u)=>u.type));
        const videoUnlocked=req.result.isPremium || unlockedTypes.has('video');
        const editorialUnlocked=req.result.isPremium || unlockedTypes.has('editorial');

        const videos=await SolutionVideo.findOne({problemId:id});
        if(videos && contestEnded){
            responseData.hasVideo=true;
            responseData.videoUnlocked=videoUnlocked;
            responseData.videoUnlockCost=VIDEO_UNLOCK_COST;
            if(videoUnlocked){
                responseData.videoProvider=videos.provider || 'cloudinary';
                responseData.secureUrl=videos.secureUrl;
                responseData.youtubeId=videos.youtubeId;
                responseData.videoTitle=videos.title;
                responseData.videoAuthor=videos.author;
                responseData.thumbnailUrl=videos.thumbnailUrl;
                responseData.duration=videos.duration;
            }
        }

        if(contestEnded){
            responseData.editorialUnlocked=editorialUnlocked;
            responseData.editorialUnlockCost=EDITORIAL_UNLOCK_COST;
            if(editorialUnlocked){
                responseData.hints=getProblem.hints;
                responseData.referenceSolution=getProblem.referenceSolution;
            }
        }

        return res.status(200).send(responseData);
    }
    catch(err){
        res.status(500).send(err.message || String(err));
    }
}

const getProblemByIdAdmin=async(req,res)=>{
    const {id}=req.params;
    try{

        if(!id){
            return res.status(400).send("Missing Problem Id");
        }
        const getProblem=await Problem.findById(id);

        if(!getProblem){
            return res.status(404).send("Problem ID is not present in DB");
        }

        res.status(200).send(getProblem);
    }
    catch(err){
        res.status(500).send(err.message || String(err));
    }
}

const getAllProblem=async(req,res)=>{

    try{
        const {page}=req.query;

        if(!page){
            const getProblem=await Problem.find({visibleInProblemList:{$ne:false}}).select("_id title difficulty tags problemNumber").sort({problemNumber:1});
            return res.status(200).send(getProblem);
        }

        const {difficulty,tags,status,search,sort,order}=req.query;

        const SORTABLE={number:'problemNumber',title:'title'};
        const sortKey=SORTABLE[sort]||'problemNumber';
        const sortDir=order==='desc'?-1:1;
        const sortSpec=sortKey==='problemNumber'
            ?{problemNumber:sortDir}
            :{[sortKey]:sortDir,problemNumber:1};

        const filter={visibleInProblemList:{$ne:false}};
        if(difficulty && difficulty!=='all'){
            filter.difficulty=difficulty;
        }
        if(tags && tags!=='all'){
            filter.tags=tags;
        }
        if(search && search.trim()){
            const escapedSearch=search.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
            filter.title={$regex:escapedSearch,$options:'i'};
        }
        if(status==='solved'){
            filter._id={$in:req.result.problemSolved};
        }
        else if(status==='unsolved'){
            filter._id={$nin:req.result.problemSolved};
        }

        const limit=10;
        const pageNum=Math.max(parseInt(page)||1,1);
        const skip=(pageNum-1)*limit;

        const [filteredTotal,grandTotal]=await Promise.all([
            Problem.countDocuments(filter),
            Problem.countDocuments({visibleInProblemList:{$ne:false}})
        ]);

        if(filteredTotal===0){
            return res.status(200).json({
                problems:[],
                currentPage:pageNum,
                totalPages:0,
                totalProblems:0,
                grandTotal
            });
        }

        const getProblem=await Problem.find(filter).select("_id title difficulty tags problemNumber").sort(sortSpec).collation({locale:'en',strength:1}).skip(skip).limit(limit);

        res.status(200).json({
            problems:getProblem,
            currentPage:pageNum,
            totalPages:Math.ceil(filteredTotal/limit),
            totalProblems:filteredTotal,
            grandTotal
        });
    }
    catch(err){
        res.status(500).send(err.message || String(err));
    }
}

const solvedAllProblembyUser=async(req,res)=>{
    try{
        const userId=req.result._id;
        const user=await User.findById(userId).populate({
            path:"problemSolved",
            select:"_id title difficulty tags"
        });

        res.status(200).send(user.problemSolved);
    }
    catch(err){
        res.status(500).send(err.message || String(err));
    }
}

const submittedProblem=async(req,res)=>{
    try{
        const userId=req.result._id;
        const problemId=req.params.pid;

        const ans=await Submission.find({userId,problemId});

        res.status(200).send(ans);
    }
    catch(err){
        res.status(500).send(err.message || String(err));
    }
}

const getCategoryCounts=async(req,res)=>{
    try{
        const visibilityFilter={visibleInProblemList:{$ne:false}};

        const [difficultyCounts,tagCounts]=await Promise.all([
            Problem.aggregate([
                {$match:visibilityFilter},
                {$group:{_id:'$difficulty',count:{$sum:1}}}
            ]),
            Problem.aggregate([
                {$match:visibilityFilter},
                {$group:{_id:'$tags',count:{$sum:1}}}
            ])
        ]);

        const difficulty={};
        difficultyCounts.forEach((d)=>{difficulty[d._id]=d.count;});

        const tags={};
        tagCounts.forEach((t)=>{tags[t._id]=t.count;});

        res.status(200).json({difficulty,tags});
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
}

module.exports={createProblem,updateProblem,deleteProblem,getProblemById,getProblemByIdAdmin,getAllProblem,solvedAllProblembyUser,submittedProblem,getCategoryCounts};
