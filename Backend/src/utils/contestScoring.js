const {MAX_SCORE,FLOOR_PERCENTAGE,PENALTY_PER_WRONG_SUBMISSION}=require('../config/contestConfig');

const computeProblemScore=(difficulty,submittedAtElapsedMs,durationMs,wrongAttempts)=>{
    const maxScore=MAX_SCORE[difficulty];
    const floorScore=maxScore*FLOOR_PERCENTAGE;

    const t=Math.max(0,Math.min(submittedAtElapsedMs,durationMs));
    const rawScore=Math.max(floorScore,maxScore-(maxScore-floorScore)*(t/durationMs));

    const finalScore=Math.max(0,rawScore-PENALTY_PER_WRONG_SUBMISSION*wrongAttempts);
    return Math.round(finalScore);
};

module.exports={computeProblemScore};
