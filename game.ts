import { Color, Game, GameConfig } from "24a2";

let debugStartPosition = "";

type Event = DotClick | Message;

const events: Event[] = [];

interface Message {
  kind: "message";
  text: string;
  duration: number;
}

interface DotClick {
  kind: "dotClick";
  dot: Point;
  player: Color;
}

interface Direction {
  x: number;
  y: number;
}

const directionVectors: Direction[] = [
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: 1, y: 0 },
  { x: 1, y: -1 },
  { x: -1, y: -1 },
  { x: -1, y: 0 },
  { x: -1, y: 1 },
];

interface Point {
  x: number;
  y: number;
}

let currentTurn = Color.Blue;

let message = "";
let temporaryMessage = "";

function create(game: Game) {
  game.setDot(3, 3, Color.Red);
  game.setDot(4, 4, Color.Red);

  game.setDot(3, 4, Color.Blue);
  game.setDot(4, 3, Color.Blue);

  switch (debugStartPosition) {
    case "endgame":
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          if (x === 0 && y === 0) {
            continue;
          }
          if (x === 0 && y === 7) {
            game.setDot(x, y, Color.Blue);
            continue;
          }
          game.setDot(x, y, Color.Red);
        }
      }
      break;
    case "skipped-turn":
      for (let x = 0; x < 8; x++) {
        game.setDot(x, 3, Color.Red);
        game.setDot(x, 4, Color.Gray);
      }
      game.setDot(7, 2, Color.Blue);
      break;
  }

  sendMessage(`${currentTurn}'s turn`);
}

function update(game: Game) {
  const event = events.pop();

  // If events = [], event == undefined
  if (!event) {
    return;
  }

  switch (event.kind) {
    // TODO: think about ordering of these
    case "dotClick":
      return handleDotClicked(game, event);
    case "message":
      return handleMessageSent(game, event);
    default:
      console.error(event);
      const _exhaustiveCheck: never = event;
      break;
  }
}

function handleMessageSent(game: Game, message: Message) {
  game.setText(message.text);
  // TODO: handle timeouts
  // - Persist a 'non-timeout message'
  // - When message times out, revent to old message
  // - We need to make sure that if two temporary messages are sent, the
  //   timeout from the first doesn't blat the second
}

function sendMessage(text: string, duration?: number) {
  events.push({
    kind: "message",
    text: text,
    duration: duration || 0,
  });
}

function handleDotClicked(game: Game, dotClick: DotClick): void {
  if (!validMove(game, dotClick.dot, dotClick.player)) {
    return;
  }

  playMove(game, dotClick);

  if (gameFinished(dotClick.player)) {
    displayWinner(game);
    game.end();
    return;
  }

  if (!playerAbleToMove(oppositePlayer(dotClick.player))) {
    // Ping a message
    sendMessage(
      `${oppositePlayer(dotClick.player)} has no valid moves, skipping turn`,
      3
    );
    // Leave turn as this players
    return;
  }

  currentTurn = oppositePlayer(dotClick.player);
  sendMessage(`${currentTurn}'s turn`);
}

/**
 * Returns whether the game has finished or not. Let's assume Player 1 has just
 * moved. This function must be called after their move. The game is finished
 * when neither player has a valid move. It's not sufficient to just check if
 * Player 2 doesn't have a valid move. In normal play, the turn would switch
 * back to Player 1, so we need to also check they don't have a valid move.
 */
function gameFinished(currentPlayer: Color): boolean {
  return (
    !playerAbleToMove(currentPlayer) &&
    !playerAbleToMove(oppositePlayer(currentPlayer))
  );
}

/**
 * Returns whether the player has a legal move they could make
 */
function playerAbleToMove(player: Color): boolean {
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (validMove(game, { x: x, y: y }, player)) {
        return true;
      }
    }
  }
  return false;
}

function displayWinner(game: Game) {
  let numRed = 0;
  let numBlue = 0;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const color = game.getDot(x, y);
      switch (color) {
        case Color.Red:
          numRed++;
          break;
        case Color.Blue:
          numBlue++;
          break;
      }
    }
  }

  if (numRed === numBlue) {
    game.setText("It's a tie!");
  } else if (numRed > numBlue) {
    game.setText(`Red wins ${numRed}:${numBlue}!`);
  } else {
    game.setText(`Blue wins ${numBlue}:${numRed}!`);
  }
}

function playMove(game: Game, dotClick: DotClick) {
  const point = dotClick.dot;

  const validDirections = getValidDirections(game, point, dotClick.player);

  // Colour in the clicked dot
  game.setDot(point.x, point.y, currentTurn);
  for (let direction of validDirections) {
    // Colour in dots
    let currentPoint = { x: point.x + direction.x, y: point.y + direction.y };
    while (game.getDot(currentPoint.x, currentPoint.y) !== currentTurn) {
      game.setDot(currentPoint.x, currentPoint.y, currentTurn);
      currentPoint = {
        x: currentPoint.x + direction.x,
        y: currentPoint.y + direction.y,
      };
    }
  }
}

function oppositePlayer(currentPlayer: Color): Color {
  if (currentPlayer == Color.Red) {
    return Color.Blue;
  }
  return Color.Red;
}

function validMoveInDirection(
  game: Game,
  point: Point,
  direction: Direction,
  player: Color
) {
  let opposite = oppositePlayer(player);

  function isLegalFirstMoveInDirection(p: Point, direction: Direction) {
    const currentPoint = {
      x: p.x + direction.x,
      y: p.y + direction.y,
    };

    // We've hit a wall
    if (currentPoint.x === -1 || currentPoint.x === 8) {
      return false;
    }
    if (currentPoint.y === -1 || currentPoint.y === 8) {
      return false;
    }

    const currentColor = game.getDot(currentPoint.x, currentPoint.y);

    if (currentColor !== opposite) {
      return false;
    }
    return isLegalRemainingMoveInDirection(currentPoint, direction);
  }

  function isLegalRemainingMoveInDirection(
    p: Point,
    direction: Direction
  ): boolean {
    const currentPoint = {
      x: p.x + direction.x,
      y: p.y + direction.y,
    };

    // We've hit a wall
    if (currentPoint.x === -1 || currentPoint.x === 8) {
      return false;
    }
    if (currentPoint.y === -1 || currentPoint.y === 8) {
      return false;
    }

    const currentColor = game.getDot(currentPoint.x, currentPoint.y);

    if (currentColor === Color.Gray) {
      return false;
    }

    if (currentColor === player) {
      return true;
    }

    // Else, the current dot is of the opposite colour, and we should continue
    // searching
    return isLegalRemainingMoveInDirection(currentPoint, direction);
  }

  return isLegalFirstMoveInDirection(point, direction);
}

function validMove(game: Game, point: Point, player: Color): boolean {
  if (game.getDot(point.x, point.y) !== Color.Gray) {
    return false;
  }
  return getValidDirections(game, point, player).length > 0;
}

function getValidDirections(
  game: Game,
  point: Point,
  player: Color
): Direction[] {
  let validDirections = [];
  for (let direction of directionVectors) {
    // Travel in each direction, and check that there's at least one dot of the
    // opposite colour, followed by a dot of this colour
    if (validMoveInDirection(game, point, direction, player)) {
      validDirections.push(direction);
    }
  }
  return validDirections;
}

function onDotClicked(x: number, y: number) {
  events.push({ kind: "dotClick", dot: { x, y }, player: currentTurn });
}

var config: GameConfig = {
  create: create,
  update: update,
  onDotClicked: onDotClicked,
  gridWidth: 8,
  gridHeight: 8,
  clearGrid: false,
};

var game = new Game(config);
game.run();
