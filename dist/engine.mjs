// All calculations are local. No external card/game services are contacted.
export const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
export const SUITS = ['♠','♥','♦','♣'];
export const CATEGORIES = ['High card','One pair','Two pair','Three of a kind','Straight','Flush','Full house','Four of a kind','Straight flush'];
export const DEFAULT_RULES = { decks:6, h17:false, das:true, surrender:true, payout:1.5, mode:'shoe' };
export function rng(seed=Date.now()) { let a=seed>>>0; return ()=>{ a+=0x6D2B79F5; let t=a; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }
export function shuffledDeck(decks=1, random=Math.random) { const a=Array.from({length:52*decks},(_,i)=>i%52); for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
export const cardRank = c => c%13;
export const cardLabel = c => RANKS[c%13]+SUITS[Math.floor(c/13)];
export const value = r => r===0?11:Math.min(r+1,10);
export const hilo = r => r>=1&&r<=5?1:r===0||r>=9?-1:0;
export function handValue(ranks){let total=0,aces=0;for(const r of ranks){total+=value(r);if(r===0)aces++;}while(total>21&&aces){total-=10;aces--;}return {total,soft:aces>0,natural:ranks.length===2&&total===21,bust:total>21};}
export function remainingCounts(decks, observed=[]){const counts=Array(13).fill(decks*4);for(const r of observed){if(!Number.isInteger(r)||r<0||r>12||--counts[r]<0)throw new Error('More cards entered than this shoe contains. Undo a card or start a new shoe.');}return counts;}
export function shoeStats(decks, observed=[]){const counts=remainingCounts(decks,observed),left=counts.reduce((a,b)=>a+b,0),rc=observed.reduce((a,r)=>a+hilo(r),0);return {counts,left,seen:observed.length,running:rc,trueCount:left?rc/(left/52):0,penetration:observed.length/(decks*52),high:left?(counts[0]+counts.slice(9).reduce((a,b)=>a+b,0))/left:0};}
export function bustProbability(hand,counts){const n=counts.reduce((a,b)=>a+b,0);if(!n)return 0;return counts.reduce((a,c,r)=>a+(handValue([...hand,r]).bust?c:0),0)/n;}
// Multi-deck, US hole card / peek; doubles on any initial two, max four split hands.
export function basicStrategy(hand,up,rules=DEFAULT_RULES,opts={}){
 const {total:t,soft,natural,bust}=handValue(hand),d=value(up),two=hand.length===2,canDouble=opts.canDouble??(two&&(!opts.split||rules.das)),canSplit=opts.canSplit??(two&&value(hand[0])===value(hand[1]));
 if(bust||t>=21||natural)return 'stand';
 if(two&&!soft&&rules.surrender&&!opts.split){if(t===16&&d>=9&&!(hand[0]===7&&hand[1]===7&&!(rules.h17&&d===11)))return 'surrender';if(t===15&&(d===10||(rules.h17&&d===11)))return 'surrender';if(t===17&&rules.h17&&d===11)return 'surrender';}
 if(canSplit){const p=value(hand[0]);if(p===11||p===8)return 'split';if(p===9&&[2,3,4,5,6,8,9].includes(d))return 'split';if(p===7&&d<=7)return 'split';if(p===6&&d<=(rules.das?6:6)&&d>=(rules.das?2:3))return 'split';if(p===4&&rules.das&&[5,6].includes(d))return 'split';if((p===2||p===3)&&d>=(rules.das?2:4)&&d<=7)return 'split';}
 if(soft){if(t>=20)return 'stand';if(t===19)return rules.h17&&d===6&&canDouble?'double':'stand';if(t===18){if(d>= (rules.h17?2:3)&&d<=6&&canDouble)return 'double';return d<=8?'stand':'hit';}if(t===17)return d>=3&&d<=6&&canDouble?'double':'hit';if(t===15||t===16)return d>=4&&d<=6&&canDouble?'double':'hit';return d>=5&&d<=6&&canDouble?'double':'hit';}
 if(t>=17)return 'stand';if(t>=13)return d<=6?'stand':'hit';if(t===12)return d>=4&&d<=6?'stand':'hit';if(t===11)return (d!==11||rules.h17)&&canDouble?'double':'hit';if(t===10)return d<=9&&canDouble?'double':'hit';if(t===9)return d>=3&&d<=6&&canDouble?'double':'hit';return 'hit';
}
export function strategyReason(hand,up,rules=DEFAULT_RULES){const a=basicStrategy(hand,up,rules),h=handValue(hand),d=value(up);const reasons={split:'Separate the pair into two hands. Each new hand needs another equal stake; split aces receive one card each.',surrender:'Late surrender returns half your stake after the dealer checks for blackjack. This limits the expected loss in this matchup.',double:'A favorable two-card matchup: double the stake and take exactly one more card.',stand:h.soft?'Keep this soft total against the dealer’s upcard.':'Protect this total and let the dealer complete the hand.',hit:h.soft?'Your usable ace can fall from 11 to 1, giving this hand room to improve.':d>=7?'The dealer has a strong upcard; improving your total is usually worth the bust risk.':'The expected value of drawing is better than holding this total.'};return {action:a,reason:reasons[a]};}
function draw(counts,random,exclude=-1){let n=0;for(let r=0;r<13;r++)if(value(r)!==exclude)n+=counts[r];if(!n)throw new Error('Not enough unseen cards for this analysis. Start a new shoe.');let x=random()*n;for(let r=0;r<13;r++)if(value(r)!==exclude){x-=counts[r];if(x<0){counts[r]--;return r;}}throw new Error('Invalid shoe');}
export function blackjackSimulation({hand,up,counts,rules=DEFAULT_RULES,iterations=12000,seed=41},progress=()=>{}){
 if(hand.length<2||handValue(hand).bust)throw new Error('Enter at least two cards with a total of 21 or less.');
 if(counts.some(x=>!Number.isInteger(x)||x<0)||counts.reduce((a,b)=>a+b,0)<24)throw new Error('At least 24 unseen cards are required. Start a new shoe.');
 const base=handValue(hand),actions=base.natural?['stand']:['stand','hit',...(hand.length===2?['double']:[]),...(hand.length===2&&value(hand[0])===value(hand[1])?['split']:[]),...(hand.length===2&&rules.surrender?['surrender']:[])],results=[];
 for(let ai=0;ai<actions.length;ai++){
  const action=actions[ai];if(action==='surrender'){results.push({action,ev:-.5,se:0,win:0,push:0,loss:1});continue;}
  const random=rng(seed);let sum=0,sum2=0,wins=0,pushes=0;
  for(let i=0;i<iterations;i++){
   const c=counts.slice(),dealer=[up,draw(c,random,value(up)===11?10:value(up)===10?11:-1)],hands=[{cards:hand.slice(),stake:1,split:false}],finished=[];
   // Hole card is sampled before any player draw, conditioned on a passed peek.
   for(let j=0;j<hands.length;j++){
    let h=hands[j],a=j===0?action:null;
    for(let step=0;step<24;step++){
     if(!a)a=basicStrategy(h.cards,up,{...rules,surrender:false},{split:h.split,canSplit:h.cards.length===2&&value(h.cards[0])===value(h.cards[1])&&hands.length<4&&!(h.split&&h.cards[0]===0),canDouble:h.cards.length===2&&(!h.split||rules.das)});
     if(handValue(h.cards).total>=21||a==='stand')break;
     if(a==='split'){
      const r=h.cards.pop(),other={cards:[r,draw(c,random)],stake:1,split:true};h.cards.push(draw(c,random));h.split=true;hands.push(other);
      if(r===0){finished.push(other);hands.pop();break;}a=null;continue;
     }
     if(a==='double'){h.stake*=2;h.cards.push(draw(c,random));break;}
     h.cards.push(draw(c,random));a=null;
    }finished.push(h);
   }
   let dv=handValue(dealer);while(dv.total<17||(dv.total===17&&dv.soft&&rules.h17)){dealer.push(draw(c,random));dv=handValue(dealer);}
   let net=0;for(const h of finished){const hv=handValue(h.cards);net+=hv.bust?-h.stake:hv.natural&&!h.split?rules.payout:dv.bust||hv.total>dv.total?h.stake:hv.total===dv.total?0:-h.stake;}
   sum+=net;sum2+=net*net;if(net>0)wins++;else if(net===0)pushes++;
  }
  const ev=sum/iterations;results.push({action,ev,se:Math.sqrt(Math.max(0,sum2/iterations-ev*ev)/iterations),win:wins/iterations,push:pushes/iterations,loss:(iterations-wins-pushes)/iterations});progress((ai+1)/actions.length);
 }
 return {results:results.sort((a,b)=>b.ev-a.ev),iterations,method:'Monte Carlo; without replacement; dealer peek passed; basic-strategy continuation',basic:basicStrategy(hand,up,rules)};
}
// Rank a 5–7 card Hold’em hand directly; category + five base-15 tiebreak digits.
export function evaluate(cards){
 if(cards.length<5||cards.length>7)throw new Error('Hand evaluation needs 5–7 cards.');
 const counts=Array(15).fill(0),suits=[[],[],[],[]];for(const c of cards){const r=c%13===0?14:c%13+1;counts[r]++;suits[Math.floor(c/13)].push(r);}
 const ranks=[];for(let r=14;r>=2;r--)if(counts[r])ranks.push(r);
 const straight=list=>{const set=new Set(list);if(set.has(14))set.add(1);for(let r=14;r>=5;r--)if([0,1,2,3,4].every(n=>set.has(r-n)))return r;return 0;};
 const flush=suits.find(s=>s.length>=5);let category,keys;
 const groups=ranks.slice().sort((a,b)=>counts[b]-counts[a]||b-a),four=groups.find(r=>counts[r]===4),three=groups.filter(r=>counts[r]>=3),pairs=groups.filter(r=>counts[r]>=2),sf=flush&&straight(flush),st=straight(ranks);
 if(sf){category=8;keys=[sf];}else if(four){category=7;keys=[four,...ranks.filter(r=>r!==four).slice(0,1)];}else if(three.length&&pairs.some(r=>r!==three[0])){category=6;keys=[three[0],pairs.find(r=>r!==three[0])];}else if(flush){category=5;keys=flush.sort((a,b)=>b-a).slice(0,5);}else if(st){category=4;keys=[st];}else if(three.length){category=3;keys=[three[0],...ranks.filter(r=>r!==three[0]).slice(0,2)];}else if(pairs.length>=2){const p=pairs.sort((a,b)=>b-a).slice(0,2);category=2;keys=[...p,...ranks.filter(r=>!p.includes(r)).slice(0,1)];}else if(pairs.length){category=1;keys=[pairs[0],...ranks.filter(r=>r!==pairs[0]).slice(0,3)];}else{category=0;keys=ranks.slice(0,5);}
 let score=category;for(let i=0;i<5;i++)score=score*15+(keys[i]||0);return {score,category,name:CATEGORIES[category],keys};
}
export function validatePoker({hero,board=[],villain=[],dead=[],opponents=1}){
 if(hero.length!==2)throw new Error('Select your two hole cards.');if(![0,3,4,5].includes(board.length))throw new Error('Use no board, a three-card flop, a four-card turn, or a five-card river.');if(![0,2].includes(villain.length))throw new Error('Enter both opponent cards, or leave both unknown.');if(!Number.isInteger(opponents)||opponents<1||opponents>5)throw new Error('Choose 1–5 opponents.');const all=[...hero,...board,...villain,...dead];if(all.some(c=>!Number.isInteger(c)||c<0||c>=52)||new Set(all).size!==all.length)throw new Error('A card can only appear once.');return all;
}
export function pokerEquity(input,progress=()=>{}){
 const {hero,board=[],villain=[],dead=[],opponents=1,iterations=20000,seed=42}=input,used=validatePoker(input),deck=Array.from({length:52},(_,i)=>i).filter(c=>!used.includes(c)),missing=5-board.length,known=opponents===1&&villain.length===2,exact=known&&missing<=2||opponents===1&&!villain.length&&missing===0;
 let n=0,equity=0,equity2=0,wins=0,ties=0;const histogram=Array(9).fill(0);
 const trial=(runout,enemies)=>{const own=evaluate([...hero,...runout]);let best=own.score,tied=1,beaten=false;for(const v of enemies){const s=evaluate([...v,...runout]).score;if(s>own.score){beaten=true;break;}if(s===own.score)tied++;}const share=beaten?0:1/tied;n++;equity+=share;equity2+=share*share;if(!beaten){if(tied===1)wins++;else ties++;}histogram[own.category]++;};
 if(exact){
  if(known&&missing===0)trial(board,[villain]);
  else if(known&&missing===1)for(const c of deck)trial([...board,c],[villain]);
  else if(known)for(let i=0;i<deck.length;i++)for(let j=i+1;j<deck.length;j++)trial([...board,deck[i],deck[j]],[villain]);
  else for(let i=0;i<deck.length;i++)for(let j=i+1;j<deck.length;j++)trial(board,[[deck[i],deck[j]]]);
 }else{
  const random=rng(seed),need=missing+2*(opponents-(villain.length?1:0));
  for(let i=0;i<iterations;i++){const pool=deck.slice();for(let j=0;j<need;j++){const k=j+Math.floor(random()*(pool.length-j));[pool[j],pool[k]]=[pool[k],pool[j]];}const runout=[...board,...pool.slice(0,missing)],enemies=villain.length?[villain]:[];let p=missing;while(enemies.length<opponents){enemies.push(pool.slice(p,p+2));p+=2;}trial(runout,enemies);if(i%2000===0)progress(i/iterations);}
 }
 const e=equity/n;return {equity:e,win:wins/n,tie:ties/n,loss:(n-wins-ties)/n,se:exact?0:Math.sqrt(Math.max(0,equity2/n-e*e)/n),histogram:histogram.map(x=>x/n),iterations:n,exact,opponents,assumption:'Unknown opponent cards are uniformly random legal combinations; no rake, future betting, or fold equity.'};
}
export function potMath(equity,pot,call,stack=Infinity){if(!Number.isFinite(pot)||!Number.isFinite(call)||pot<0||call<0)throw new Error('Pot and call must be nonnegative chip amounts.');const cost=Math.min(call,stack),final=pot+cost;return {required:final?cost/final:0,ev:equity*final-cost,cost,final};}
export function journalStats(entries,initial=10000){let balance=initial,peak=initial,maxDrawdown=0,net=0,wins=0,losses=0,pushes=0,wagered=0;const series=[initial];for(const e of entries){net+=e.net;balance+=e.net;wagered+=e.stake;if(e.net>0)wins++;else if(e.net<0)losses++;else pushes++;peak=Math.max(peak,balance);maxDrawdown=Math.max(maxDrawdown,peak-balance);series.push(balance);}return {balance,net,wins,losses,pushes,wagered,played:entries.length,winRate:entries.length?wins/entries.length:0,roi:wagered?net/wagered:0,maxDrawdown,series};}
