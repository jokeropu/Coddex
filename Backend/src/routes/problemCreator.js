const express=require('express');
const problemRouter=express.Router();
const adminMiddleware=require("../middleware/adminMiddleware");
const {createProblem,updateProblem,deleteProblem,getProblemById,getProblemByIdAdmin,getAllProblem,solvedAllProblembyUser,submittedProblem,getCategoryCounts}=require('../controllers/userProblem');
const userMiddleware=require('../middleware/userMiddleware');

problemRouter.post('/create',adminMiddleware,createProblem);
problemRouter.put('/update/:id',adminMiddleware,updateProblem);
problemRouter.delete('/delete/:id',adminMiddleware,deleteProblem);

problemRouter.get('/problemById/:id',userMiddleware,getProblemById);
problemRouter.get('/adminProblemById/:id',adminMiddleware,getProblemByIdAdmin);
problemRouter.get('/getAllProblem',userMiddleware,getAllProblem);
problemRouter.get('/categoryCounts',userMiddleware,getCategoryCounts);
problemRouter.get('/problemSolvedByUser',userMiddleware,solvedAllProblembyUser);
problemRouter.get('/submittedProblem/:pid',userMiddleware,submittedProblem);

module.exports=problemRouter;