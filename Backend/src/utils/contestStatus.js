const EDIT_LOCK_MS=60*60*1000;
const ENTRY_WINDOW_MS=30*60*1000;

const getContestStatus=(contest,now=new Date())=>{
    if(now<contest.startTime) return 'upcoming';
    if(now<contest.endTime) return 'live';
    return 'ended';
};

const isContestEditable=(contest,now=new Date())=>
    new Date(contest.startTime).getTime()-now.getTime()>EDIT_LOCK_MS;

const isContestEntryOpen=(contest,now=new Date())=>{
    const start=new Date(contest.startTime).getTime();
    const current=now.getTime();
    return current>=start && current<start+ENTRY_WINDOW_MS && current<new Date(contest.endTime).getTime();
};

module.exports=getContestStatus;
module.exports.isContestEditable=isContestEditable;
module.exports.isContestEntryOpen=isContestEntryOpen;
module.exports.EDIT_LOCK_MS=EDIT_LOCK_MS;
module.exports.ENTRY_WINDOW_MS=ENTRY_WINDOW_MS;
