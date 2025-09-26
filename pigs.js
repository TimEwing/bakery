// WIP

setcpm(90)

$: s("hh")

$: "a!4 b!4 ~".slow(9*8).pick({
  a: n("[<2!3 [2!2]>!2]*4 [<1!3 [<[1!2] [1]>]>!2]*4")
    .scale("F3:minor")
    .superimpose(x=>x.scaleTranspose("<~@2 2@2>"))
    .slow(8)
  ,
  b: n("1 ~ 1 ~ 1 ~ 1 ~")
    // .early(0.125)
    .scale("F3:minor")
    .superimpose(x=>x.scaleTranspose("<~@2 2@2>"))
    .slow(8)
}).swingBy(1/3, 2)
  .sound("sawtooth:32:1,sine:0:1")
  .lpq(10)
  .lpa("2")
  // .hpr("1")
  .lpf(1200)
  .room(0.5)

// bassline
$: n("0 2 [3@3 <4 2>] [~@2 <7 0>@8 [~ 0]@2]@3  <[2 2] [-1 -1]> <[[3 3] 2] [0b 0b]>").slow(8).swingBy(1/3, 2)
  .scale("F1:minor")
  .sound("sawtooth:32:1,sine:0:1")
  .lpq(10)
  .lpa("2")
  // .hpr("1")
  .lpf(800)
  .room(0.5)


