const axios=require('axios');

const toBase64=(str)=>Buffer.from(str ?? '', 'utf-8').toString('base64');
const fromBase64=(str)=>str==null ? str : Buffer.from(str, 'base64').toString('utf-8');

const requestJudge0=async(options)=>{
    try{
        const response=await axios.request(options);
        return response.data;
    }
    catch(error){
        const detail=error.response?.data ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`Judge0 request failed: ${detail}`);
    }
}

const getLanguageById=(lang)=>{
    const language={
        "python":109,
        "c++":54,
        "c":50,
        "java":62,
        "javascript":63
    }
    return language[lang.toLowerCase()];
}

const submitBatch=async(submissions)=>{

    const encodedSubmissions=submissions.map((submission)=>({
        ...submission,
        source_code:toBase64(submission.source_code),
        stdin:toBase64(submission.stdin),
        expected_output:toBase64(submission.expected_output)
    }));

    const options={
        method:'POST',
        url:'https://judge0-ce.p.rapidapi.com/submissions/batch',
        params:{
            base64_encoded:'true'
        },
        headers:{
            'x-rapidapi-key':process.env.JUDGE0_KEY,
            'x-rapidapi-host':'judge0-ce.p.rapidapi.com',
            'Content-Type':'application/json'
        },
        data:{
            submissions:encodedSubmissions
        }
    };

    return await requestJudge0(options);
}

const waiting=(timer)=>{
    return new Promise((resolve)=>setTimeout(resolve,timer));
}

const submitToken=async(resulToken)=>{

    const options={
        method:'GET',
        url:'https://judge0-ce.p.rapidapi.com/submissions/batch',
        params:{
            tokens:resulToken.join(","),
            base64_encoded:'true',
            fields:'*'
        },
        headers:{
            'x-rapidapi-key':process.env.JUDGE0_KEY,
            'x-rapidapi-host':'judge0-ce.p.rapidapi.com',
            'Content-Type':'application/json'
        }
    };

    while(true){

        const result=await requestJudge0(options);
        const IsResultObtained=result.submissions.every((r)=>r.status_id>2);

        if(IsResultObtained){
            return result.submissions.map((submission)=>({
                ...submission,
                stdout:fromBase64(submission.stdout),
                stderr:fromBase64(submission.stderr),
                compile_output:fromBase64(submission.compile_output),
                message:fromBase64(submission.message)
            }));
        }
        await waiting(1000);
    }
}

module.exports={getLanguageById,submitBatch,submitToken};
