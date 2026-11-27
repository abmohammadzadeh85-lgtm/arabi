import {gen10,CHAPTERS10} from "./gen10.mjs";import {gen11,CHAPTERS11} from "./gen11.mjs";import {gen12,CHAPTERS12} from "./gen12.mjs";import {validate} from "./common.mjs";
for(const [g,f,C] of [[10,gen10,CHAPTERS10],[11,gen11,CHAPTERS11],[12,gen12,CHAPTERS12]]){const b=f();const e=validate(b,g);const by={};b.forEach(q=>by[q.c]=(by[q.c]||0)+1);
 console.log(g,b.length,JSON.stringify(by),e.length?e.slice(0,5):"OK");
 for(const c of Object.keys(C)){const x=b.find(q=>q.c==c);console.log("  ",JSON.stringify(x))}}
