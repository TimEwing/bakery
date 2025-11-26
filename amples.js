

////// NOT DRUMS //////

_darude_dude: arrange(
[16, "<[0!4] 0 ~ ~ ~!11 <~ 2>>*4"],
[8, "<[0!4] 0 ~ ~ ~!3 <~ 2>>*4"],
[4, "<[0!4] 0 ~ ~>*4"],
[2, "<[0!4] 0>*4"],
[2, "<[0!4]>*4"],
[32, "<[0!4] [0 [0 0]] [0!4] [0 <[0 0] 0>]>*4".add(
  "<[0 0 0 [0 <3 2>]]@2 [<3 0> <3 0> <3 0> <2 0>] [<2 0> <2 0> <2 0> <-1 3>]>*2"
)],
)
.n()
.scale("E5:minor,E4:minor")
.s("sqr,saw").dist("2:.18").strans("0,7").clip(.5).room(.5)
.gain(0.4).lp(6000)

_darude_chords: chord("Em@2 C [G D]".slow(2))
.struct("x [~ x]!3 [x ~ ~ x] [~ x] [x ~ ~ x] [~ x]".slow(2))
.voicing()
.s("supersaw").rel(.8).dec(.4).room(.2).postgain(.8)
.mask("<1!32 0!4 1!28>")

_soundsLikeATrumpetOrSomething: n("0 5 ~ ~")
.chord("Cdim".slow(8))
.anchor("C4,C5")
.voicing()
.s("saw")
.sometimes(ply("2|4"))
.patt(0.1)
.pan(1)

.off(3/8, x=>x.lp("3000:5").velocity(.75).pan(0) 
  .off(3/8, y=>y.lp("1500:5").velocity(.5).pan(1))
)  // siiiick

////// DRUMS //////
//hh
s("hh").struct("1([2|3|5], 8)".fast(2)).bank("tr808") // random clicky

// bd
$: s("bd*4").bank("polaris").room(.1) // THICC AS FUCK four on the floor

// ramping bass drum with a drop
$: s("sbd")
.fast("[0 1 1 2 2 4 4 [8 8 16 32]]".slow(64))
