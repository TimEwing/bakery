
////// DRUMS //////
//hh
s("hh").struct("1([2|3|5], 8)".fast(2)).bank("tr808") // random clicky

// bd
$: s("bd*4").bank("polaris").room(.1) // THICC AS FUCK four on the floor

// ramping bass drum with a drop
$: s("sbd")
.fast("[0 1 1 2 2 4 4 [8 8 16 32]]".slow(64))
