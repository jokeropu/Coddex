const cloudinary=require('cloudinary').v2;
const validator=require('validator');
const User=require('../models/user');
const notify=require('../utils/notify');

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

const generateAvatarUploadSignature=async(req,res)=>{
    try{
        const userId=req.result._id;
        const timestamp=Math.round(new Date().getTime()/1000);
        const publicId=`coddex-avatars/${userId}`;

        const uploadParams={
            timestamp,
            public_id:publicId,
            overwrite:true
        };

        const signature=cloudinary.utils.api_sign_request(uploadParams,process.env.CLOUDINARY_API_SECRET);

        res.json({
            signature,
            timestamp,
            public_id:publicId,
            overwrite:true,
            api_key:process.env.CLOUDINARY_API_KEY,
            cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
            upload_url:`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`
        });
    }
    catch(err){
        res.status(500).json({error:"Failed to generate upload credentials"});
    }
};

const isValidProfileLink=(url,hostFragment)=>{
    if(!url) return true;
    if(!validator.isURL(url,{protocols:['http','https'],require_protocol:true})) return false;
    return url.toLowerCase().includes(hostFragment);
};

const updateProfile=async(req,res)=>{
    try{
        const {githubUrl,linkedinUrl,cloudinaryPublicId,secureUrl}=req.body;
        const user=await User.findById(req.result._id);
        const changedFields=[];

        if(githubUrl!==undefined){
            if(!isValidProfileLink(githubUrl,'github.com')){
                throw new Error("Invalid GitHub URL");
            }
            if(user.githubUrl!==(githubUrl || null)) changedFields.push('GitHub link');
            user.githubUrl=githubUrl || null;
        }

        if(linkedinUrl!==undefined){
            if(!isValidProfileLink(linkedinUrl,'linkedin.com')){
                throw new Error("Invalid LinkedIn URL");
            }
            if(user.linkedinUrl!==(linkedinUrl || null)) changedFields.push('LinkedIn link');
            user.linkedinUrl=linkedinUrl || null;
        }

        if(secureUrl && cloudinaryPublicId){
            const cloudinaryResource=await cloudinary.api.resource(cloudinaryPublicId,{resource_type:'image'});
            if(!cloudinaryResource){
                throw new Error("Image not found in Cloudinary");
            }
            user.profilePicture=secureUrl;
            user.avatarPublicId=cloudinaryPublicId;
            changedFields.push('profile picture');
        }

        await user.save();

        if(changedFields.length>0){
            await notify(
                user._id,
                'profile_updated',
                'Profile updated',
                `You updated your ${changedFields.join(' and ')}.`,
                '/settings'
            );
        }

        res.status(200).json({
            message:"Profile updated successfully",
            user:{
                profilePicture:user.profilePicture,
                githubUrl:user.githubUrl,
                linkedinUrl:user.linkedinUrl
            }
        });
    }
    catch(err){
        res.status(400).send("Error: "+err.message);
    }
};

module.exports={generateAvatarUploadSignature,updateProfile};
