export const palette = {
  yellow: '#ffd94c', orange: '#ff8549', green: '#38d883',
  white: '#f2f6f5', red: '#f25266', blue: '#548dff',
};
export const standard = { U: 'yellow', R: 'orange', F: 'green', D: 'white', L: 'red', B: 'blue' };

export const lessons = [
  {
    name: 'White cross', goal: 'Four white edges on the bottom, with each side color matching its center.',
    tip: 'An edge has two colors. Find the center that matches its other color to locate its home. A white plus on the bottom only counts when the four side colors also line up.',
    cases: {
      up: ['White faces up', 'Line the side color up with its center. Turn that face twice to send the edge straight down.'],
      'up-side': ['White faces out from the top layer', 'The edge is in the top layer sideways. The route moves it through a side face to turn it before placing it.'],
      middle: ['Edge is in the middle layer', 'Look between two side centers. A one-face turn can bring that edge toward the top or bottom, depending on which way white faces.'],
      bottom: ['White faces down in the wrong slot', 'Bring that edge up or around the sides, then send it down under the center that matches its other color.'],
      'bottom-side': ['White faces out from the bottom layer', 'Move the edge out of the bottom layer first, then bring it back with white facing down.'],
    },
  },
  {
    name: 'White corners', goal: 'The entire bottom face is white and the bottom row of each side matches its center.',
    tip: 'A corner has three colors. Its home is where those three centers meet. Hold yellow up, and compare the corner with the slot directly below it.',
    cases: {
      'side-front': ['White is on the first side of a top corner', 'Use the side with white to recognize this insert. The setup turns bring the corner over its own slot.'],
      'side-right': ['White is on the other side of a top corner', 'This is the mirror of the other sideways case. Align the two side colors with the correct slot before inserting.'],
      up: ['White faces straight up', 'A sideways insert alone may leave this corner twisted. Follow the full sequence, including any setup turns.'],
      bottom: ['Corner is in the wrong bottom slot', 'Bring the corner to the top layer, then move it above the correct slot and insert it.'],
      twisted: ['Correct slot, twisted corner', 'Lift the corner into the top layer and reinsert it. The white cross returns at the end of each group of turns.'],
    },
  },
  {
    name: 'Middle edges', goal: 'The bottom two rows match the centers on all four side faces.',
    tip: 'Look for a top edge with neither yellow nor white. Match the outward color to its center. The color facing up tells you which neighboring center the edge belongs beside.',
    cases: {
      right: ['Insert to the right', 'Once the outward color matches its center, the upper color belongs on your right. Watch how the edge moves away before dropping into its slot.'],
      left: ['Insert to the left', 'Once the outward color matches its center, the upper color belongs on your left. This is the mirror of the right insert.'],
      wrong: ['Edge is in the wrong middle slot', 'An insert into the occupied slot pushes the trapped edge up. Bring it around and insert it in its own slot.'],
      flipped: ['Correct slot, flipped edge', 'Push it out with an insert, then put it back from the top with its colors lined up.'],
    },
  },
  {
    name: 'Yellow cross', goal: 'Four yellow edges face up. The corners and side colors can still be out of place.',
    tip: 'Look straight at the top and count only the four stickers touching the yellow center. Use the U camera view to compare the shape.',
    odds: 'Among the eight equally likely edge orientations after the first two layers, there is one dot (12.5%), two lines (25%), four L shapes (50%), and one cross (12.5%).',
    cases: {
      dot: ['Dot', 'Only the center is yellow among the five cross positions. Follow the full route through the intermediate edge patterns.'],
      line: ['Line', 'Two yellow edges are opposite. The standard F R U R′ U′ F′ version starts with a horizontal line in the top view. The displayed formula already accounts for your example’s orientation.'],
      el: ['L shape', 'Two yellow edges are next to each other. The corner between them can sit in any of four directions. Compare the top view before starting the displayed sequence.'],
    },
  },
  {
    name: 'Yellow face', goal: 'All nine top stickers are yellow. The top row of the sides may still be mixed.',
    tip: 'Count the yellow corners facing up, then look at the side stickers on the others. Two shapes can have the same number facing up and need different moves.',
    cases: {
      '0111': ['One up · Sune pattern', 'One corner faces up. Around the top, the three remaining yellow stickers all point in the same rotational direction.'],
      '0222': ['One up · mirrored Sune', 'One corner faces up. Compare the side stickers with the other one-up case: all three point in the opposite rotational direction.'],
      '0012': ['Two adjacent up · sides fan out', 'The two upright corners share a side. Look at the yellow stickers on the other two corners to distinguish the two adjacent cases.'],
      '0021': ['Two adjacent up · sides face in', 'The upright corners share a side. The two remaining yellow stickers show on the same side face.'],
      '0102': ['Two diagonal up', 'The corners already facing up sit across from each other. Compare the two side-facing stickers using the orbit view.'],
      '1122': ['None up · one side pair', 'All four yellow corner stickers face outward. One side has a pair, its opposite has none, and each remaining side has one.'],
      '1212': ['None up · opposite side pairs', 'All four yellow corner stickers face outward. Two pairs of yellow stickers sit on opposite faces.'],
    },
  },
  {
    name: 'Yellow corner positions', goal: 'The two top corner stickers on every side match that side’s center.',
    tip: 'On a side face, compare the two ends of the top row and ignore the middle sticker. Matching pairs may form on the wrong side until you turn U.',
    cases: {
      align: ['Four matching pairs', 'All four sides have pairs. A top-layer turn lines the pairs up with their centers.'],
      pair: ['One matching pair', 'The matching side helps locate the two corners that need to swap. The route includes any setup turns required for your front face.'],
      'no-pair': ['No matching pair', 'The corners are diagonally out of place. The route first creates a matching pair, then puts the corners in their homes.'],
    },
  },
  {
    name: 'Final edges', goal: 'All six faces have solid colors, with every piece in its home.',
    tip: 'Compare the top-middle sticker of each side with its center. Keep the front face fixed while following the sequence, even when a face looks temporarily scrambled.',
    cases: {
      cw: ['One fixed edge · clockwise cycle', 'One side already matches. In the top view the other three edges each need to move clockwise.'],
      ccw: ['One fixed edge · counterclockwise cycle', 'One side already matches. The other three edges need to move counterclockwise as viewed from above.'],
      opposite: ['No fixed edges · opposite swaps', 'Both pairs of opposite edges need to trade places. This is also called the H pattern.'],
      adjacent: ['No fixed edges · neighboring swaps', 'Two pairs of neighboring edges need to trade places. This is also called the Z pattern.'],
    },
  },
];
