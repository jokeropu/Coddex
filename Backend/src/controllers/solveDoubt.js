const {GoogleGenAI}=require("@google/genai");
const Contest=require('../models/contest');
const getContestStatus=require('../utils/contestStatus');

const ai=new GoogleGenAI({apiKey:process.env.GEMINI_KEY});

const MAX_HISTORY_TURNS=12;
const MAX_CODE_CHARS=8000;

const formatTestCases=(testCases)=>{
    if(!Array.isArray(testCases) || testCases.length===0) return "(none provided)";

    return testCases.map((tc,i)=>
        `Example ${i+1}\n  Input: ${tc.input}\n  Expected output: ${tc.output}\n  Explanation: ${tc.explanation}`
    ).join('\n\n');
};

const formatStartCode=(startCode,language)=>{
    if(!Array.isArray(startCode) || startCode.length===0) return "(none provided)";

    const match=startCode.find(sc=>sc.language===language) || startCode[0];
    return `\`\`\`\n${match.initialCode}\n\`\`\``;
};

const formatUserCode=(userCode,language)=>{
    const trimmed=(userCode || '').trim();
    if(!trimmed) return "The user has not written any code yet, or has not shared it.";

    const clipped=trimmed.length>MAX_CODE_CHARS
        ? trimmed.slice(0,MAX_CODE_CHARS)+"\n/* ...truncated... */"
        : trimmed;

    return `This is what the user currently has in their editor (${language||'unknown language'}):\n\`\`\`\n${clipped}\n\`\`\``;
};

const buildSystemInstruction=({title,description,testCases,startCode,userCode,language})=>`
You are a Data Structures and Algorithms tutor embedded in the Coddex problem workspace. You help the user solve the one specific problem below.

# THE PROBLEM

Title: ${title}

Statement:
${description}

Examples:
${formatTestCases(testCases)}

Starter code:
${formatStartCode(startCode,language)}

# THE USER'S CURRENT CODE

${formatUserCode(userCode,language)}

# HOW TO ANSWER

Read what the user actually asked and answer that, at that level of depth. Do not deliver a full lecture when they asked a narrow question.

- Asked for a hint -> give exactly one next idea and stop. Do not include a full solution or complete code.
- Asked why their code fails -> quote the specific line(s) from their editor code above, name the concrete failing input, explain the bug, then show only the corrected lines. Do not repost the whole file unless the fix is structural.
- Asked for the solution or optimal approach -> one-paragraph approach, then the code, then a one-line complexity note.
- Asked about complexity -> just the analysis, with the reason it is that bound.

Default to short. Two or three tight paragraphs beats a wall of headings. Add a section heading only when the answer genuinely has more than one part.

# OUTPUT FORMAT

Your output is rendered as GitHub-flavored Markdown. Format accordingly:

- Every code block MUST be a fenced block with a language tag: \`\`\`cpp, \`\`\`java, \`\`\`javascript, \`\`\`python. Never emit an untagged fence, and never indent code instead of fencing it.
- Match the user's selected language (${language||'unspecified'}) unless they ask for another.
- Use \`inline code\` for variable names, function names, and literal values.
- Use \`###\` for section headings, never \`#\` or \`##\`.
- Use \`-\` for bullets. Keep each bullet to one line.
- Write complexity as inline code: \`O(n log n)\`.
- No emoji. No horizontal rules. Do not open with pleasantries or restate the question.

# SCOPE

Only discuss this problem and the DSA concepts it requires. If asked about anything else, reply in one sentence that you can only help with the current problem, and name one thing about it you could help with instead.
`;

const solveDoubt=async(req,res)=>{
    try
    {
        const {messages,title,description,testCases,startCode,userCode,language,contestId}=req.body;

        if(contestId){
            const contest=await Contest.findById(contestId).select('startTime endTime');
            if(contest && getContestStatus(contest)!=='ended'){
                return res.status(403).json({message:"AI chat is disabled for contest problems until the contest ends"});
            }
        }

        if(!Array.isArray(messages) || messages.length===0){
            return res.status(400).json({message:"No message to answer"});
        }

        const history=messages.slice(-MAX_HISTORY_TURNS);

        const stream=await ai.models.generateContentStream({
            model:"gemini-flash-latest",
            contents:history,
            config:{
                systemInstruction:buildSystemInstruction({title,description,testCases,startCode,userCode,language}),
                temperature:0.4,
                maxOutputTokens:1400,
                thinkingConfig:{thinkingBudget:0}
            }
        });

        res.writeHead(200,{
            'Content-Type':'text/event-stream',
            'Cache-Control':'no-cache, no-transform',
            'Connection':'keep-alive',
            'X-Accel-Buffering':'no'
        });

        for await(const chunk of stream){
            const text=chunk.text;
            if(text) res.write(`data: ${JSON.stringify({text})}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();
    }
    catch(err){
        console.error('AI chat error:',err);

        if(res.headersSent){
            res.write(`data: ${JSON.stringify({error:"The assistant stopped partway through."})}\n\n`);
            return res.end();
        }

        res.status(500).json({message:"The assistant is unavailable right now."});
    }
}

module.exports=solveDoubt;
