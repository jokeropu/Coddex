const DiscussionPost=require('../models/discussionPost');
const Problem=require('../models/problem');
const Contest=require('../models/contest');
const getContestStatus=require('../utils/contestStatus');

const assertDiscussionAllowed=async(problemId)=>{
    const problem=await Problem.findById(problemId).select('contestId');
    if(!problem){
        const err=new Error("Problem not found");
        err.statusCode=404;
        throw err;
    }

    if(problem.contestId){
        const contest=await Contest.findById(problem.contestId).select('startTime endTime');
        const status=contest?getContestStatus(contest):'ended';
        if(status!=='ended'){
            const err=new Error("Discussion is not available for problems that are part of an ongoing or upcoming contest");
            err.statusCode=403;
            throw err;
        }
    }

    return problem;
};

const formatPost=(post,userId)=>({
    _id:post._id,
    problemId:post.problemId,
    parentId:post.parentId,
    title:post.title,
    content:post.content,
    code:post.code,
    language:post.language,
    likeCount:post.likes.length,
    likedByMe:post.likes.some((id)=>id.toString()===userId.toString()),
    author:post.userId?{
        _id:post.userId._id,
        firstName:post.userId.firstName,
        role:post.userId.role
    }:null,
    createdAt:post.createdAt
});

const getDiscussion=async(req,res)=>{
    try{
        const {problemId}=req.params;
        await assertDiscussionAllowed(problemId);

        const posts=await DiscussionPost.find({problemId})
            .populate('userId','firstName role')
            .sort({createdAt:-1});

        const userId=req.result._id;
        const formatted=posts.map((p)=>formatPost(p,userId));

        const topLevel=formatted.filter((p)=>!p.parentId);
        topLevel.sort((a,b)=>b.likeCount-a.likeCount || new Date(b.createdAt)-new Date(a.createdAt));

        const repliesByParent={};
        formatted.filter((p)=>p.parentId).forEach((reply)=>{
            const key=reply.parentId.toString();
            if(!repliesByParent[key]) repliesByParent[key]=[];
            repliesByParent[key].push(reply);
        });

        const result=topLevel.map((post)=>({
            ...post,
            replies:(repliesByParent[post._id.toString()]||[]).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))
        }));

        res.status(200).json(result);
    }
    catch(err){
        res.status(err.statusCode||500).json({error:err.message});
    }
};

const createPost=async(req,res)=>{
    try{
        const {problemId}=req.params;
        await assertDiscussionAllowed(problemId);

        const {title,content,code,language}=req.body;
        if(!content || !content.trim()){
            return res.status(400).json({error:"Content is required"});
        }

        const post=await DiscussionPost.create({
            problemId,
            userId:req.result._id,
            title:title?.trim() || null,
            content:content.trim(),
            code:code?.trim() || null,
            language:language || null
        });

        const populated=await post.populate('userId','firstName role');

        res.status(201).json({...formatPost(populated,req.result._id),replies:[]});
    }
    catch(err){
        res.status(err.statusCode||500).json({error:err.message});
    }
};

const createReply=async(req,res)=>{
    try{
        const {postId}=req.params;
        const parent=await DiscussionPost.findById(postId);
        if(!parent){
            return res.status(404).json({error:"Post not found"});
        }
        if(parent.parentId){
            return res.status(400).json({error:"Cannot reply to a reply"});
        }

        await assertDiscussionAllowed(parent.problemId);

        const {content,code,language}=req.body;
        if(!content || !content.trim()){
            return res.status(400).json({error:"Content is required"});
        }

        const reply=await DiscussionPost.create({
            problemId:parent.problemId,
            userId:req.result._id,
            parentId:parent._id,
            content:content.trim(),
            code:code?.trim() || null,
            language:language || null
        });

        const populated=await reply.populate('userId','firstName role');

        res.status(201).json(formatPost(populated,req.result._id));
    }
    catch(err){
        res.status(err.statusCode||500).json({error:err.message});
    }
};

const toggleLike=async(req,res)=>{
    try{
        const {postId}=req.params;
        const post=await DiscussionPost.findById(postId);
        if(!post){
            return res.status(404).json({error:"Post not found"});
        }

        const userId=req.result._id;
        const alreadyLiked=post.likes.some((id)=>id.toString()===userId.toString());

        if(alreadyLiked){
            post.likes=post.likes.filter((id)=>id.toString()!==userId.toString());
        }
        else{
            post.likes.push(userId);
        }

        await post.save();

        res.status(200).json({likeCount:post.likes.length,likedByMe:!alreadyLiked});
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

const deletePost=async(req,res)=>{
    try{
        const {postId}=req.params;
        const post=await DiscussionPost.findById(postId);
        if(!post){
            return res.status(404).json({error:"Post not found"});
        }

        const isAuthor=post.userId.toString()===req.result._id.toString();
        const isAdmin=req.result.role==='admin';
        if(!isAuthor && !isAdmin){
            return res.status(403).json({error:"You can only delete your own posts"});
        }

        if(!post.parentId){
            await DiscussionPost.deleteMany({parentId:post._id});
        }
        await post.deleteOne();

        res.status(200).json({message:"Post deleted successfully"});
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
};

module.exports={getDiscussion,createPost,createReply,toggleLike,deletePost};
