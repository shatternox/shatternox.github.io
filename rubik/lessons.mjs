export const palette = {
  yellow: '#ffd94c', orange: '#ff8549', green: '#38d883',
  white: '#f2f6f5', red: '#f25266', blue: '#548dff',
};
export const standard = { U: 'yellow', R: 'orange', F: 'green', D: 'white', L: 'red', B: 'blue' };

// Keep every line short: the cube animation does the explaining.
export const lessons = [
  {
    name: 'Daisy', how: ['Hold the cube with the <b>yellow center on top</b>. Yellow is the middle of the flower.', 'Find a white edge: a piece with white and one other color.', 'Bring it up beside yellow with <b>white facing the sky</b>. That’s one petal.', 'Make all 4 petals. If the spot is already white, turn the top first.'], goal: 'Four white edges around the yellow center.',
    alg: null, rule: 'No formula. Bring each white edge up so white faces the sky.',
    tip: 'Spot above already white? Turn the top first so you don’t knock it off.',
    art: 'iso',
    cases: {
      middle: ['Middle layer', 'Turn its side once to lift it up.'],
      bottom: ['Bottom, white on the side', 'Lift it to the middle, then up.'],
      down: ['Bottom, white facing down', 'Turn that side twice.'],
      top: ['Top, white on the side', 'Drop it to the middle, then lift it back up.'],
    },
  },
  {
    name: 'White cross', how: ['Turn the top until a petal’s other color <b>matches the center below it</b>.', 'Turn the cube so that side faces you. It is now the <b>front (F)</b>.', 'Do <b>F2</b>: turn the front twice. The white edge drops to the bottom.', 'Repeat for all 4 petals. Underneath you now have a white plus.'], goal: 'A white plus on the bottom, each side matching its center.',
    alg: 'down', rule: 'Match a petal’s side color with its center, then turn that side twice.',
    tip: 'Pick the petal that needs the fewest top turns.',
    art: 'iso',
    cases: {
      matched: ['Already matching', 'Turn that side twice.'],
      turn: ['Not matching yet', 'Turn the top until it matches, then twice.'],
    },
  },
  {
    name: 'White corners', how: ['Keep yellow on top. The white plus stays on the bottom.', 'Find a top corner with white. Turn the top until it sits <b>above its spot</b> (its two colors match the two centers).', 'Turn the cube so that spot is at the <b>front-right, bottom</b>.', 'Repeat <b>R U R′ U′</b> until the corner is solved: 1, 3 or 5 times.'], goal: 'The whole bottom is white, with the bottom row of each side matching.',
    alg: 'trigger', repeat: 'Repeat until the corner is solved: 1, 3 or 5 times.',
    rule: 'Put the corner above its spot, hold that spot at front-right, then repeat.',
    tip: 'The corner’s spot is where its two side colors meet their centers.',
    art: 'iso',
    cases: {
      right: ['White faces right', 'Do it once.'],
      up: ['White faces up', 'Do it three times.'],
      front: ['White faces you', 'Do it five times.'],
      stuck: ['Stuck in the bottom', 'Do it once to pop it up, then insert it.'],
    },
  },
  {
    name: 'Middle layer', how: ['Find a top edge with <b>no yellow</b> on it.', 'Turn the top until its front color matches the center below, then face it.', 'Its top color matches the <b>right</b> center → Insert right. The <b>left</b> center → Insert left.', 'No such edge on top? Use an insert on a wrong middle edge to pop it out.'], goal: 'The bottom two rows are solved on every side.',
    alg: ['right', 'left'],
    rule: 'Find a top edge with no yellow. Match its front color, then send it right or left.',
    tip: 'The top color of the edge tells you the direction.',
    art: 'iso',
    cases: {
      right: ['Goes right', 'Top color matches the right center.'],
      left: ['Goes left', 'Top color matches the left center.'],
      stuck: ['Stuck, or no edge on top', 'Insert any top edge into its spot to pop it out.'],
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
    name: 'Yellow face', how: ['Count the yellow corners facing up.', '<b>1 up</b>: put it at the front-left. <b>0 up</b>: front-left corner shows yellow on its left. <b>2 up</b>: front-left corner shows yellow facing you.', 'Run <b>R U R′ U R U2 R′</b>. Look again and repeat.'], goal: 'The whole top is yellow.',
    alg: 'sune', repeat: 'Check the top after each go. Never more than 3.',
    rule: 'Put the right corner at the front-left, then run the formula.',
    tip: 'Counting the yellow corners on top tells you which corner goes front-left.',
    art: 'top',
    cases: {
      sune: ['1 up · done in one', 'Yellow corner at the front-left.'],
      antisune: ['1 up · takes two', 'Yellow corner at the front-left.'],
      pi: ['0 up · two pairs on sides', 'Front-left corner: yellow on its left.'],
      h: ['0 up · pairs face each other', 'Front-left corner: yellow on its left.'],
      headlights: ['2 up · headlights', 'Front-left corner: yellow facing you.'],
      chameleon: ['2 up · split', 'Front-left corner: yellow facing you.'],
      bowtie: ['2 up · diagonal', 'Front-left corner: yellow facing you.'],
    },
  },
  {
    name: 'Yellow corners', how: ['Find <b>headlights</b>: a side whose two top corners are the same color.', 'Turn the top so the headlights are at the <b>back</b>. No headlights? Start anywhere.', 'Run the formula. Repeat until every side has headlights, then turn the top to match.'], goal: 'Every top corner is in its spot.',
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
    name: 'Yellow edges', how: ['Find a side that is <b>fully solved</b> (its whole top row matches).', 'Hold it at the <b>back</b>. None solved? Start anywhere.', 'Run the formula. Still not solved? Run it again.'], goal: 'Every face is one color. Done!',
    alg: 'edges', repeat: 'Not solved after one go? Do it again.',
    rule: 'Put a solved side at the back, then run the formula.',
    tip: 'A solved side has the full top row matching its center.',
    art: 'top',
    cases: {
      cw: ['1 solved side · once', 'Solved side at the back.'],
      ccw: ['1 solved side · twice', 'Solved side at the back, two goes.'],
      h: ['0 solved · swap opposites', 'Run it from anywhere.'],
      z: ['0 solved · swap neighbors', 'Turn the cube as shown, then run it.'],
    },
  },
];

export const algNames = {
  down: 'Send it down (F2)', trigger: 'The trigger', right: 'Insert right', left: 'Insert left', cross: 'Cross maker',
  sune: 'Corner twister', corners: 'Corner swapper', edges: 'Edge cycler',
};
