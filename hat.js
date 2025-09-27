// WIP

setcpm(94)

$: s("hh(3,8)/2").room(.25)
$: s("bd ~ [~ bd bd]@2").slow(4).lpf(600).room(.25)



$: chooseCycles(
  wchooseCycles(
      ["climbup", 1],
      ["dancin", 1],
      ["hat", 3],
      ["igot", 4],
      ["joint", 1],
      ["people", 1],
      ["purple", 3],
    ).fast(2)
  ,
  wchooseCycles(
    ["attheafter", 1],
    ["smokin", 1],
    ["ceilinonthe", 1],
    ["cheetahprint", 1],
    ["co2", 1],
    ["dancinonthe", 1],
    ["hanginfromthe", 1],
    ["myheadhitstheroof", 1],
    ["onthebooth", 1],
    ["peoplerolledup", 1],
    ["purplehat", 5],
    ["seemeseeyou", 1],
  )
).s().room(0.25)

