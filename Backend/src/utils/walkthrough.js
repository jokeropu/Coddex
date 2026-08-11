const cloudinary=require('cloudinary').v2;
const SolutionVideo=require('../models/solutionVideo');

const discardWalkthrough=async(video)=>{
    if(!video) return;

    if(video.cloudinaryPublicId){
        await cloudinary.uploader
            .destroy(video.cloudinaryPublicId,{resource_type:'video',invalidate:true})
            .catch((err)=>console.error('Could not remove old Cloudinary asset:',err.message));
    }
    await video.deleteOne().catch((err)=>console.error('Could not remove old walkthrough:',err.message));
};

const attachYoutubeWalkthrough=async({problemId,userId,youtubeId,meta})=>{
    const previous=await SolutionVideo.findOne({problemId});

    const created=await SolutionVideo.create({
        problemId,
        userId,
        provider:'youtube',
        youtubeId,
        sourceUrl:meta.watchUrl,
        title:meta.title,
        author:meta.author,
        thumbnailUrl:meta.thumbnailUrl
    });

    await discardWalkthrough(previous);
    return created;
};

module.exports={discardWalkthrough,attachYoutubeWalkthrough};
