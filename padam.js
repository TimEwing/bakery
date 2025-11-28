

$: s("bd,sbd")
.struct(pick(cc(81).range(0,2).ceil(), ["[x ~ ~ x]", "x*2"]))
.add("0,0.1")

$: s("~ <~ <bd!1 [ht mt lt bd]>>".fast(2))
.gain(cc(81).range(0,1))

$: s("hh")
.struct("x(<7 11 13 9>, 16)".slow(2))
.lpf(sine.range(8000, 12000))
.room(0.3)
.pan(sine.range(0,1).slow(3.5))
.gain(cc(82).range(0,1))

$: s("~ sd")
.gain(cc(83).range(0,1))
