samples('github:eddyflux/crate')
setcps(1.3)

let chords = chord("<Cm7 D Fm9 Gm9>/4").dict('ireal')

stack(
  // drums
  s("bd").struct("[1 1]").lpf(350)
  ,
  stack(
    s("hh").struct("[~ [1 2]]*<1!3 2>"),
    s("~ sd").hpf(500)
  )
  .mask("<[0 1] 1 1 1>/16".early(.5))
  , // chords
  chords.voicing().s("gm_epiano1:5")
  .phaser(2).room(1)
  , // bass
  n("<0!3 [1 3 2]>").set(chords).mode("root:g2")
  .voicing().s("gm_acoustic_bass")
  , // me lody
  chords.n("[0 <2 6 <2 3>>*2](<3 5>,8)")
  .anchor("C5").voicing()
  .segment(4)
  .fm(sine.range(3,8).slow(8))
  .room(.75).shape(.3).delay(rand.range(0.1, 0.25))
  .hpf(sine.range(300, 100).slow(8))
  .mask("<0 1 1 0>/16")
)
.late("[0 .01]*4").late("[0 .01]*2").size(4)
