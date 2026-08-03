const express=require('express');
const discussionRouter=express.Router();

const {getDiscussion,createPost,createReply,toggleLike,deletePost}=require('../controllers/discussionController');
const userMiddleware=require("../middleware/userMiddleware");

discussionRouter.get('/:problemId',userMiddleware,getDiscussion);
discussionRouter.post('/:problemId',userMiddleware,createPost);
discussionRouter.post('/reply/:postId',userMiddleware,createReply);
discussionRouter.post('/like/:postId',userMiddleware,toggleLike);
discussionRouter.delete('/:postId',userMiddleware,deletePost);

module.exports=discussionRouter;
