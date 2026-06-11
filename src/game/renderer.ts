import { Ball } from '../types/game';
import {
  TABLE_WIDTH,
  TABLE_HEIGHT,
  BALL_RADIUS,
  CUSHION_WIDTH,
  POCKETS,
  BALL_COLORS,
  PLAYFIELD_LEFT,
  PLAYFIELD_WIDTH,
} from './constants';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private scale: number;
  private offsetX: number;
  private offsetY: number;

  constructor(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.ctx = ctx;
    this.width = canvasWidth;
    this.height = canvasHeight;
    this.calculateScale();
  }

  private calculateScale() {
    const scaleX = this.width / TABLE_WIDTH;
    const scaleY = this.height / TABLE_HEIGHT;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = (this.width - TABLE_WIDTH * this.scale) / 2;
    this.offsetY = (this.height - TABLE_HEIGHT * this.scale) / 2;
  }

  public resize(canvasWidth: number, canvasHeight: number) {
    this.width = canvasWidth;
    this.height = canvasHeight;
    this.calculateScale();
  }

  public worldToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.scale + this.offsetX,
      y: y * this.scale + this.offsetY,
    };
  }

  public screenToWorld(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this.offsetX) / this.scale,
      y: (y - this.offsetY) / this.scale,
    };
  }

  public clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  public drawTable() {
    const ctx = this.ctx;

    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, this.width, this.height);

    const tableX = this.offsetX;
    const tableY = this.offsetY;
    const tableW = TABLE_WIDTH * this.scale;
    const tableH = TABLE_HEIGHT * this.scale;

    const woodGradient = ctx.createLinearGradient(tableX, tableY, tableX, tableY + tableH);
    woodGradient.addColorStop(0, '#8B4513');
    woodGradient.addColorStop(0.3, '#A0522D');
    woodGradient.addColorStop(0.7, '#A0522D');
    woodGradient.addColorStop(1, '#654321');
    ctx.fillStyle = woodGradient;
    ctx.fillRect(tableX, tableY, tableW, tableH);

    const feltX = tableX + CUSHION_WIDTH * this.scale;
    const feltY = tableY + CUSHION_WIDTH * this.scale;
    const feltW = tableW - 2 * CUSHION_WIDTH * this.scale;
    const feltH = tableH - 2 * CUSHION_WIDTH * this.scale;

    const feltGradient = ctx.createRadialGradient(
      tableX + tableW / 2,
      tableY + tableH / 2,
      0,
      tableX + tableW / 2,
      tableY + tableH / 2,
      tableW / 2
    );
    feltGradient.addColorStop(0, '#1F7A3A');
    feltGradient.addColorStop(1, '#0F4A26');
    ctx.fillStyle = feltGradient;
    ctx.fillRect(feltX, feltY, feltW, feltH);

    const cushionGradient = ctx.createLinearGradient(feltX, feltY, feltX, feltY + 10 * this.scale);
    cushionGradient.addColorStop(0, '#0D3D1E');
    cushionGradient.addColorStop(1, '#1F7A3A');
    
    ctx.fillStyle = '#0D3D1E';
    ctx.fillRect(feltX, feltY - 5 * this.scale, feltW, 10 * this.scale);
    ctx.fillRect(feltX, feltY + feltH - 5 * this.scale, feltW, 10 * this.scale);
    ctx.fillRect(feltX - 5 * this.scale, feltY, 10 * this.scale, feltH);
    ctx.fillRect(feltX + feltW - 5 * this.scale, feltY, 10 * this.scale, feltH);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    const headStringX = tableX + (PLAYFIELD_LEFT + PLAYFIELD_WIDTH * 0.25) * this.scale;
    ctx.beginPath();
    ctx.moveTo(headStringX, feltY);
    ctx.lineTo(headStringX, feltY + feltH);
    ctx.stroke();
    ctx.setLineDash([]);

    const centerX = tableX + TABLE_WIDTH / 2 * this.scale;
    const centerY = tableY + TABLE_HEIGHT / 2 * this.scale;
    ctx.beginPath();
    ctx.arc(centerX, centerY, BALL_RADIUS * 4 * this.scale, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  public drawPockets() {
    const ctx = this.ctx;

    for (const pocket of POCKETS) {
      const pos = this.worldToScreen(pocket.x, pocket.y);
      const radius = pocket.radius * this.scale;

      const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
      gradient.addColorStop(0, '#000000');
      gradient.addColorStop(0.7, '#1a1a1a');
      gradient.addColorStop(1, '#333333');

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 3 * this.scale, 0, Math.PI * 2);
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 4 * this.scale;
      ctx.stroke();
    }
  }

  public drawBalls(balls: Ball[]) {
    const ctx = this.ctx;

    for (const ball of balls) {
      if (ball.pocketed) continue;

      const pos = this.worldToScreen(ball.x, ball.y);
      const radius = ball.radius * this.scale;

      if (ball.type === 'striped') {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        const stripeHeight = radius * 0.6;
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = BALL_COLORS[ball.number] || '#FFFFFF';
        ctx.fillRect(pos.x - radius, pos.y - stripeHeight / 2, radius * 2, stripeHeight);
        ctx.restore();
      } else if (ball.type === 'cue') {
        const gradient = ctx.createRadialGradient(
          pos.x - radius * 0.3,
          pos.y - radius * 0.3,
          0,
          pos.x,
          pos.y,
          radius
        );
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.7, '#E8E8E8');
        gradient.addColorStop(1, '#CCCCCC');

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      } else if (ball.type === 'black') {
        const gradient = ctx.createRadialGradient(
          pos.x - radius * 0.3,
          pos.y - radius * 0.3,
          0,
          pos.x,
          pos.y,
          radius
        );
        gradient.addColorStop(0, '#4D4D4D');
        gradient.addColorStop(0.7, '#1a1a1a');
        gradient.addColorStop(1, '#000000');

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      } else {
        const gradient = ctx.createRadialGradient(
          pos.x - radius * 0.3,
          pos.y - radius * 0.3,
          0,
          pos.x,
          pos.y,
          radius
        );
        const baseColor = BALL_COLORS[ball.number] || '#FFFFFF';
        gradient.addColorStop(0, this.lightenColor(baseColor, 40));
        gradient.addColorStop(0.7, baseColor);
        gradient.addColorStop(1, this.darkenColor(baseColor, 30));

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      if (ball.number > 0 && ball.number !== 8) {
        const labelRadius = radius * 0.45;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, labelRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = `bold ${radius * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(ball.number), pos.x, pos.y);
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pos.x - radius * 0.3, pos.y - radius * 0.3, radius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
    }
  }

  public drawCue(
    cueBallX: number,
    cueBallY: number,
    angle: number,
    power: number,
    canShoot: boolean,
    showGuide: boolean
  ) {
    const ctx = this.ctx;
    const cuePos = this.worldToScreen(cueBallX, cueBallY);
    const ballRadius = BALL_RADIUS * this.scale;

    if (showGuide && canShoot) {
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cuePos.x, cuePos.y);
      const guideLength = 300 * this.scale;
      ctx.lineTo(
        cuePos.x + Math.cos(angle) * guideLength,
        cuePos.y + Math.sin(angle) * guideLength
      );
      ctx.stroke();
      ctx.restore();
    }

    if (!canShoot) return;

    const powerRatio = power / 100;
    const cueLength = (100 + powerRatio * 150) * this.scale;
    const cueWidth = 6 * this.scale;
    const tipWidth = 3 * this.scale;
    const offsetFromBall = (ballRadius + 10) * this.scale;

    const startX = cuePos.x + Math.cos(angle + Math.PI) * offsetFromBall;
    const startY = cuePos.y + Math.sin(angle + Math.PI) * offsetFromBall;
    const endX = startX + Math.cos(angle + Math.PI) * cueLength;
    const endY = startY + Math.sin(angle + Math.PI) * cueLength;

    const perpX = -Math.sin(angle + Math.PI);
    const perpY = Math.cos(angle + Math.PI);

    ctx.save();

    const cueGradient = ctx.createLinearGradient(startX, startY, endX, endY);
    cueGradient.addColorStop(0, '#F5DEB3');
    cueGradient.addColorStop(0.1, '#DEB887');
    cueGradient.addColorStop(0.9, '#8B4513');
    cueGradient.addColorStop(1, '#654321');

    ctx.beginPath();
    ctx.moveTo(startX + perpX * tipWidth, startY + perpY * tipWidth);
    ctx.lineTo(startX - perpX * tipWidth, startY - perpY * tipWidth);
    ctx.lineTo(endX - perpX * cueWidth, endY - perpY * cueWidth);
    ctx.lineTo(endX + perpX * cueWidth, endY + perpY * cueWidth);
    ctx.closePath();
    ctx.fillStyle = cueGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(startX, startY, tipWidth, 0, Math.PI * 2);
    ctx.fillStyle = '#228B22';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(endX - perpX * cueWidth, endY - perpY * cueWidth);
    ctx.lineTo(endX + perpX * cueWidth, endY + perpY * cueWidth);
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  public drawPlacementIndicator(x: number, y: number, valid: boolean) {
    const ctx = this.ctx;
    const pos = this.worldToScreen(x, y);
    const radius = BALL_RADIUS * this.scale;

    ctx.save();
    ctx.globalAlpha = 0.6;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = valid ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 0, 0, 0.5)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = valid ? '#00FF00' : '#FF0000';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();

    ctx.restore();
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const B = Math.max(0, (num & 0x0000ff) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  public getScale(): number {
    return this.scale;
  }
}
