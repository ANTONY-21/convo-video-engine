import { chunkCaptions, Word } from '../src/captionChunker';
const mk = (s: string): Word[] => s.split(' ').map((t, i) => ({ text: t, start: i * 0.3, end: i * 0.3 + 0.25 }));
let pass = 0, fail = 0;
function check(name: string, input: string, mustNotEnd: string[], maxWords = 6) {
  const chunks = chunkCaptions(mk(input));
  const bad: string[] = [];
  chunks.forEach(c => {
    const last = c.words[c.words.length-1].text.toLowerCase().replace(/[^a-z']/g,'');
    if (mustNotEnd.includes(last)) bad.push(`ends on '${last}': "${c.text}"`);
    if (c.words.length > maxWords) bad.push(`too long (${c.words.length}): "${c.text}"`);
  });
  if (bad.length) { fail++; console.log(`FAIL ${name}:`); bad.forEach(b => console.log('  ', b)); }
  else { pass++; console.log(`PASS ${name} (${chunks.length} chunks)`); }
  return chunks;
}
// Observed failure 1: clause split mid-sentence with dangling 'A'
check('obs1', 'NORMALLY YOU BLINK 15 TIMES A MINUTE. NOW IT DROPS TO 5.', ['a','the','and','of','to']);
// Observed failure 2
check('obs2', 'YOUR EYES ARE DRYING OUT THAT BURNING FEELING. IT IS DAMAGE.', ['that','is','out']);
// Observed failure 3
check('obs3', 'STOP SCROLLING. YOUR EYES ARE SUFFERING RIGHT NOW.', ['are','your']);
console.log(`\n${pass}/${pass+fail} tests pass`);
process.exit(fail ? 1 : 0);
