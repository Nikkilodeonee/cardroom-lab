import {pokerEquity,blackjackSimulation} from './engine.mjs';
self.onmessage=({data})=>{try{const fn=data.type==='poker'?pokerEquity:blackjackSimulation;const result=fn(data.input,p=>self.postMessage({progress:p}));self.postMessage({result});}catch(error){self.postMessage({error:error.message});}};
