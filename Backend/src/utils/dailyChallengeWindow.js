const pad=(n)=>String(n).padStart(2,'0');

const formatUtcDate=(date)=>`${date.getUTCFullYear()}-${pad(date.getUTCMonth()+1)}-${pad(date.getUTCDate())}`;

const getUtcDayBounds=(now=new Date())=>{
    const windowStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
    const windowEnd=new Date(windowStart.getTime()+24*60*60*1000);
    return {date:formatUtcDate(windowStart),windowStart,windowEnd};
};

const addUtcDays=(dateStr,delta)=>{
    const [y,m,d]=dateStr.split('-').map(Number);
    return formatUtcDate(new Date(Date.UTC(y,m-1,d+delta)));
};

module.exports={getUtcDayBounds,addUtcDays,formatUtcDate};
