const getContestStatus=(contest,now=new Date())=>{
    if(now<contest.startTime) return 'upcoming';
    if(now<contest.endTime) return 'live';
    return 'ended';
};

module.exports=getContestStatus;
