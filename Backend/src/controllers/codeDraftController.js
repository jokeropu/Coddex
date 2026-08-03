const CodeDraft=require('../models/codeDraft');

const getDrafts=async(req,res)=>{
    try{
        const {problemId}=req.params;
        const contestId=req.query.contestId || null;

        const drafts=await CodeDraft.find({
            userId:req.result._id,
            problemId,
            contestId
        }).select('language code');

        const result={};
        drafts.forEach((d)=>{ result[d.language]=d.code; });

        res.status(200).json(result);
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

const saveDraft=async(req,res)=>{
    try{
        const {problemId}=req.params;
        const {contestId,language,code}=req.body;

        if(!language){
            return res.status(400).json({error:"Language is required"});
        }

        await CodeDraft.findOneAndUpdate(
            {userId:req.result._id,problemId,contestId:contestId || null,language},
            {code:code || ''},
            {upsert:true}
        );

        res.status(200).json({message:"Draft saved"});
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

const bulkSaveDrafts=async(req,res)=>{
    try{
        const {drafts}=req.body;
        if(!Array.isArray(drafts) || drafts.length===0){
            return res.status(200).json({message:"No drafts to save",count:0});
        }

        const ops=drafts
            .filter((d)=>d && d.problemId && d.language)
            .map((d)=>({
                updateOne:{
                    filter:{
                        userId:req.result._id,
                        problemId:d.problemId,
                        contestId:d.contestId || null,
                        language:d.language
                    },
                    update:{code:d.code || ''},
                    upsert:true
                }
            }));

        if(ops.length>0){
            await CodeDraft.bulkWrite(ops);
        }

        res.status(200).json({message:"Drafts synced",count:ops.length});
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

const clearDraft=async(req,res)=>{
    try{
        const {problemId}=req.params;
        const contestId=req.query.contestId || null;
        const {language}=req.query;

        if(!language){
            return res.status(400).json({error:"Language is required"});
        }

        await CodeDraft.deleteOne({userId:req.result._id,problemId,contestId,language});

        res.status(200).json({message:"Draft cleared"});
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

module.exports={getDrafts,saveDraft,bulkSaveDrafts,clearDraft};
