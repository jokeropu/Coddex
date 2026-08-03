const Problem=require('../models/problem');
const Contest=require('../models/contest');
const ContestSubmission=require('../models/contestSubmission');
const ContestParticipation=require('../models/contestParticipation');
const getContestStatus=require('../utils/contestStatus');
const {computeProblemScore}=require('../utils/contestScoring');
const {getLanguageById,submitBatch,submitToken}=require('../utils/problemUtility');

const loadContestAndValidateProblem=async(contestId,problemId)=>{
    const contest=await Contest.findById(contestId);
    if(!contest){
        return {error:{status:404,message:"Contest not found"}};
    }
    const belongsToContest=contest.problems.some((p)=>p.problemId.toString()===problemId);
    if(!belongsToContest){
        return {error:{status:400,message:"This problem is not part of this contest"}};
    }
    return {contest};
};

const runJudge0=async(code,language,testcases)=>{
    const languageId=getLanguageById(language);
    const submissions=testcases.map((testcase)=>({
        source_code:code,
        language_id:languageId,
        stdin:testcase.input,
        expected_output:testcase.output
    }));
    const submitResult=await submitBatch(submissions);
    const resultToken=submitResult.map((value)=>value.token);
    return await submitToken(resultToken);
};

const submitContestSolution=async(req,res)=>{
    try{
        const userId=req.result._id;
        const {id:contestId,problemId}=req.params;
        let {code,language}=req.body;

        if(!code || !language){
            return res.status(400).json({error:"Missing Required Fields"});
        }
        if(language==="cpp"){
            language="c++";
        }

        const {contest,error}=await loadContestAndValidateProblem(contestId,problemId);
        if(error){
            return res.status(error.status).json({error:error.message});
        }

        if(contest.createdBy.toString()===userId.toString()){
            return res.status(403).json({error:"The contest creator cannot participate in their own contest"});
        }

        const status=getContestStatus(contest);
        if(status==='upcoming'){
            return res.status(403).json({error:"This contest has not started yet"});
        }

        const isVirtual=status==='ended';

        if(!isVirtual){
            const alreadyAccepted=await ContestSubmission.findOne({contestId,userId,problemId,isVirtual:false,status:'accepted'});
            if(alreadyAccepted){
                return res.status(400).json({error:"You have already solved this problem in this contest"});
            }
        }

        const problem=await Problem.findById(problemId);
        const testResult=await runJudge0(code,language,problem.hiddenTestCases);

        let testCasesPassed=0;
        let runtime=0;
        let memory=0;
        let submissionStatus='accepted';
        let errorMessage=null;

        for(const test of testResult){
            runtime+=parseFloat(test.time)||0;
            memory=Math.max(memory,test.memory||0);

            if(test.status.id===3){
                testCasesPassed++;
            }
            else if(submissionStatus==='accepted'){
                submissionStatus=test.status.id===4?'wrong-answer':'error';
                errorMessage=test.stderr||test.compile_output||test.status.description;
            }
        }

        const durationMs=new Date(contest.endTime).getTime()-new Date(contest.startTime).getTime();
        const submittedAtElapsedMs=Date.now()-new Date(contest.startTime).getTime();

        let pointsAwarded=0;

        if(!isVirtual){

            const participation=await ContestParticipation.findOneAndUpdate(
                {contestId,userId},
                {$setOnInsert:{contestId,userId,problemScores:[],totalScore:0}},
                {upsert:true,new:true}
            );

            if(submissionStatus==='accepted'){
                const wrongAttempts=await ContestSubmission.countDocuments({
                    contestId,userId,problemId,isVirtual:false,status:{$ne:'accepted'}
                });

                pointsAwarded=computeProblemScore(problem.difficulty,submittedAtElapsedMs,durationMs,wrongAttempts);

                const existingScoreIndex=participation.problemScores.findIndex((ps)=>ps.problemId.toString()===problemId);
                if(existingScoreIndex===-1){
                    participation.problemScores.push({
                        problemId,
                        score:pointsAwarded,
                        wrongAttempts,
                        acceptedAtElapsedMs:submittedAtElapsedMs
                    });
                }

                participation.totalScore=participation.problemScores.reduce((sum,ps)=>sum+ps.score,0);
                participation.lastAcceptedAtElapsedMs=submittedAtElapsedMs;
                await participation.save();
            }
        }

        await ContestSubmission.create({
            contestId,
            userId,
            problemId,
            code,
            language,
            status:submissionStatus,
            runtime,
            memory,
            errorMessage,
            testCasesPassed,
            testCasesTotal:problem.hiddenTestCases.length,
            isVirtual,
            submittedAtElapsedMs,
            pointsAwarded
        });

        res.status(201).json({
            accepted:submissionStatus==='accepted',
            passedTestCases:testCasesPassed,
            totalTestCases:problem.hiddenTestCases.length,
            runtime,
            memory,
            error:errorMessage,
            isVirtual,
            pointsAwarded
        });
    }
    catch(err){
        res.status(500).json({accepted:false,error:err.message});
    }
};

const runContestCode=async(req,res)=>{
    try{
        const userId=req.result._id;
        const {id:contestId,problemId}=req.params;
        let {code,language}=req.body;

        if(!code || !language){
            return res.status(400).json({error:"Missing Required Fields"});
        }
        if(language==="cpp"){
            language="c++";
        }

        const {contest,error}=await loadContestAndValidateProblem(contestId,problemId);
        if(error){
            return res.status(error.status).json({error:error.message});
        }

        const status=getContestStatus(contest);
        if(status==='upcoming'){
            return res.status(403).json({error:"This contest has not started yet"});
        }
        if(contest.createdBy.toString()===userId.toString()){
            return res.status(403).json({error:"The contest creator cannot participate in their own contest"});
        }

        const problem=await Problem.findById(problemId);
        const testResult=await runJudge0(code,language,problem.visibleTestCases);

        let runtime=0;
        let memory=0;
        let success=true;

        const testCases=problem.visibleTestCases.map((testcase,i)=>{
            const test=testResult[i];
            runtime+=parseFloat(test.time)||0;
            memory=Math.max(memory,test.memory||0);
            if(test.status.id!==3){
                success=false;
            }
            return {
                stdin:testcase.input,
                expected_output:testcase.output,
                stdout:test.stdout,
                status_id:test.status.id
            };
        });

        res.status(201).json({success,runtime,memory,testCases});
    }
    catch(err){
        res.status(500).json({success:false,error:err.message});
    }
};

module.exports={submitContestSolution,runContestCode};
