const express=require("express");
const submitRouter=express.Router();
const userMiddleware=require("../middleware/userMiddleware");
const {runLimiter,submitLimiter}=require("../middleware/rateLimiter");
const {submitCode,runCode}=require("../controllers/userSubmission");

submitRouter.post('/submit/:id',userMiddleware,submitLimiter,submitCode);
submitRouter.post('/run/:id',userMiddleware,runLimiter,runCode);

module.exports=submitRouter;