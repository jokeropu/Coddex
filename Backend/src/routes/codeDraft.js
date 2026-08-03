const express=require('express');
const codeDraftRouter=express.Router();

const {getDrafts,saveDraft,bulkSaveDrafts,clearDraft}=require('../controllers/codeDraftController');
const userMiddleware=require("../middleware/userMiddleware");

codeDraftRouter.post('/bulk',userMiddleware,bulkSaveDrafts);
codeDraftRouter.get('/:problemId',userMiddleware,getDrafts);
codeDraftRouter.post('/:problemId',userMiddleware,saveDraft);
codeDraftRouter.delete('/:problemId',userMiddleware,clearDraft);

module.exports=codeDraftRouter;
