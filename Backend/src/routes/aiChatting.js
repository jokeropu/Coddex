const express=require('express');

const aiRouter=express.Router();
const userMiddleware=require("../middleware/userMiddleware");
const {aiChatLimiter}=require("../middleware/rateLimiter");
const solveDoubt=require("../controllers/solveDoubt");

aiRouter.post('/chat',userMiddleware,aiChatLimiter,solveDoubt);

module.exports=aiRouter;