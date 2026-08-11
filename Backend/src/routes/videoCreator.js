const express=require('express');
const adminMiddleware=require("../middleware/adminMiddleware");
const videoRouter=express.Router();
const {listVideoProblemIds,generateUploadSignature,saveVideoMetadata,saveYoutubeVideo,deleteVideo}=require('../controllers/videoSection');

videoRouter.get('/list',adminMiddleware,listVideoProblemIds);
videoRouter.get('/create/:problemId',adminMiddleware,generateUploadSignature);
videoRouter.post('/save',adminMiddleware,saveVideoMetadata);
videoRouter.post('/youtube',adminMiddleware,saveYoutubeVideo);
videoRouter.delete('/delete/:problemId',adminMiddleware,deleteVideo);

module.exports=videoRouter;