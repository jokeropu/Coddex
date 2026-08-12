const {getLanguageById,submitBatch,submitToken}=require('../utils/problemUtility');
const Problem=require('../models/problem');
const Contest=require('../models/contest');
const User=require('../models/user');
const SolutionVideo=require('../models/solutionVideo');
const getContestStatus=require('../utils/contestStatus');
const {isContestEditable,isContestEntryOpen}=require('../utils/contestStatus');
const ContestParticipation=require('../models/contestParticipation');
const {extractYoutubeId,fetchYoutubeMeta}=require('../utils/youtube');
const {discardWalkthrough,attachYoutubeWalkthrough}=require('../utils/walkthrough');
const notify=require('../utils/notify');

const CONTEST_CREATION_CREDITS=500;

const verifyReferenceSolutions=async(visibleTestCases,referenceSolution)=>{
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
                throw new Error(`Reference solution (${language}) failed on a test case: ${test.status.description}`);
            }
        }
    }
};

const publishContestProblemsIfEnded=async(contest)=>{
    const status=getContestStatus(contest);
    if(status==='ended' && !contest.problemsPublished){
        const claimed=await Contest.findOneAndUpdate(
            {_id:contest._id,problemsPublished:false},
            {$set:{problemsPublished:true}}
        );
        if(claimed){
            await Problem.updateMany(
                {contestId:contest._id,removedByAdmin:{$ne:true}},
                {$set:{visibleInProblemList:true}}
            );
        }
        contest.problemsPublished=true;
    }
    return status;
};

const createContest=async(req,res)=>{
    const {title,description,startTime,endTime,problems}=req.body;

    try{
        if(!title || !description || !startTime || !endTime){
            return res.status(400).json({error:"Missing required contest fields"});
        }
        if(new Date(endTime)<=new Date(startTime)){
            return res.status(400).json({error:"endTime must be after startTime"});
        }
        if(!Array.isArray(problems) || problems.length!==3){
            return res.status(400).json({error:"Exactly 3 problems (easy, medium, hard) are required"});
        }

        const difficulties=problems.map((p)=>p.difficulty).sort();
        if(JSON.stringify(difficulties)!==JSON.stringify(['easy','hard','medium'])){
            return res.status(400).json({error:"Problems must be exactly one easy, one medium, and one hard"});
        }

        const walkthroughs=[];
        for(const problem of problems){
            if(!problem.walkthroughUrl || !String(problem.walkthroughUrl).trim()){
                walkthroughs.push(null);
                continue;
            }

            const youtubeId=extractYoutubeId(problem.walkthroughUrl);
            if(!youtubeId){
                return res.status(400).json({error:`The walkthrough link for the ${problem.difficulty} problem is not a YouTube link.`});
            }

            try{
                walkthroughs.push({youtubeId,...await fetchYoutubeMeta(youtubeId)});
            }
            catch(err){
                return res.status(err.rejectedByYoutube?400:502).json({
                    error:`Walkthrough for the ${problem.difficulty} problem: ${err.message}`
                });
            }
        }

        for(const problem of problems){
            await verifyReferenceSolutions(problem.visibleTestCases,problem.referenceSolution);
        }

        const contest=await Contest.create({
            title,
            description,
            startTime,
            endTime,
            createdBy:req.result._id,
            problems:[]
        });

        const createdProblems=[];
        for(const [index,problem] of problems.entries()){
            const lastProblem=await Problem.findOne().sort({problemNumber:-1}).select('problemNumber');
            const problemNumber=lastProblem?.problemNumber ? lastProblem.problemNumber+1 : 1;

            const {walkthroughUrl,...problemFields}=problem;

            const createdProblem=await Problem.create({
                ...problemFields,
                problemNumber,
                problemCreator:req.result._id,
                contestId:contest._id,
                visibleInProblemList:false
            });

            const walkthrough=walkthroughs[index];
            if(walkthrough){
                await attachYoutubeWalkthrough({
                    problemId:createdProblem._id,
                    userId:req.result._id,
                    youtubeId:walkthrough.youtubeId,
                    meta:walkthrough
                });
            }

            createdProblems.push({problemId:createdProblem._id,difficulty:createdProblem.difficulty});
        }

        contest.problems=createdProblems;
        await contest.save();

        await User.updateOne({_id:req.result._id},{$inc:{credits:CONTEST_CREATION_CREDITS}});

        await notify(
            req.result._id,
            'contest_created',
            'Contest created successfully',
            `You created "${contest.title}" and earned +${CONTEST_CREATION_CREDITS} credits.`,
            `/contest/${contest._id}`
        );

        res.status(201).json({message:"Contest created successfully",contestId:contest._id});
    }
    catch(err){
        res.status(400).json({error:err.message});
    }
};

const getAllContests=async(req,res)=>{
    try{
        const contests=await Contest.find({}).select('title description startTime endTime createdBy problemsPublished').sort({startTime:1});

        for(const contest of contests){
            await publishContestProblemsIfEnded(contest);
        }

        const result=contests.map((contest)=>({
            _id:contest._id,
            title:contest.title,
            description:contest.description,
            startTime:contest.startTime,
            endTime:contest.endTime,
            status:getContestStatus(contest),
            isCreator:contest.createdBy.toString()===req.result._id.toString()
        }));

        res.status(200).json(result);
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

const getContestById=async(req,res)=>{
    const {id}=req.params;
    try{
        const contest=await Contest.findById(id).populate('problems.problemId','title problemNumber difficulty');
        if(!contest){
            return res.status(404).json({error:"Contest not found"});
        }

        const status=await publishContestProblemsIfEnded(contest);

        const response={
            _id:contest._id,
            title:contest.title,
            description:contest.description,
            startTime:contest.startTime,
            endTime:contest.endTime,
            status,
            isCreator:contest.createdBy.toString()===req.result._id.toString(),
            editable:isContestEditable(contest),
            entryOpen:isContestEntryOpen(contest),
            hasEntered:!!(await ContestParticipation.findOne({contestId:contest._id,userId:req.result._id}).select('_id'))
        };

        const isCreator=contest.createdBy.toString()===req.result._id.toString();

        if(status!=='upcoming' || isCreator){
            const problemIds=contest.problems.map(({problemId})=>problemId._id);
            const walkthroughs=isCreator
                ? await SolutionVideo.find({problemId:{$in:problemIds}})
                : [];
            const byProblem=new Map(walkthroughs.map((w)=>[w.problemId.toString(),w]));

            response.problems=contest.problems.map(({problemId,difficulty})=>{
                const entry={
                    _id:problemId._id,
                    title:problemId.title,
                    problemNumber:problemId.problemNumber,
                    difficulty
                };

                if(isCreator){
                    const walkthrough=byProblem.get(problemId._id.toString());
                    entry.walkthrough=walkthrough
                        ? {provider:walkthrough.provider,url:walkthrough.sourceUrl||null,title:walkthrough.title||null,author:walkthrough.author||null}
                        : null;
                }

                return entry;
            });
        }

        res.status(200).json(response);
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

const updateContest=async(req,res)=>{
    const {id}=req.params;
    const {title,description,startTime,endTime,walkthroughs}=req.body;

    try{
        const contest=await Contest.findById(id);
        if(!contest){
            return res.status(404).json({error:"Contest not found"});
        }
        if(contest.createdBy.toString()!==req.result._id.toString()){
            return res.status(403).json({error:"Only the contest creator can edit this contest"});
        }
        if(!isContestEditable(contest)){
            return res.status(400).json({error:"A contest can no longer be edited within an hour of it opening"});
        }

        const newStartTime=startTime?new Date(startTime):contest.startTime;
        const newEndTime=endTime?new Date(endTime):contest.endTime;
        if(newEndTime<=newStartTime){
            return res.status(400).json({error:"endTime must be after startTime"});
        }

        const contestProblemIds=new Set(contest.problems.map((p)=>p.problemId.toString()));
        const resolved=[];

        for(const entry of (Array.isArray(walkthroughs)?walkthroughs:[])){
            const problemId=String(entry?.problemId||'');
            if(!contestProblemIds.has(problemId)){
                return res.status(400).json({error:"A walkthrough was sent for a problem that is not in this contest."});
            }

            const url=String(entry?.url||'').trim();
            if(!url){
                resolved.push({problemId,clear:true});
                continue;
            }

            const youtubeId=extractYoutubeId(url);
            if(!youtubeId){
                return res.status(400).json({error:"A walkthrough link is not a YouTube link."});
            }

            try{
                resolved.push({problemId,youtubeId,meta:await fetchYoutubeMeta(youtubeId)});
            }
            catch(err){
                return res.status(err.rejectedByYoutube?400:502).json({error:err.message});
            }
        }

        if(title) contest.title=title;
        if(description) contest.description=description;
        contest.startTime=newStartTime;
        contest.endTime=newEndTime;
        await contest.save();

        for(const item of resolved){
            if(item.clear){
                await discardWalkthrough(await SolutionVideo.findOne({problemId:item.problemId}));
                continue;
            }

            await attachYoutubeWalkthrough({
                problemId:item.problemId,
                userId:req.result._id,
                youtubeId:item.youtubeId,
                meta:item.meta
            });
        }

        await notify(
            req.result._id,
            'contest_updated',
            'Contest updated successfully',
            `You updated "${contest.title}".`,
            `/contest/${contest._id}`
        );

        res.status(200).json({message:"Contest updated successfully"});
    }
    catch(err){
        res.status(400).json({error:err.message});
    }
};

const deleteContest=async(req,res)=>{
    const {id}=req.params;
    try{
        const contest=await Contest.findById(id);
        if(!contest){
            return res.status(404).json({error:"Contest not found"});
        }
        if(contest.createdBy.toString()!==req.result._id.toString()){
            return res.status(403).json({error:"Only the contest creator can delete this contest"});
        }
        if(getContestStatus(contest)!=='upcoming'){
            return res.status(400).json({error:"Only contests that have not started yet can be deleted"});
        }

        await Problem.deleteMany({contestId:id});
        await Contest.findByIdAndDelete(id);

        res.status(200).json({message:"Contest deleted successfully"});
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

module.exports={createContest,getAllContests,getContestById,updateContest,deleteContest,publishContestProblemsIfEnded};
