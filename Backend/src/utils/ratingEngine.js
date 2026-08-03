const {MIN_PARTICIPANTS_FOR_RATED}=require('../config/contestConfig');

const eloProbability=(Ri,Rj)=>1/(1+Math.pow(10,(Ri-Rj)/400));

const seed=(ratings,i,hypotheticalRi)=>{
    let s=1;
    for(let j=0;j<ratings.length;j++){
        if(j===i) continue;
        s+=eloProbability(hypotheticalRi,ratings[j]);
    }
    return s;
};

const computeRatingDeltas=(participants)=>{
    const n=participants.length;
    if(n<MIN_PARTICIPANTS_FOR_RATED){
        return participants.map(()=>0);
    }

    const ratings=participants.map((p)=>p.rating);
    const deltas=[];

    for(let i=0;i<n;i++){
        const seedI=seed(ratings,i,ratings[i]);
        const teff=Math.sqrt(seedI*participants[i].rank);

        let lo=-500,hi=5000;
        for(let iter=0;iter<100;iter++){
            const mid=(lo+hi)/2;
            const s=seed(ratings,i,mid);
            if(s<teff) hi=mid; else lo=mid;
        }
        const perf=(lo+hi)/2;
        deltas.push((perf-participants[i].rating)/2);
    }

    const mean=deltas.reduce((a,b)=>a+b,0)/deltas.length;
    return deltas.map((d)=>Math.round(d-mean));
};

module.exports={computeRatingDeltas};
