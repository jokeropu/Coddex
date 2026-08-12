const EDIT_LOCK_MS=60*60*1000;

const getContestStatus=(contest,now=new Date())=>{
    if(now<contest.startTime) return 'upcoming';
    if(now<contest.endTime) return 'live';
    return 'ended';
};

const isContestEditable=(contest,now=new Date())=>
    new Date(contest.startTime).getTime()-now.getTime()>EDIT_LOCK_MS;

module.exports=getContestStatus;
module.exports.isContestEditable=isContestEditable;
module.exports.EDIT_LOCK_MS=EDIT_LOCK_MS;
