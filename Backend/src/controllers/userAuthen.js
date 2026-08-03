const User=require("../models/user");
const validate=require("../utils/validate");
const validator=require("validator");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");
const crypto=require("crypto");
const {OAuth2Client}=require("google-auth-library");
const Submission=require("../models/submission");
const redisClient=require("../config/redis");
const {effectiveStreakForDisplay}=require("../utils/dailyChallengeSelection");
const verifyTurnstileToken=require("../utils/verifyTurnstile");
const sendEmail=require("../utils/sendEmail");
const notify=require("../utils/notify");
const cloudinary=require('cloudinary').v2;

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

const googleClient=new OAuth2Client(process.env.OAUTH_CLIENT_ID);

const register=async(req,res)=>{
    try{
        const verification=await verifyTurnstileToken(req.body.turnstileToken,req.ip);
        if(!verification.success){
            return res.status(400).send("Error: Human Verification Failed");
        }

        validate(req.body);
        const {firstName,emailId,password}=req.body;
        req.body.password=await bcrypt.hash(password,10);
        req.body.role="user";

        const user=await User.create(req.body);

        const token=jwt.sign({_id:user._id,emailId:emailId,role:"user"},process.env.JWT_KEY,{expiresIn:3600});

        const reply={
            firstName:user.firstName,
            emailId:user.emailId,
            _id:user._id,
            role:user.role,
            isPremium:user.isPremium,
            credits:user.credits,
            dailyStreak:effectiveStreakForDisplay(user),
            profilePicture:user.profilePicture,
            githubUrl:user.githubUrl,
            linkedinUrl:user.linkedinUrl
        }

        res.cookie('token',token,{maxAge:3600*1000});
        res.status(201).json({
            user:reply,
            message:"User registered successfully"
        });
    }
    catch(err){
        res.status(400).send("Error: "+err);
    }
}

const login=async(req,res)=>{
    try{
        const {emailId,password,turnstileToken}=req.body;

        const verification=await verifyTurnstileToken(turnstileToken,req.ip);
        if(!verification.success){
            throw new Error("Human Verification Failed");
        }

        if(!emailId){
            throw new Error("Invalid Credentials");
        }
        if(!password){
            throw new Error("Invalid Credentials");
        }
        const user=await User.findOne({emailId:emailId.trim().toLowerCase()});
        if(!user){
            throw new Error("Invalid Credentials");
        }
        const match=await bcrypt.compare(password,user.password);

        if(!match){
            throw new Error("Invalid Credentials");
        }

        const reply={
            firstName:user.firstName,
            emailId:user.emailId,
            _id:user._id,
            role:user.role,
            isPremium:user.isPremium,
            credits:user.credits,
            dailyStreak:effectiveStreakForDisplay(user),
            profilePicture:user.profilePicture,
            githubUrl:user.githubUrl,
            linkedinUrl:user.linkedinUrl
        }

        const token=jwt.sign({_id:user._id,emailId:emailId,role:user.role},process.env.JWT_KEY,{expiresIn:3600});

        res.cookie('token',token,{maxAge:3600*1000});
        res.status(201).json({
            user:reply,
            message:"Logged In successfully"
        });
    }
    catch(err){
        res.status(401).send("Error: "+err.message);
    }
}

const googleAuth=async(req,res)=>{
    try{
        const {credential}=req.body;
        if(!credential){
            throw new Error("Missing Google credential");
        }

        const ticket=await googleClient.verifyIdToken({
            idToken:credential,
            audience:process.env.OAUTH_CLIENT_ID
        });
        const payload=ticket.getPayload();

        if(!payload.email_verified){
            throw new Error("Google email is not verified");
        }

        let user=await User.findOne({emailId:payload.email.trim().toLowerCase()});

        if(user){
            if(!user.googleId){
                user.googleId=payload.sub;
                await user.save();
            }
        }
        else{
            const randomPassword=await bcrypt.hash(crypto.randomBytes(32).toString('hex'),10);

            let firstName=payload.given_name || payload.name || 'User';
            if(firstName.length<3) firstName='User';

            const lastName=(payload.family_name && payload.family_name.length>=3) ? payload.family_name : undefined;

            user=await User.create({
                firstName,
                lastName,
                emailId:payload.email,
                password:randomPassword,
                googleId:payload.sub,
                role:'user'
            });
        }

        const token=jwt.sign({_id:user._id,emailId:user.emailId,role:user.role},process.env.JWT_KEY,{expiresIn:3600});

        const reply={
            firstName:user.firstName,
            emailId:user.emailId,
            _id:user._id,
            role:user.role,
            isPremium:user.isPremium,
            credits:user.credits,
            dailyStreak:effectiveStreakForDisplay(user),
            profilePicture:user.profilePicture,
            githubUrl:user.githubUrl,
            linkedinUrl:user.linkedinUrl
        }

        res.cookie('token',token,{maxAge:3600*1000});
        res.status(200).json({
            user:reply,
            message:"Logged in with Google successfully"
        });
    }
    catch(err){
        res.status(401).json({error:"Google authentication failed: "+err.message});
    }
}

const forgotPassword=async(req,res)=>{
    try{
        const {emailId}=req.body;
        if(!emailId){
            throw new Error("Email is required");
        }

        const user=await User.findOne({emailId:emailId.trim().toLowerCase()});

        if(user){
            const rawToken=crypto.randomBytes(32).toString('hex');
            const hashedToken=crypto.createHash('sha256').update(rawToken).digest('hex');

            user.resetPasswordToken=hashedToken;
            user.resetPasswordExpires=Date.now()+30*60*1000;
            await user.save();

            const clientUrl=(process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
            const resetLink=`${clientUrl}/reset-password/${rawToken}`;

            await sendEmail({
                to:user.emailId,
                subject:"Reset your Coddex password",
                html:`<p>You requested a password reset. This link expires in 30 minutes.</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`
            });
        }

        res.status(200).send("If that email is registered, a reset link has been sent.");
    }
    catch(err){
        res.status(400).send("Error: "+err.message);
    }
}

const resetPassword=async(req,res)=>{
    try{
        const {token}=req.params;
        const {password}=req.body;
        if(!validator.isStrongPassword(password)){
            throw new Error("Weak Password");
        }

        const hashedToken=crypto.createHash('sha256').update(token).digest('hex');

        const user=await User.findOne({
            resetPasswordToken:hashedToken,
            resetPasswordExpires:{$gt:Date.now()}
        });

        if(!user){
            throw new Error("Reset link is invalid or has expired");
        }

        user.password=await bcrypt.hash(password,10);
        user.resetPasswordToken=null;
        user.resetPasswordExpires=null;
        await user.save();

        await notify(user._id,'password_reset','Password reset successful','Your password was changed successfully. If this wasn\'t you, please contact support immediately.');

        res.status(200).send("Password has been reset successfully");
    }
    catch(err){
        res.status(400).send("Error: "+err.message);
    }
}

const logout=async(req,res)=>{
    try{
        const {token}=req.cookies;
        const payload=jwt.decode(token);
        await redisClient.set(`token:${token}`,'Blocked');
        await redisClient.expireAt(`token:${token}`,payload.exp);

        res.cookie("token",null,{expires:new Date(Date.now())});
        res.send("User logged out successfully");
    }
    catch(err){
        res.status(503).send("Error: "+err);
    }
}

const adminRegister=async(req,res)=>{
    try{
        validate(req.body);
        const {firstName,emailId,password}=req.body;
        req.body.password=await bcrypt.hash(password,10);

        const user=await User.create(req.body);

        const token=jwt.sign({_id:user._id,emailId:emailId,role:user.role},process.env.JWT_KEY,{expiresIn:3600});

        res.cookie('token',token,{maxAge:3600*1000});
        res.status(201).send("Admin registered successfully");
    }
    catch(err){
        res.status(400).send("Error: "+err);
    }
}

const deleteProfile=async(req,res)=>{
    try{
        const userId=req.result._id;
        const user=await User.findById(userId);

        if(user?.avatarPublicId){
            await cloudinary.uploader.destroy(user.avatarPublicId,{resource_type:'image'}).catch(()=>{});
        }

        await User.findByIdAndDelete(userId);

        res.status(200).send("User profile deleted successfully");
    }
    catch(err){
        res.status(500).send("Internal Server Error: "+err);
    }
}

module.exports={register,login,googleAuth,forgotPassword,resetPassword,logout,adminRegister,deleteProfile};
