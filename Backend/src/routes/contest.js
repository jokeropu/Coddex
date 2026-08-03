const express=require('express');
const contestRouter=express.Router();
const adminMiddleware=require('../middleware/adminMiddleware');
const userMiddleware=require('../middleware/userMiddleware');
const {createContest,getAllContests,getContestById,updateContest,deleteContest}=require('../controllers/contestController');
const {submitContestSolution,runContestCode}=require('../controllers/contestSubmissionController');
const {getContestLeaderboard,getTopSubmissions,getRatingLeaderboard}=require('../controllers/contestLeaderboardController');

contestRouter.post('/create',adminMiddleware,createContest);
contestRouter.get('/rating-leaderboard',userMiddleware,getRatingLeaderboard);
contestRouter.get('/',userMiddleware,getAllContests);
contestRouter.get('/:id',userMiddleware,getContestById);
contestRouter.put('/:id',adminMiddleware,updateContest);
contestRouter.delete('/:id',adminMiddleware,deleteContest);
contestRouter.post('/:id/submit/:problemId',userMiddleware,submitContestSolution);
contestRouter.post('/:id/run/:problemId',userMiddleware,runContestCode);
contestRouter.get('/:id/leaderboard',userMiddleware,getContestLeaderboard);
contestRouter.get('/:id/problem/:problemId/topSubmissions',userMiddleware,getTopSubmissions);

module.exports=contestRouter;
