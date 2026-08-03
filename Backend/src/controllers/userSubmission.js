const Problem=require('../models/problem');
const Submission=require('../models/submission');
const User=require('../models/user');
const DailyChallenge=require('../models/dailyChallenge');
const {getLanguageById,submitBatch,submitToken}=require('../utils/problemUtility');
const {getUtcDayBounds}=require('../utils/dailyChallengeWindow');
const {applyDailyChallengeCredit}=require('../utils/dailyChallengeSelection');
const notify=require('../utils/notify');

const submitCode=async(req,res)=>{
    try{
        const requestReceivedAt=new Date();
        const userId=req.result._id;
        const problemId=req.params.id;

        let {code,language}=req.body;
        if(!code||!language||!problemId||!userId){
            return res.status(400).send("Missing Required Fields");
        }

        if(language==="cpp"){
            language="c++";
        }

        const problem=await Problem.findById(problemId);

        const submittedResult=await Submission.create({
            userId,
            problemId,
            code,
            language,
            status:'pending',
            testCasesTotal:problem.hiddenTestCases.length
        });

        const languageId=getLanguageById(language);

        const submissions=problem.hiddenTestCases.map((testcase)=>({
                source_code:code,
                language_id:languageId,
                stdin:testcase.input,
                expected_output:testcase.output
        }));

        const submitResult=await submitBatch(submissions);
        const resultToken=submitResult.map((value)=>value.token);
        const testResult=await submitToken(resultToken);

        let testCasesPassed=0;
        let runtime=0;
        let memory=0;
        let status='accepted';
        let errorMessage=null;

        for(const test of testResult){
            runtime+=parseFloat(test.time)||0;
            memory=Math.max(memory,test.memory||0);

            if(test.status.id===3){
                testCasesPassed++;
            }
            else if(status==='accepted'){
                status=test.status.id===4?'wrong-answer':'error';
                errorMessage=test.stderr||test.compile_output||test.status.description;
            }
        }

        submittedResult.status=status;
        submittedResult.testCasesPassed=testCasesPassed;
        submittedResult.errorMessage=errorMessage;
        submittedResult.runtime=runtime;
        submittedResult.memory=memory;
        
        await submittedResult.save();

        if(status==='accepted'){
            if(!req.result.problemSolved.includes(problemId)){
                req.result.problemSolved.push(problemId);
            }
            let dailyChallengeResult=null;
            try{
                const {date:todayStr}=getUtcDayBounds(requestReceivedAt);
                const challenge=await DailyChallenge.findOne({date:todayStr});
                if(challenge){
                    dailyChallengeResult=applyDailyChallengeCredit(req.result,challenge,problemId,requestReceivedAt);
                }
            }
            catch(creditErr){
                console.error('daily challenge credit error:',creditErr);
            }
            await req.result.save();

            if(dailyChallengeResult){
                await notify(
                    req.result._id,
                    'daily_challenge_solved',
                    'Daily Challenge solved!',
                    `You earned +${dailyChallengeResult.baseCredits} credits. Current streak: ${dailyChallengeResult.streakReached} day${dailyChallengeResult.streakReached!==1?'s':''}.`,
                    '/daily-challenge'
                );

                for(const m of dailyChallengeResult.milestonesHit){
                    await notify(
                        req.result._id,
                        'streak_milestone',
                        `🔥 ${m.days}-day streak!`,
                        `Amazing consistency! You earned a bonus of +${m.credits} credits for reaching a ${m.days}-day streak.`,
                        '/daily-challenge'
                    );
                }
            }
        }

        res.status(201).json({
            accepted:status==='accepted',
            passedTestCases:testCasesPassed,
            totalTestCases:submittedResult.testCasesTotal,
            runtime,
            memory,
            error:errorMessage
        });
    }
    catch(err){
        res.status(500).json({accepted:false,error:err.message});
    }
}

const runCode=async(req,res)=>{
    try{
        const userId=req.result._id;
        const problemId=req.params.id;

        let {code,language}=req.body;
        if(!code||!language||!problemId||!userId){
            return res.status(400).send("Missing Required Fields");
        }

        if(language==="cpp"){
            language="c++";
        }

        const problem=await Problem.findById(problemId);

        const languageId=getLanguageById(language);

        const submissions=problem.visibleTestCases.map((testcase)=>({
                source_code:code,
                language_id:languageId,
                stdin:testcase.input,
                expected_output:testcase.output
        }));

        const submitResult=await submitBatch(submissions);
        const resultToken=submitResult.map((value)=>value.token);
        const testResult=await submitToken(resultToken);

        let runtime=0;
        let memory=0;
        let success=true;

        const testCases=testResult.map((test,i)=>{
            runtime+=parseFloat(test.time)||0;
            memory=Math.max(memory,test.memory||0);
            if(test.status.id!==3){
                success=false;
            }
            return {
                stdin:submissions[i].stdin,
                expected_output:submissions[i].expected_output,
                stdout:test.stdout,
                status_id:test.status.id
            };
        });

        res.status(201).json({success,runtime,memory,testCases});
    }
    catch(err){
        res.status(500).json({success:false,error:err.message});
    }
}

module.exports={submitCode,runCode};