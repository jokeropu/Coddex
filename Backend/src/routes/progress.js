const express=require('express');
const progressRouter=express.Router();

const {getProgress}=require('../controllers/progressController');
const userMiddleware=require("../middleware/userMiddleware");

progressRouter.get('/',userMiddleware,getProgress);

module.exports=progressRouter;
