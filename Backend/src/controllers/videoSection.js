const cloudinary=require('cloudinary').v2
const axios=require('axios');

const Problem=require('../models/problem');
const User=require('../models/user');
const SolutionVideo=require('../models/solutionVideo');

const YOUTUBE_ID=/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

const extractYoutubeId=(url)=>{
    const trimmed=String(url||'').trim();
    const match=trimmed.match(YOUTUBE_ID);
    if(match) return match[1];
    return /^[A-Za-z0-9_-]{11}$/.test(trimmed) ? trimmed : null;
};

const discardVideo=async(video)=>{
    if(!video) return;

    if(video.cloudinaryPublicId){
        await cloudinary.uploader
            .destroy(video.cloudinaryPublicId,{resource_type:'video',invalidate:true})
            .catch((err)=>console.error('Could not remove old Cloudinary asset:',err.message));
    }
    await video.deleteOne().catch((err)=>console.error('Could not remove old walkthrough:',err.message));
};

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

const listVideoProblemIds=async(req,res)=>{
    try{
        const problemIds=await SolutionVideo.find({}).distinct('problemId');
        res.json(problemIds);
    }
    catch(err){
        console.error("Error listing video problem ids:",err);
        res.status(500).json({error:"Failed to list videos"});
    }
};

const generateUploadSignature=async(req,res)=>{
    try{
        const {problemId}=req.params;

        const userId=req.result._id;

        const problem=await Problem.findById(problemId);
        if(!problem){
            return res.status(404).json({error:"Problem not found"});
        }

        const timestamp=Math.round(new Date().getTime()/1000);
        const publicId=`coddex-solutions/${problemId}/${userId}_${timestamp}`;

        const uploadParams={
            timestamp:timestamp,
            public_id:publicId,
        };

        const signature=cloudinary.utils.api_sign_request(uploadParams,process.env.CLOUDINARY_API_SECRET);

        res.json({
            signature,
            timestamp,
            public_id:publicId,
            api_key:process.env.CLOUDINARY_API_KEY,
            cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
            upload_url:`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`,
        })
    }
    catch(err){
        console.error("Error generating upload signature:",err);
        res.status(500).json({error:"Failed to generate upload credentials"});
    }
};

const saveVideoMetadata=async(req,res)=>{
    try{
        const {problemId,cloudinaryPublicId,secureUrl,duration}=req.body;
        const userId=req.result._id;

        const cloudinaryResource=await cloudinary.api.resource(cloudinaryPublicId,{resource_type:'video'});

        if(!cloudinaryResource){
            return res.status(400).json({error:"Video not found in Cloudinary"});
        }

        const previous=await SolutionVideo.findOne({problemId});

        const thumbnailUrl=cloudinary.url(cloudinaryResource.public_id,{resource_type:'video',format:'jpg'});

        const videoSolution=await SolutionVideo.create({
            problemId,
            userId,
            provider:'cloudinary',
            cloudinaryPublicId,
            secureUrl,
            duration:cloudinaryResource.duration || duration,
            thumbnailUrl
        });

        await discardVideo(previous);

        res.status(201).json({
            message:"Video solution saved successfully",
            videoSolution:{
                id:videoSolution._id,
                thumbnailUrl:videoSolution.thumbnailUrl,
                duration:videoSolution.duration,
                uploadedAt:videoSolution.createdAt
            }
        });
    }
    catch(err){
        console.error("Error saving video metadata:",err);
        res.status(500).json({error:"Failed to save video metadata"});
    }
};

const saveYoutubeVideo=async(req,res)=>{
    try{
        const {problemId,url}=req.body;
        const userId=req.result._id;

        const problem=await Problem.findById(problemId);
        if(!problem){
            return res.status(404).json({error:"Problem not found"});
        }

        const youtubeId=extractYoutubeId(url);
        if(!youtubeId){
            return res.status(400).json({error:"That does not look like a YouTube link."});
        }

        const watchUrl=`https://www.youtube.com/watch?v=${youtubeId}`;

        let meta;
        try{
            const {data}=await axios.get('https://www.youtube.com/oembed',{
                params:{url:watchUrl,format:'json'},
                timeout:10000
            });
            meta=data;
        }
        catch(err){
            const status=err.response?.status;
            const rejectedByYoutube=status===400 || status===404;
            return res.status(rejectedByYoutube?400:502).json({
                error:rejectedByYoutube
                    ? "That video does not exist, is private, or its uploader has disabled embedding."
                    : "Could not reach YouTube to verify that link. Try again in a moment."
            });
        }

        const previous=await SolutionVideo.findOne({problemId});

        const videoSolution=await SolutionVideo.create({
            problemId,
            userId,
            provider:'youtube',
            youtubeId,
            sourceUrl:watchUrl,
            title:meta.title,
            author:meta.author_name,
            thumbnailUrl:meta.thumbnail_url
        });

        await discardVideo(previous);

        res.status(201).json({
            message:"YouTube walkthrough linked successfully",
            videoSolution:{
                id:videoSolution._id,
                provider:'youtube',
                youtubeId,
                title:videoSolution.title,
                author:videoSolution.author,
                thumbnailUrl:videoSolution.thumbnailUrl,
                uploadedAt:videoSolution.createdAt
            }
        });
    }
    catch(err){
        console.error("Error linking YouTube video:",err);
        res.status(500).json({error:"Failed to link that YouTube video"});
    }
};

const deleteVideo=async(req,res)=>{
    try{
        const {problemId}=req.params;
        const userId=req.result._id;

        const video=await SolutionVideo.findOneAndDelete({problemId:problemId});

        if(!video){
            return res.status(404).json({error:"Video not found"});
        }

        await cloudinary.uploader.destroy(video.cloudinaryPublicId,{resource_type:'video',invalidate:true});
        res.json({message:"Video deleted successfully"});
    }
    catch(err){
        console.error("Error deleting video:",err);
        res.status(500).json({error:"Failed to delete video"});
    }
};

module.exports={listVideoProblemIds,generateUploadSignature,saveVideoMetadata,saveYoutubeVideo,deleteVideo};
