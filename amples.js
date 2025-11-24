

////// NOT DRUMS //////

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
