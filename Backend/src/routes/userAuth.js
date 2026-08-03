const express=require('express');
const authRouter=express.Router();

const {register,login,googleAuth,forgotPassword,resetPassword,logout,adminRegister,deleteProfile}=require('../controllers/userAuthen');
const {generateAvatarUploadSignature,updateProfile}=require('../controllers/userSettings');
const userMiddleware=require("../middleware/userMiddleware");
const adminMiddleware=require("../middleware/adminMiddleware");
const {effectiveStreakForDisplay}=require("../utils/dailyChallengeSelection");
const {runLazyNotificationChecks}=require("../utils/lazyNotificationChecks");

authRouter.post('/register',register);
authRouter.post('/login',login);
authRouter.post('/google',googleAuth);
authRouter.post('/forgotPassword',forgotPassword);
authRouter.post('/resetPassword/:token',resetPassword);
authRouter.post('/logout',userMiddleware,logout);
authRouter.post('/admin/register',adminMiddleware,adminRegister);
authRouter.get('/avatar/signature',userMiddleware,generateAvatarUploadSignature);
authRouter.patch('/profile',userMiddleware,updateProfile);
authRouter.delete('/deleteProfile',userMiddleware,deleteProfile);
authRouter.get('/check',userMiddleware,async(req,res)=>{

    await runLazyNotificationChecks(req.result);

    const reply={
        firstName:req.result.firstName,
        emailId:req.result.emailId,
        _id:req.result._id,
        role:req.result.role,
        isPremium:req.result.isPremium,
        credits:req.result.credits,
        dailyStreak:effectiveStreakForDisplay(req.result),
        profilePicture:req.result.profilePicture,
        githubUrl:req.result.githubUrl,
        linkedinUrl:req.result.linkedinUrl
    }

    res.status(200).json({
        user:reply,
        message:"Valid User"
    });
});

module.exports=authRouter;
