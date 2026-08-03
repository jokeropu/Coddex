const express=require('express');
const unlockRouter=express.Router();

const {unlockContent}=require('../controllers/unlockController');
const userMiddleware=require("../middleware/userMiddleware");

unlockRouter.post('/:problemId',userMiddleware,unlockContent);

module.exports=unlockRouter;
