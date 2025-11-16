// Import samples
samples('github:eddyflux/crate')
samples('https://raw.githubusercontent.com/algorave-dave/samples/refs/heads/main/strudel.json');
samples('https://raw.githubusercontent.com/TimEwing/bakery/main/strudel.json');


setcpm(94)

let chords = chord("<E5 A5 C5 D5>/2").dict('ireal')


// $: stack(
  
//   s("bd").struct("[1 <0 1 0 1>]").lpf(350).fm(-10)
// )


// Midi
let cc = await midin('BCR2000')
// const m = register('effectChain', (pat, ctl, r0, r1) => pat.)
let ccn = (knob, r0, r1) => cc(knob).range(r0, r1)
let ccs = (col, row) => (r0, r1) => ccn(col+row*8, r0, r1)
// let mgain = (v_knob) => return
const mgain = register('mgain', (v_knob, pat) => pat.gain(ccn(v_knob,0,1.1)).mask(ccn(v_knob+32,0,1)))

let ppe_list = [
  "climbup",
  "dancin",
  "hat",
  "igot",
  "joint",
  "people",
  "purple",
  "attheafter",
  "smokin",
  "ceilinonthe",
  "cheetahprint",
  "co2",
  "dancinonthe",
  "hanginfromthe",
  "myheadhitstheroof",
  "onthebooth",
  "peoplerolledup",
  "purplehat",
  "seemeseeyou",
]

// $: s((cc(101).range(1, 20)).pick(ppe_list))
//   .fast(cc(93).range(1,4))
//   // .late(0.1)
//   // .clip()
//   .mgain(1)

// $: s("hat/8").fast(cc(104).range(1, 64)).gain(0.3)


// $: s("bd ~ [~ bd bd]@2").slow(4).lpf(600).room(.25)


// $: s("bd").struct("[1 1]").lpf(350)

// let cc = await midin('BCR2000')
// //$: note("c a f e").slow(cc(104).range(1, 16)).sound("sawtooth").gain(0.2)
// $: note("c a f e").lpf(cc(103).range(0, 4000)).lpq(cc(104).range(0, 10)).sound("sawtooth")
// //$: s("splltab cocaina trial overgame givittome ecotone")
// $: s(`cocaina`).slow(8)

let ddave_list = [
  "spilltab",
  "cocaina",
  "trial",
  "overgame",
  "giveittome",
  "ecotone",
  "technologic",
  "forget",
  "hard_refresh",
  "hello_world",
];


$: stack(
  s(`technologic/8`)
  .speed(`[0.8 0.9 1.0 1.1 0.8 0.9 1.0 1.1]`)
  // .slow(2)
  // .striate(6)
  // .rev()
  // .palindrome()
  // .fit()
  .loop(1)
  .chop(8)
  .cut(1)
).mgain(1)

$: stack(
  // s((cc(101).range(1, 20)).pick(ppe_list))
  s(ccs(1, 13)(1,20).pick(ppe_list))
  // .fit()
  .cut(1)
  // .late(0.1)
  .clip(1)
  .fast(cc(93).range(0, 4).ceil())
  // .mgain(1)
).mgain(2)

$: stack(
  s("hh(3,8)/2").room(0.25)
  // .gain(cc(2).range(0,1))
).mgain(3)

$: stack(
  
).mgain(4)

$: stack(
  
).mgain(5)

$: stack(
  
).mgain(6)

$: stack(
  chords.voicing().s("supersaw")
  .phaser(0.5).room(1)
).mgain(7)

$: stack(
  n("<0 0 0 <0 0 0 [0 1]>>")
  .set(chords).mode("root:g1").voicing().s("gm_synth_bass_1")
).mgain(8)



// $: s(cc(100).range(0, 9).pick(ddave_list))

// $: note(`[e5 b4 d5 c5]*0.125`).gain(.15).early("[0 0.1 0 0.1] * 0.125")

// console.log(cc(104).range(1,16))
