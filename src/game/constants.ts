import { Ball, Pocket } from '../types/game';

export const TABLE_WIDTH = 800;
export const TABLE_HEIGHT = 400;
export const BALL_RADIUS = 12;
export const CUSHION_WIDTH = 20;
export const POCKET_RADIUS = 22;

export const PLAYFIELD_LEFT = CUSHION_WIDTH + POCKET_RADIUS / 2;
export const PLAYFIELD_RIGHT = TABLE_WIDTH - CUSHION_WIDTH - POCKET_RADIUS / 2;
export const PLAYFIELD_TOP = CUSHION_WIDTH + POCKET_RADIUS / 2;
export const PLAYFIELD_BOTTOM = TABLE_HEIGHT - CUSHION_WIDTH - POCKET_RADIUS / 2;
export const PLAYFIELD_WIDTH = PLAYFIELD_RIGHT - PLAYFIELD_LEFT;
export const PLAYFIELD_HEIGHT = PLAYFIELD_BOTTOM - PLAYFIELD_TOP;

export const BALL_RESTITUTION = 0.92;
export const FRICTION = 0.985;
export const ANGULAR_DAMPING = 0.5;
export const MAX_POWER = 60;
export const MIN_POWER = 5;

export const POCKETS: Pocket[] = [
  { x: PLAYFIELD_LEFT, y: PLAYFIELD_TOP, radius: POCKET_RADIUS },
  { x: TABLE_WIDTH / 2, y: PLAYFIELD_TOP - 5, radius: POCKET_RADIUS },
  { x: PLAYFIELD_RIGHT, y: PLAYFIELD_TOP, radius: POCKET_RADIUS },
  { x: PLAYFIELD_LEFT, y: PLAYFIELD_BOTTOM, radius: POCKET_RADIUS },
  { x: TABLE_WIDTH / 2, y: PLAYFIELD_BOTTOM + 5, radius: POCKET_RADIUS },
  { x: PLAYFIELD_RIGHT, y: PLAYFIELD_BOTTOM, radius: POCKET_RADIUS },
];

export const BALL_COLORS: { [key: number]: string } = {
  0: '#FFFFFF',
  1: '#FFD700',
  2: '#0000FF',
  3: '#FF0000',
  4: '#800080',
  5: '#FF8C00',
  6: '#006400',
  7: '#8B0000',
  8: '#000000',
  9: '#FFD700',
  10: '#0000FF',
  11: '#FF0000',
  12: '#800080',
  13: '#FF8C00',
  14: '#006400',
  15: '#8B0000',
};

export const createInitialBalls = (): Ball[] => {
  const balls: Ball[] = [];
  const startX = PLAYFIELD_WIDTH * 0.75 + PLAYFIELD_LEFT;
  const startY = PLAYFIELD_HEIGHT / 2 + PLAYFIELD_TOP;
  const offset = BALL_RADIUS * 2 + 0.5;

  balls.push({
    id: 0,
    type: 'cue',
    number: 0,
    x: PLAYFIELD_LEFT + PLAYFIELD_WIDTH * 0.25,
    y: startY,
    radius: BALL_RADIUS,
    pocketed: false,
  });

  const rackOrder = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];

  let idx = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      const num = rackOrder[idx];
      let type: Ball['type'] = 'solid';
      if (num === 0) type = 'cue';
      else if (num === 8) type = 'black';
      else if (num > 8) type = 'striped';

      balls.push({
        id: num,
        type,
        number: num,
        x: startX + row * offset * Math.cos(Math.PI / 6),
        y: startY + (col - row / 2) * offset,
        radius: BALL_RADIUS,
        pocketed: false,
      });
      idx++;
    }
  }

  return balls;
};

export const getBallTypeName = (type: string | null): string => {
  if (type === 'solid') return '实色球';
  if (type === 'striped') return '花色球';
  return '未分配';
};

export const getFoulMessage = (foul: string): string => {
  const messages: { [key: string]: string } = {
    cue_ball_pocketed: '母球落袋',
    wrong_ball_first: '先击打了非目标球',
    no_rail_hit: '击球后无球碰库',
    black_ball_premature: '未清完己方球打进黑八',
    cue_ball_off_table: '母球跳出台面',
    black_with_cue: '黑八与母球同时落袋',
    three_consecutive: '连续三次犯规',
  };
  return messages[foul] || '犯规';
};

export const getWinMessage = (reason: string): string => {
  const messages: { [key: string]: string } = {
    black_ball_pocketed: '恭喜！成功打进黑八！',
    opponent_three_fouls: '对手连续三次犯规，你获胜了！',
    opponent_premature_black: '对手未清球打进黑八，你获胜了！',
    opponent_black_with_cue: '对手母球随黑八落袋，你获胜了！',
  };
  return messages[reason] || '你赢了！';
};

export const getLoseMessage = (reason: string): string => {
  const messages: { [key: string]: string } = {
    premature_black: '未清完己方球打进黑八',
    black_with_cue: '黑八与母球同时落袋',
    three_consecutive_fouls: '连续三次犯规',
    opponent_black_pocketed: '对手打进黑八',
    surrender: '你认输了',
  };
  return messages[reason] || '你输了';
};
