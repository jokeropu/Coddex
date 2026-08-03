const express=require('express');
const dailyChallengeRouter=express.Router();
const userMiddleware=require('../middleware/userMiddleware');
const {getTodayChallenge,getCalendar,getChallengeByDate}=require('../controllers/dailyChallengeController');

dailyChallengeRouter.get('/today',userMiddleware,getTodayChallenge);
dailyChallengeRouter.get('/calendar',userMiddleware,getCalendar);
dailyChallengeRouter.get('/:date',userMiddleware,getChallengeByDate);

module.exports=dailyChallengeRouter;
