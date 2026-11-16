export const palette = {
  yellow: '#ffd94c', orange: '#ff8549', green: '#38d883',
  white: '#f2f6f5', red: '#f25266', blue: '#548dff',
};
export const standard = { U: 'yellow', R: 'orange', F: 'green', D: 'white', L: 'red', B: 'blue' };

// Keep every line short: the cube animation does the explaining.
export const lessons = [
  {
    name: 'Daisy', how: ['Hold the cube with the <b>yellow center on top</b>. Yellow is the middle of the flower.', 'A <b>white edge</b> is a piece with 2 colors, one of them white. There are 4. Find one that isn’t on top with white facing up yet.', 'Turn the whole cube so its white sticker faces you (if white faces the floor, just keep holding as is). Pick the picture that matches.', 'Before lifting it up: is the top spot it lands in already white? Turn the top (U) first, so you don’t knock a petal off.', 'Repeat until all 4 white edges are on top, white facing up.'], goal: 'A flower: the yellow center with 4 white “petals” around it, white facing up.',
    alg: null, rule: 'No formula. Bring each white edge up so white faces the sky.',
    tip: 'Spot above already white? Turn the top first so you don’t knock it off.',
    art: 'iso',
    cases: {
      middle: ['White facing you, middle row', 'Turn its side once to lift it up.'],
      bottom: ['White facing you, bottom row', 'Lift it to the middle, then up.'],
      down: ['White on the bottom face', 'Turn that side twice.'],
      top: ['White facing you, top row', 'Drop it to the middle, then lift it back up.'],
    },
  },
  {
    name: 'White cross', how: ['Each petal has a second color on its side. Turn the top (U) until one petal’s side color <b>matches the center right below it</b>.', 'Turn the whole cube so that side faces you.', 'Do <b>F2</b>: turn the front side twice. The white edge drops to the bottom.', 'Repeat for the other 3 petals. Under the cube you now have a white plus.'], goal: 'A white plus on the bottom, each arm matching the center of its side.',
    alg: 'down', rule: 'Match a petal’s side color with its center, then turn that side twice.',
    tip: 'Pick the petal that needs the fewest top turns.',
    art: 'iso',
    cases: {
      matched: ['Already matching', 'The petal’s side color matches the center below it. Hold that side facing you.'],
      turn: ['Not matching yet', 'Turn the top (U) until a petal’s side color matches the center below it, then hold that side facing you.'],
    },
  },
  {
    name: 'White corners', how: ['Keep yellow on top. The white plus stays on the bottom.', 'Find a corner in the top layer with white on it. Its other 2 colors tell you where it lives: the bottom corner between those two centers.', 'Turn the top (U) until the corner sits <b>right above</b> where it lives. Then turn the whole cube so it’s at the <b>front-right</b>.', 'Do <b>R U R′ U′</b> again and again until the corner drops in with white down: 1, 3 or 5 times. Stop as soon as it’s right.', 'No white corner on top, but a bottom corner is wrong? Hold it at the front-right and do R U R′ U′ once. It comes up.'], goal: 'The whole bottom is white, and the bottom row of every side matches its center.',
    alg: 'trigger', repeat: 'Repeat until the corner is solved: 1, 3 or 5 times.',
    rule: 'Put the corner above its spot, hold that spot at front-right, then repeat.',
    tip: 'The corner’s spot is where its two side colors meet their centers.',
    art: 'iso',
    cases: {
      right: ['White faces right', 'Turn the top until the white corner sits right above its spot, then turn the cube so that spot is at the front-right. Here white faces right, so R U R′ U′ once is enough.'],
      up: ['White faces up', 'Turn the top until the white corner sits right above its spot, then turn the cube so that spot is at the front-right. Here white faces up: R U R′ U′ three times.'],
      front: ['White faces you', 'Turn the top until the white corner sits right above its spot, then turn the cube so that spot is at the front-right. Here white faces you: R U R′ U′ five times.'],
      stuck: ['Corner stuck in the bottom', 'Turn the cube so the wrong bottom corner is at the front-right. R U R′ U′ once brings it up, then look again.'],
    },
  },
  {
    name: 'Middle layer', how: ['Find an edge in the top layer with <b>no yellow</b> on it.', 'Turn the top (U) until its side color matches the center below it, making a vertical stripe of 2. Turn the cube so that stripe faces you.', 'Now look at the edge’s top color. Same as the <b>right</b> center → Insert right. Same as the <b>left</b> center → Insert left.', 'Every top edge has yellow, but a middle edge is wrong? Hold it at the front-right and do Insert right to pop it out. Then start again.'], goal: 'The bottom two rows are solved on every side.',
    alg: ['right', 'left'],
    rule: 'Find a top edge with no yellow. Match its front color, then send it right or left.',
    tip: 'The top color of the edge tells you the direction.',
    art: 'iso',
    cases: {
      right: ['Goes right', 'Stripe of 2 facing you. The edge’s top color matches the right center.'],
      left: ['Goes left', 'Stripe of 2 facing you. The edge’s top color matches the left center.'],
      stuck: ['Edge stuck in the middle', 'Every top edge has yellow. Hold the wrong middle edge at the front-right; Insert right pops it out. Then look again.'],
    },
  },
  {
    name: 'Yellow cross', how: ['Look only at the 4 edges touching the yellow center. Ignore corners.', '<b>Dot</b>: any angle. <b>L</b>: point it to the back-left. <b>Line</b>: hold it left to right.', 'Run <b>F R U R′ U′ F′</b> and look again. At most 3 times.'], goal: 'A yellow plus on top. Ignore the corners.',
    alg: 'cross', repeat: 'Dot → L → line → cross. Up to 3 times.',
    rule: 'Hold the shape as shown, then run the formula.',
    tip: 'Only look at the four edges touching the center.',
    art: 'top',
    cases: {
      dot: ['Dot', 'Any angle. You’ll get an L.'],
      el: ['L shape', 'Point it to the back-left.'],
      line: ['Line', 'Hold it left to right.'],
    },
  },
  {
    name: 'Yellow face', how: ['Count the top corners that show yellow <b>facing up</b>.', '<b>1 up</b>: turn the top (U) so that corner is at the front-left.', '<b>0 up</b>: turn the top until the front-left corner’s yellow faces <b>left</b>.', '<b>2 up</b>: turn the top until the front-left corner’s yellow faces <b>you</b>.', 'Do <b>R U R′ U R U2 R′</b>, then count again. 1 to 3 times.'], goal: 'The whole top is yellow.',
    alg: 'sune', repeat: 'Check the top after each go. Never more than 3.',
    rule: 'Put the right corner at the front-left, then run the formula.',
    tip: 'Counting the yellow corners on top tells you which corner goes front-left.',
    art: 'top',
    cases: {
      sune: ['1 corner up', 'Turn the top (U) so the yellow-up corner is at the front-left, like the picture.'],
      antisune: ['1 corner up (mirrored)', 'Same as the other 1-up picture: yellow-up corner at the front-left. It takes two goes.'],
      pi: ['0 up · yellows on 3 sides', 'Turn the top (U) until the front-left corner’s yellow faces left.'],
      h: ['0 up · yellows on 2 opposite sides', 'Turn the top (U) until the front-left corner’s yellow faces left.'],
      headlights: ['2 up, next to each other, yellows facing you', 'Turn the top (U) until the front-left corner’s yellow faces you.'],
      chameleon: ['2 up, next to each other, yellows on the sides', 'Turn the top (U) until the front-left corner’s yellow faces you.'],
      bowtie: ['2 up, diagonal', 'Turn the top (U) until the front-left corner’s yellow faces you.'],
    },
  },
  {
    name: 'Yellow corners', how: ['Look at the sides of the top layer. <b>Headlights</b> = a side whose two top corners are the same color. Ignore the middle edge.', 'Turn the top (U) so the headlights are at the <b>back</b>. No headlights anywhere? Start from any side.', 'Do the formula. Repeat until every side has headlights.', 'Turn the top until the corners match the side centers.'], goal: 'Every top corner is in its spot.',
    alg: 'corners', repeat: 'Once or twice, then turn the top to line up.',
    rule: 'Find “headlights” (same color on both top corners of a side). Put them at the back.',
    tip: 'Ignore the edges between the corners for now.',
    art: 'top',
    cases: {
      pair: ['Headlights on one side', 'Turn the top so they’re at the back.'],
      none: ['No headlights', 'Run it from any side. Headlights appear.'],
      align: ['Headlights on every side', 'Turn the top until they match.'],
    },
  },
  {
    name: 'Yellow edges', how: ['Find a side whose <b>whole top row</b> matches its center.', 'Turn the whole cube so that side is at the <b>back</b>. None? Start from any side.', 'Do the formula. Not solved yet? Look again and do it once more.'], goal: 'Every face is one color. Done!',
    alg: 'edges', repeat: 'Not solved after one go? Do it again.',
    rule: 'Put a solved side at the back, then run the formula.',
    tip: 'A solved side has the full top row matching its center.',
    art: 'top',
    cases: {
      cw: ['1 side solved', 'Turn the whole cube so the solved side is at the back.'],
      ccw: ['1 side solved (other way)', 'Turn the whole cube so the solved side is at the back. This one takes two goes.'],
      h: ['No side solved, opposites swapped', 'Hold it any way. After this you’ll have a solved side.'],
      z: ['No side solved, neighbors swapped', 'Hold it any way. After this you’ll have a solved side.'],
    },
  },
];

export const algNames = {
  down: 'Send it down (F2)', trigger: 'The trigger', right: 'Insert right', left: 'Insert left', cross: 'Cross maker',
  sune: 'Corner twister', corners: 'Corner swapper', edges: 'Edge cycler',
};
