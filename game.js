/* ════════════════════════════════════════════════════════════════
   INFINITE RUNNER — entities.js
   All game entities live here as ES6 classes.
   Each class is responsible for its own state, update logic, and
   drawing. The Game controller in game.js only calls:
       entity.update(deltaTime, gameSpeed)
       entity.draw(ctx)
   ════════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   CONSTANTS shared across all entities
   ──────────────────────────────────────────────────────────── */
const LANE_COUNT      = 3;
const PLAYER_WIDTH    = 36;
const PLAYER_HEIGHT   = 52;
const OBSTACLE_WIDTH  = 38;
const OBSTACLE_HEIGHT = 52;
const COIN_RADIUS     = 10;

// Lerp factor: how quickly the player slides between lanes.
// 0.18 = smooth but snappy. Range 0 (instant stop) – 1 (teleport).
const LANE_LERP = 0.18;


/* ──────────────────────────────────────────────────────────────
   HELPER: Linear Interpolation
   lerp(a, b, t) returns a value t% of the way from a to b.
   e.g. lerp(0, 100, 0.5) → 50
   ──────────────────────────────────────────────────────────── */
function lerp(a, b, t) {
  return a + (b - a) * t;
}


/* ════════════════════════════════════════════════════════════════
   CLASS: Player
   ════════════════════════════════════════════════════════════════ */
class Player {
  /**
   * @param {number[]} laneXPositions - Array of X pixel centres for each lane.
   *                                    e.g. [80, 240, 400]
   * @param {number}   groundY        - Y pixel where the player stands.
   */
  constructor(laneXPositions, groundY) {
    this.laneXPositions = laneXPositions;
    this.currentLane    = 1;          // Start in the middle lane (index 0,1,2)
    this.targetLane     = 1;

    // Exact pixel position — updated every frame via lerp()
    this.x = laneXPositions[1] - PLAYER_WIDTH / 2;
    this.y = groundY - PLAYER_HEIGHT;

    this.width  = PLAYER_WIDTH;
    this.height = PLAYER_HEIGHT;

    // Invincibility frames after a hit (prevents multi-hit from one obstacle)
    this.invincibleTimer  = 0;
    this.invincibleFrames = 90;   // ~1.5 seconds at 60fps

    // Visual flicker during invincibility
    this.visible = true;

    // Target X is the pixel centre of the target lane
    this._targetX = laneXPositions[1] - PLAYER_WIDTH / 2;

    // Running animation frame
    this._animFrame  = 0;
    this._animTimer  = 0;
    this._animSpeed  = 8; // frames between animation ticks
  }

  /* ── Lane Control ────────────────────────────────────────── */

  /** Move one lane to the left (if not already in leftmost lane). */
  moveLeft() {
    if (this.targetLane > 0) {
      this.targetLane--;
      this._updateTargetX();
    }
  }

  /** Move one lane to the right (if not already in rightmost lane). */
  moveRight() {
    if (this.targetLane < LANE_COUNT - 1) {
      this.targetLane++;
      this._updateTargetX();
    }
  }

  /** Recalculate _targetX whenever targetLane changes. */
  _updateTargetX() {
    this._targetX = this.laneXPositions[this.targetLane] - this.width / 2;
  }

  /* ── Update ──────────────────────────────────────────────── */

  /**
   * Called once per animation frame.
   * @param {number} dt - Delta time in seconds (frame-rate independent).
   */
  update(dt) {
    /*
      SMOOTH LANE SLIDING via Lerp:
      Instead of snapping x = targetX, we move x *towards* targetX by
      LANE_LERP * the remaining distance each frame.
      Result: exponential ease-out — fast at first, decelerates as it
      approaches the target. Feels like friction.
    */
    this.x = lerp(this.x, this._targetX, LANE_LERP);

    // Invincibility countdown
    if (this.invincibleTimer > 0) {
      this.invincibleTimer--;
      // Flicker: toggle visible every 5 frames
      this.visible = Math.floor(this.invincibleTimer / 5) % 2 === 0;
    } else {
      this.visible = true;
    }

    // Running animation tick
    this._animTimer++;
    if (this._animTimer >= this._animSpeed) {
      this._animTimer = 0;
      this._animFrame = (this._animFrame + 1) % 4;
    }
  }

  /* ── Draw ────────────────────────────────────────────────── */

  /**
   * Draws the player as a stylised character on the canvas.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!this.visible) return;   // flicker during invincibility

    const x = this.x;
    const y = this.y;
    const w = this.width;
    const h = this.height;

    // ── Body (gradient rectangle) ──────────────────────────
    const bodyGrad = ctx.createLinearGradient(x, y, x + w, y);
    bodyGrad.addColorStop(0, '#a855f7');
    bodyGrad.addColorStop(1, '#00c8ff');
    ctx.fillStyle = bodyGrad;
    this._roundRect(ctx, x + 4, y + 16, w - 8, h - 24, 6);
    ctx.fill();

    // ── Head ──────────────────────────────────────────────
    ctx.fillStyle = '#fcd5b0';   // skin tone
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 11, 11, 0, Math.PI * 2);
    ctx.fill();

    // ── Visor / eye stripe ────────────────────────────────
    ctx.fillStyle = '#00c8ff';
    this._roundRect(ctx, x + w / 2 - 8, y + 7, 16, 5, 2);
    ctx.fill();

    // ── Animated legs ─────────────────────────────────────
    // Leg offset oscillates between -6 and +6 using sin on animFrame
    const legSwing = Math.sin(this._animFrame * (Math.PI / 2)) * 6;
    ctx.fillStyle = '#1e1e40';
    // Left leg
    this._roundRect(ctx, x + 4,  y + h - 20, 12, 16 + legSwing,  3);
    ctx.fill();
    // Right leg
    this._roundRect(ctx, x + w - 16, y + h - 20, 12, 16 - legSwing, 3);
    ctx.fill();

    // ── Neon glow outline (thin stroke) ───────────────────
    ctx.strokeStyle = 'rgba(0, 200, 255, 0.4)';
    ctx.lineWidth = 1.5;
    this._roundRect(ctx, x + 4, y + 16, w - 8, h - 24, 6);
    ctx.stroke();
  }

  /** Tiny helper: draws a rounded rectangle path. */
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ── Collision Bounds ────────────────────────────────────── */

  /**
   * Returns the AABB (Axis-Aligned Bounding Box) for collision tests.
   * We shrink it slightly ("hitbox padding") so near-misses feel fair.
   * @returns {{ x, y, w, h }}
   */
  getBounds() {
    const pad = 6;   // pixels of visual forgiveness on each side
    return {
      x: this.x + pad,
      y: this.y + pad,
      w: this.width  - pad * 2,
      h: this.height - pad * 2,
    };
  }

  /** Triggers invincibility frames after a hit. */
  hit() {
    if (this.invincibleTimer > 0) return false;  // still invincible
    this.invincibleTimer = this.invincibleFrames;
    return true;   // hit registered
  }

  get isInvincible() {
    return this.invincibleTimer > 0;
  }
}


/* ════════════════════════════════════════════════════════════════
   CLASS: Obstacle
   ════════════════════════════════════════════════════════════════ */

// Visual variety: each style is a different drawn shape/colour
const OBSTACLE_STYLES = ['barrier', 'spike', 'crate'];

class Obstacle {
  /**
   * @param {number}   laneX     - X pixel centre of the lane this spawns in.
   * @param {number}   spawnY    - Y pixel to spawn at (top of screen or above).
   * @param {number}   groundY   - Y pixel where obstacles rest on the ground.
   */
  constructor(laneX, spawnY, groundY) {
    this.width  = OBSTACLE_WIDTH;
    this.height = OBSTACLE_HEIGHT;
    this.x      = laneX - this.width / 2;
    this.y      = spawnY;
    this.groundY = groundY;

    // Pick a random visual style for variety
    this.style = OBSTACLE_STYLES[Math.floor(Math.random() * OBSTACLE_STYLES.length)];

    // Flag used by game.js to remove this obstacle from the active array
    this.markedForRemoval = false;
  }

  /* ── Update ──────────────────────────────────────────────── */

  /**
   * Move the obstacle toward the player (downward on screen = "forward").
   * @param {number} dt        - Delta time in seconds.
   * @param {number} gameSpeed - Current scroll speed in pixels/second.
   */
  update(dt, gameSpeed) {
    this.y += gameSpeed * dt;

    // Once the obstacle has fully passed the bottom of the canvas,
    // flag it so the game loop can splice it out of the array.
    if (this.y > this.groundY + this.height + 20) {
      this.markedForRemoval = true;
    }
  }

  /* ── Draw ────────────────────────────────────────────────── */

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const { x, y, width: w, height: h } = this;

    switch (this.style) {
      case 'barrier':  this._drawBarrier(ctx, x, y, w, h); break;
      case 'spike':    this._drawSpike(ctx, x, y, w, h);   break;
      case 'crate':    this._drawCrate(ctx, x, y, w, h);   break;
    }
  }

  _drawBarrier(ctx, x, y, w, h) {
    // Red-orange striped police barrier
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(x, y + h * 0.3, w, h * 0.4);
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(x, y + h * 0.3, w / 2, h * 0.4);
    // Posts
    ctx.fillStyle = '#888';
    ctx.fillRect(x + 2,      y + h * 0.1, 6, h * 0.8);
    ctx.fillRect(x + w - 8,  y + h * 0.1, 6, h * 0.8);
    // Glow
    ctx.shadowColor = '#ff4757';
    ctx.shadowBlur  = 12;
    ctx.strokeStyle = '#ff4757';
    ctx.lineWidth   = 1;
    ctx.strokeRect(x, y + h * 0.3, w, h * 0.4);
    ctx.shadowBlur  = 0;
  }

  _drawSpike(ctx, x, y, w, h) {
    // Purple spike trap
    const spikeCount = 3;
    const sw = w / spikeCount;
    ctx.fillStyle = '#a855f7';
    for (let i = 0; i < spikeCount; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * sw,            y + h);
      ctx.lineTo(x + i * sw + sw / 2,   y);
      ctx.lineTo(x + i * sw + sw,       y + h);
      ctx.closePath();
      ctx.fill();
    }
    // Base plate
    ctx.fillStyle = '#4c1d95';
    ctx.fillRect(x, y + h - 8, w, 8);
    // Glow
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur  = 16;
    ctx.fillStyle   = 'rgba(168,85,247,0.3)';
    ctx.fillRect(x, y + h - 8, w, 8);
    ctx.shadowBlur  = 0;
  }

  _drawCrate(ctx, x, y, w, h) {
    // Cyan wire-frame crate
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(x, y + (h - w), w, w);    // square crate
    ctx.strokeStyle = '#00c8ff';
    ctx.lineWidth   = 2;
    ctx.strokeRect(x, y + (h - w), w, w);
    // Cross braces
    ctx.beginPath();
    ctx.moveTo(x,     y + (h - w));
    ctx.lineTo(x + w, y + h);
    ctx.moveTo(x + w, y + (h - w));
    ctx.lineTo(x,     y + h);
    ctx.strokeStyle = 'rgba(0,200,255,0.3)';
    ctx.lineWidth   = 1;
    ctx.stroke();
    // Glow
    ctx.shadowColor = '#00c8ff';
    ctx.shadowBlur  = 10;
    ctx.strokeStyle = '#00c8ff';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(x, y + (h - w), w, w);
    ctx.shadowBlur  = 0;
  }

  /* ── Collision Bounds ────────────────────────────────────── */

  /** @returns {{ x, y, w, h }} */
  getBounds() {
    const pad = 4;
    return {
      x: this.x + pad,
      y: this.y + pad,
      w: this.width  - pad * 2,
      h: this.height - pad * 2,
    };
  }
}


/* ════════════════════════════════════════════════════════════════
   CLASS: Coin
   ════════════════════════════════════════════════════════════════ */
class Coin {
  /**
   * @param {number} laneX   - X centre of the lane.
   * @param {number} spawnY  - Y to spawn at.
   */
  constructor(laneX, spawnY) {
    this.x      = laneX;
    this.y      = spawnY;
    this.radius = COIN_RADIUS;

    // A coin's left/top for bounds checks
    this.width  = this.radius * 2;
    this.height = this.radius * 2;

    this.markedForRemoval = false;
    this.collected        = false;

    // Spin animation
    this._spinAngle = 0;
    this._bobOffset = 0;
    this._bobPhase  = Math.random() * Math.PI * 2;  // randomise start
  }

  /** @param {number} dt @param {number} gameSpeed */
  update(dt, gameSpeed) {
    this.y += gameSpeed * dt;

    // Gentle bob (up-down sine wave)
    this._bobPhase  += dt * 4;
    this._bobOffset  = Math.sin(this._bobPhase) * 3;

    // Coin spin (the squish/stretch ellipse illusion)
    this._spinAngle += dt * 3;

    if (this.y > 900 + this.radius) {
      this.markedForRemoval = true;
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    if (this.collected) return;

    const cx = this.x;
    const cy = this.y + this._bobOffset;
    const r  = this.radius;

    // Ellipse width oscillates 0→r to simulate a spinning coin
    const xRadius = Math.abs(Math.cos(this._spinAngle)) * r;

    ctx.save();
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur  = 14;

    // Coin body
    const grad = ctx.createRadialGradient(cx - xRadius * 0.3, cy - 3, 1, cx, cy, r);
    grad.addColorStop(0, '#fff9c4');
    grad.addColorStop(0.5, '#ffd700');
    grad.addColorStop(1, '#b8860b');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(xRadius, 1), r, 0, 0, Math.PI * 2);
    ctx.fill();

    // $ symbol (only visible when facing front)
    if (xRadius > r * 0.5) {
      ctx.fillStyle   = '#b8860b';
      ctx.font        = `bold ${r}px monospace`;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', cx, cy);
    }

    ctx.restore();
  }

  /** @returns {{ x, y, w, h }} */
  getBounds() {
    return {
      x: this.x - this.radius,
      y: this.y - this.radius,
      w: this.radius * 2,
      h: this.radius * 2,
    };
  }

  /** Mark coin as collected — draw() will skip it and game will remove it. */
  collect() {
    this.collected        = true;
    this.markedForRemoval = true;
  }
}
/* ════════════════════════════════════════════════════════════════
   INFINITE RUNNER — input.js
   Centralises ALL user input: keyboard and touch/swipe.
   Decoupled from game logic — it simply exposes a queue of actions
   that the Game controller drains each frame.
   ════════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   CLASS: InputHandler

   Design pattern: "Action Queue"
   Rather than callbacks that mutate player state directly, we push
   string actions ('MOVE_LEFT', 'MOVE_RIGHT') onto a queue. Each
   game frame the Game controller calls consumeActions() and applies
   whatever is pending. This decouples input from game logic and
   makes it easy to add gamepad, AI, or replay support later.
   ──────────────────────────────────────────────────────────── */
class InputHandler {
  /**
   * @param {HTMLElement} touchTarget - Element to listen for touch events on.
   *                                    Typically the canvas or game wrapper.
   */
  constructor(touchTarget) {
    // Pending actions to be consumed by the game loop
    this._actionQueue = [];

    // --- Keyboard ---
    this._onKeyDown = this._onKeyDown.bind(this);
    window.addEventListener('keydown', this._onKeyDown);

    // --- Touch / Swipe ---
    this._touchStartX = 0;
    this._touchStartY = 0;
    // Minimum swipe distance in pixels before we register a swipe
    this._swipeThreshold = 30;

    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchEnd   = this._onTouchEnd.bind(this);
    touchTarget.addEventListener('touchstart', this._onTouchStart, { passive: true });
    touchTarget.addEventListener('touchend',   this._onTouchEnd,   { passive: true });
  }

  /* ── Keyboard Handler ────────────────────────────────────── */

  /**
   * Converts KeyboardEvent.key values to action strings.
   * We only push one action per keydown to prevent key-repeat
   * from flooding the queue.
   * @param {KeyboardEvent} e
   */
  _onKeyDown(e) {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();   // stop page scrolling
        this._push('MOVE_LEFT');
        break;

      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        this._push('MOVE_RIGHT');
        break;
    }
  }

  /* ── Touch Handlers ──────────────────────────────────────── */

  /** Record finger-down position. */
  _onTouchStart(e) {
    const touch       = e.changedTouches[0];
    this._touchStartX = touch.clientX;
    this._touchStartY = touch.clientY;
  }

  /**
   * On finger-lift, compute the delta and decide if it qualifies
   * as a horizontal swipe.
   * @param {TouchEvent} e
   */
  _onTouchEnd(e) {
    const touch  = e.changedTouches[0];
    const deltaX = touch.clientX - this._touchStartX;
    const deltaY = touch.clientY - this._touchStartY;

    /*
      We only act on HORIZONTAL swipes. If the user swiped more
      vertically than horizontally, ignore (they may be scrolling).
    */
    if (Math.abs(deltaX) < this._swipeThreshold) return;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    if (deltaX < 0) {
      this._push('MOVE_LEFT');
    } else {
      this._push('MOVE_RIGHT');
    }
  }

  /* ── Action Queue API ────────────────────────────────────── */

  /** Add an action string to the queue. */
  _push(action) {
    this._actionQueue.push(action);
  }

  /**
   * Returns all pending actions and clears the queue.
   * Called once per game frame by the Game controller.
   * @returns {string[]}
   */
  consumeActions() {
    const actions      = this._actionQueue.slice();
    this._actionQueue  = [];
    return actions;
  }

  /**
   * Clean up all event listeners (call when destroying the game).
   * Good practice to avoid memory leaks in SPA environments.
   */
  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    // Note: touchTarget reference is not stored here — caller is
    // responsible for removing touch listeners if needed.
  }
}
/* ════════════════════════════════════════════════════════════════
   INFINITE RUNNER — game.js
   The central Game Controller.
   Responsibilities:
     • Canvas sizing and lane geometry
     • requestAnimationFrame game loop with delta-time
     • State management (score, speed, health, phase)
     • Procedural spawning of obstacles and coins
     • AABB collision detection
     • HUD and background rendering
     • Wiring up InputHandler → Player
   ════════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   GAME CONSTANTS
   ──────────────────────────────────────────────────────────── */

// Gameplay tuning — centralised so you can tweak in one place
const CONFIG = {
  INITIAL_SPEED:     280,   // px / second
  SPEED_INCREMENT:   12,    // added to speed every SPEED_INTERVAL ms
  SPEED_INTERVAL:    3000,  // ms between speed-ups
  MAX_SPEED:         700,   // px / second cap
  MAX_HEALTH:        3,

  OBSTACLE_SPAWN_MIN: 900,  // ms between spawns (minimum)
  OBSTACLE_SPAWN_MAX: 1800, // ms between spawns (maximum)
  COIN_SPAWN_CHANCE:  0.45, // probability a coin spawns instead of obstacle

  POINTS_PER_SECOND:  10,   // score rate (before multipliers)
  POINTS_PER_COIN:    50,

  LANE_COUNT:         3,
  LANE_PADDING:       0.15, // fraction of canvas width reserved as side margin

  GROUND_Y_FACTOR:    0.80, // ground line at 80% of canvas height

  PARALLAX_LAYERS: [
    { speed: 0.15, dotSize: 1.2, colour: 'rgba(0,200,255,0.25)' },
    { speed: 0.35, dotSize: 1.8, colour: 'rgba(168,85,247,0.20)' },
    { speed: 0.60, dotSize: 2.2, colour: 'rgba(0,200,255,0.15)' },
  ],
};

/* ════════════════════════════════════════════════════════════════
   CLASS: ParallaxLayer
   Simple starfield / particle layer for depth illusion.
   ════════════════════════════════════════════════════════════════ */
class ParallaxLayer {
  constructor(canvasW, canvasH, { speed, dotSize, colour }) {
    this.speedFactor = speed;
    this.dotSize     = dotSize;
    this.colour      = colour;

    // Populate with random dot positions
    this.dots = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvasW,
      y: Math.random() * canvasH,
    }));

    this._h = canvasH;
    this._w = canvasW;
  }

  /** @param {number} dt @param {number} gameSpeed */
  update(dt, gameSpeed) {
    for (const dot of this.dots) {
      dot.y += gameSpeed * this.speedFactor * dt;
      if (dot.y > this._h + 4) {
        // Wrap to top
        dot.y = -4;
        dot.x = Math.random() * this._w;
      }
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    ctx.fillStyle = this.colour;
    for (const dot of this.dots) {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, this.dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}


/* ════════════════════════════════════════════════════════════════
   CLASS: Game  (main controller)
   ════════════════════════════════════════════════════════════════ */
class Game {
  constructor() {
    /* ── Canvas setup ──────────────────────────────────────── */
    this.canvas = document.getElementById('game-canvas');
    this.ctx    = this.canvas.getContext('2d');
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());

    /* ── Lane geometry (computed in _resizeCanvas) ─────────── */
    // laneXPositions[i] = pixel X of the centre of lane i
    this.laneXPositions = [];
    this.groundY        = 0;

    /* ── Game state ────────────────────────────────────────── */
    this.state = this._createInitialState();

    /* ── Entity pools ──────────────────────────────────────── */
    this.obstacles      = [];
    this.coins          = [];
    this.parallaxLayers = [];

    /* ── Player & Input ────────────────────────────────────── */
    this.player  = null;
    this.input   = new InputHandler(this.canvas);

    /* ── Spawn timers ──────────────────────────────────────── */
    this._nextSpawnIn   = 0;    // ms until next obstacle/coin spawn
    this._speedTimer    = 0;    // ms since last speed increase

    /* ── RAF handle (stored so we can cancel on game over) ─── */
    this._rafId         = null;

    /* ── DOM references ────────────────────────────────────── */
    this._scoreEl    = document.getElementById('score-display');
    this._healthEl   = document.getElementById('health-display');
    this._finalScore = document.getElementById('final-score');
    this._highScore  = document.getElementById('high-score-display');

    /* ── High score (persisted in localStorage) ────────────── */
    this._bestScore = Number(localStorage.getItem('ir_best') || 0);

    /* ── Bind UI buttons ───────────────────────────────────── */
    document.getElementById('start-btn')
      .addEventListener('click', () => this.start());

    document.getElementById('restart-btn')
      .addEventListener('click', () => this.start());
  }

  /* ────────────────────────────────────────────────────────────
     CANVAS SIZING
     Called on init and on every window resize.
     We size the canvas ELEMENT to match its CSS-displayed size so
     that 1 canvas pixel = 1 CSS pixel on standard displays.
     On Retina/HiDPI we could scale by devicePixelRatio — kept
     simple here for clarity.
     ──────────────────────────────────────────────────────────── */
  _resizeCanvas() {
    this.canvas.width  = this.canvas.parentElement.offsetWidth  || window.innerWidth;
    this.canvas.height = this.canvas.parentElement.offsetHeight || window.innerHeight;

    const W = this.canvas.width;
    const H = this.canvas.height;

    // Ground line
    this.groundY = H * CONFIG.GROUND_Y_FACTOR;

    // Lane centres: split the playfield (excluding side padding) into N lanes
    const margin       = W * CONFIG.LANE_PADDING;
    const playWidth    = W - margin * 2;
    const laneWidth    = playWidth / CONFIG.LANE_COUNT;
    this.laneXPositions = Array.from(
      { length: CONFIG.LANE_COUNT },
      (_, i) => margin + laneWidth * i + laneWidth / 2
    );

    // Rebuild parallax layers for new dimensions
    this.parallaxLayers = CONFIG.PARALLAX_LAYERS.map(
      cfg => new ParallaxLayer(W, H, cfg)
    );

    // If a player already exists, reposition it
    if (this.player) {
      this.player.laneXPositions = this.laneXPositions;
      this.player.y = this.groundY - this.player.height;
    }
  }

  /* ────────────────────────────────────────────────────────────
     STATE FACTORY
     Returns a clean state object. Centralising it here means
     "reset" is trivially implemented by just calling this again.
     ──────────────────────────────────────────────────────────── */
  _createInitialState() {
    return {
      running:   false,
      over:      false,
      score:     0,
      health:    CONFIG.MAX_HEALTH,
      speed:     CONFIG.INITIAL_SPEED,
    };
  }

  /* ────────────────────────────────────────────────────────────
     START / RESTART
     ──────────────────────────────────────────────────────────── */
  start() {
    // Reset state
    this.state       = this._createInitialState();
    this.state.running = true;
    this.obstacles   = [];
    this.coins       = [];
    this._nextSpawnIn = this._randomSpawnInterval();
    this._speedTimer  = 0;

    // Fresh player
    this.player = new Player(this.laneXPositions, this.groundY);

    // Hide overlays
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');

    // Kick off the loop (cancel any existing one first)
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._lastTime = performance.now();
    this._rafId    = requestAnimationFrame(ts => this._loop(ts));
  }

  /* ────────────────────────────────────────────────────────────
     THE GAME LOOP  — requestAnimationFrame
     ────────────────────────────────────────────────────────────

     requestAnimationFrame (rAF) is the browser's built-in mechanism
     for smooth animation. It:
       • Calls our callback before the next screen repaint (~60×/sec)
       • Pauses when the tab is hidden (saves battery/CPU)
       • Synchronises with the display's refresh rate

     The callback receives a high-resolution timestamp (DOMHighResTimeStamp)
     measured in milliseconds from page load.

     DELTA TIME (dt):
     We do NOT advance the game by a fixed number of pixels per frame.
     Instead we calculate dt = time since last frame (in seconds) and
     multiply all movements by it:
         position += speed × dt
     This makes the game FRAME-RATE INDEPENDENT — it runs at the
     same in-game speed whether the device renders at 30fps or 144fps.
     ──────────────────────────────────────────────────────────── */

  /** @param {DOMHighResTimeStamp} timestamp */
  _loop(timestamp) {
    // 1. Calculate delta time
    const dt        = Math.min((timestamp - this._lastTime) / 1000, 0.05);
    // ↑ Cap at 50ms to prevent huge jumps if the tab was hidden/unresponsive.
    this._lastTime  = timestamp;

    // 2. Update all game systems
    this._update(dt);

    // 3. Render everything
    this._draw();

    // 4. Schedule next frame (only if still running)
    if (this.state.running) {
      this._rafId = requestAnimationFrame(ts => this._loop(ts));
    }
  }

  /* ────────────────────────────────────────────────────────────
     UPDATE — advances all game logic by dt seconds
     ──────────────────────────────────────────────────────────── */
  _update(dt) {
    const { state } = this;

    // ── Process input ──────────────────────────────────────
    for (const action of this.input.consumeActions()) {
      if (action === 'MOVE_LEFT')  this.player.moveLeft();
      if (action === 'MOVE_RIGHT') this.player.moveRight();
    }

    // ── Update player ──────────────────────────────────────
    this.player.update(dt);

    // ── Update parallax background ─────────────────────────
    for (const layer of this.parallaxLayers) {
      layer.update(dt, state.speed);
    }

    // ── Speed scaling ──────────────────────────────────────
    this._speedTimer += dt * 1000;   // convert to ms
    if (this._speedTimer >= CONFIG.SPEED_INTERVAL) {
      this._speedTimer = 0;
      state.speed = Math.min(state.speed + CONFIG.SPEED_INCREMENT, CONFIG.MAX_SPEED);
    }

    // ── Score (time-based) ─────────────────────────────────
    state.score += CONFIG.POINTS_PER_SECOND * dt;

    // ── Spawn obstacles / coins ────────────────────────────
    this._nextSpawnIn -= dt * 1000;
    if (this._nextSpawnIn <= 0) {
      this._spawnEntity();
      this._nextSpawnIn = this._randomSpawnInterval();
    }

    // ── Update obstacles ───────────────────────────────────
    for (const obs of this.obstacles) obs.update(dt, state.speed);

    // ── Update coins ───────────────────────────────────────
    for (const coin of this.coins) coin.update(dt, state.speed);

    // ── Collision Detection ────────────────────────────────
    this._checkCollisions();

    // ── Garbage collection: remove off-screen entities ──────
    // (Array.filter creates a new array of only non-flagged entities)
    this.obstacles = this.obstacles.filter(o => !o.markedForRemoval);
    this.coins     = this.coins.filter(c => !c.markedForRemoval);

    // ── Update HUD ─────────────────────────────────────────
    this._scoreEl.textContent  = `Score: ${Math.floor(state.score)}`;
    this._healthEl.textContent = '❤️ '.repeat(state.health).trim() || '💀';
  }

  /* ────────────────────────────────────────────────────────────
     COLLISION DETECTION  —  AABB Algorithm
     ────────────────────────────────────────────────────────────

     AABB (Axis-Aligned Bounding Box) is the simplest and fastest
     collision test for rectangular hitboxes.

     Two rectangles A and B are NOT overlapping if ANY of these
     four gap conditions are true:
         A.right  < B.left      (A is fully to the left of B)
         A.left   > B.right     (A is fully to the right of B)
         A.bottom < B.top       (A is fully above B)
         A.top    > B.bottom    (A is fully below B)

     Conversely, they ARE overlapping if NONE of those gaps exist:
         A.right  >= B.left
         A.left   <= B.right
         A.bottom >= B.top
         A.top    <= B.bottom

     We use the logical AND of all four "not a gap" conditions.
     ──────────────────────────────────────────────────────────── */
  _checkCollisions() {
    const pBounds = this.player.getBounds();
    const pRight  = pBounds.x + pBounds.w;
    const pBottom = pBounds.y + pBounds.h;

    // ── Player vs Obstacles ────────────────────────────────
    for (const obs of this.obstacles) {
      if (obs.markedForRemoval) continue;

      const b      = obs.getBounds();
      const bRight  = b.x + b.w;
      const bBottom = b.y + b.h;

      // AABB test: overlap exists when there is NO separating axis
      const overlapping =
        pRight  >= b.x      &&   // no gap on the right
        pBounds.x <= bRight &&   // no gap on the left
        pBottom >= b.y      &&   // no gap on the bottom
        pBounds.y <= bBottom;    // no gap on the top

      if (overlapping) {
        const hitRegistered = this.player.hit();
        if (hitRegistered) {
          this.state.health--;
          this._flashScreen();
          if (this.state.health <= 0) {
            this._gameOver();
            return;
          }
        }
        // We do NOT mark the obstacle for removal — the player must
        // slide out of it (obstacle keeps moving forward).
      }
    }

    // ── Player vs Coins ────────────────────────────────────
    for (const coin of this.coins) {
      if (coin.collected) continue;

      const b       = coin.getBounds();
      const bRight  = b.x + b.w;
      const bBottom = b.y + b.h;

      const overlapping =
        pRight  >= b.x      &&
        pBounds.x <= bRight &&
        pBottom >= b.y      &&
        pBounds.y <= bBottom;

      if (overlapping) {
        coin.collect();
        this.state.score += CONFIG.POINTS_PER_COIN;
        this._spawnCoinEffect(coin.x, coin.y);
      }
    }
  }

  /* ────────────────────────────────────────────────────────────
     SPAWNING
     ──────────────────────────────────────────────────────────── */

  /** Returns a random ms interval for the next spawn. */
  _randomSpawnInterval() {
    const { OBSTACLE_SPAWN_MIN: min, OBSTACLE_SPAWN_MAX: max } = CONFIG;
    return min + Math.random() * (max - min);
  }

  /**
   * Spawns either an obstacle or a coin in a random lane.
   * Coin probability = CONFIG.COIN_SPAWN_CHANCE.
   */
  _spawnEntity() {
    const laneIdx = Math.floor(Math.random() * CONFIG.LANE_COUNT);
    const laneX   = this.laneXPositions[laneIdx];
    const spawnY  = -70;   // spawn just above the visible canvas

    if (Math.random() < CONFIG.COIN_SPAWN_CHANCE) {
      this.coins.push(new Coin(laneX, spawnY));
    } else {
      this.obstacles.push(new Obstacle(laneX, spawnY, this.groundY));
    }
  }

  /* ────────────────────────────────────────────────────────────
     DRAW — renders one complete frame
     ──────────────────────────────────────────────────────────── */
  _draw() {
    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;

    // 1. Clear
    ctx.clearRect(0, 0, W, H);

    // 2. Background
    this._drawBackground(ctx, W, H);

    // 3. Parallax particles
    for (const layer of this.parallaxLayers) layer.draw(ctx);

    // 4. Lanes
    this._drawLanes(ctx, W, H);

    // 5. Ground line
    this._drawGround(ctx, W);

    // 6. Coins (drawn before obstacles so obstacles appear on top)
    for (const coin of this.coins) coin.draw(ctx);

    // 7. Obstacles
    for (const obs of this.obstacles) obs.draw(ctx);

    // 8. Player
    this.player.draw(ctx);

    // 9. Screen flash effect
    if (this._flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 71, 87, ${this._flashAlpha})`;
      ctx.fillRect(0, 0, W, H);
      this._flashAlpha = Math.max(0, this._flashAlpha - 0.04);
    }

    // 10. Coin collection pop text
    this._drawCoinEffects(ctx);
  }

  _drawBackground(ctx, W, H) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(1, '#0d0d20');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  _drawLanes(ctx, W, H) {
    // Lane dividers as dashed neon lines
    ctx.setLineDash([18, 14]);
    ctx.lineWidth   = 1;
    ctx.strokeStyle = 'rgba(0, 200, 255, 0.12)';

    for (let i = 1; i < CONFIG.LANE_COUNT; i++) {
      const x = this.laneXPositions[i] - (this.laneXPositions[1] - this.laneXPositions[0]) / 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    ctx.setLineDash([]);  // reset dash
  }

  _drawGround(ctx, W) {
    const y = this.groundY;
    // Glowing ground horizon line
    ctx.shadowColor = '#00c8ff';
    ctx.shadowBlur  = 10;
    ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Subtle gradient below the ground line
    const grad = ctx.createLinearGradient(0, y, 0, y + 60);
    grad.addColorStop(0, 'rgba(0, 200, 255, 0.06)');
    grad.addColorStop(1, 'rgba(0, 200, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, W, 60);
  }

  /* ────────────────────────────────────────────────────────────
     EFFECTS
     ──────────────────────────────────────────────────────────── */

  _flashAlpha = 0;

  /** Briefly tint the whole screen red on a hit. */
  _flashScreen() {
    this._flashAlpha = 0.45;
  }

  // Coin "+50" pop effects
  _coinEffects = [];

  _spawnCoinEffect(x, y) {
    this._coinEffects.push({ x, y, alpha: 1, vy: -60 });
  }

  _drawCoinEffects(ctx) {
    const keep = [];
    for (const fx of this._coinEffects) {
      fx.y    += fx.vy * (1 / 60);   // rough approximation
      fx.alpha -= 0.03;
      if (fx.alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha  = fx.alpha;
      ctx.fillStyle    = '#ffd700';
      ctx.font         = 'bold 16px monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+50', fx.x, fx.y);
      ctx.restore();
      keep.push(fx);
    }
    this._coinEffects = keep;
  }

  /* ────────────────────────────────────────────────────────────
     GAME OVER
     ──────────────────────────────────────────────────────────── */
  _gameOver() {
    this.state.running = false;
    this.state.over    = true;

    const finalScore = Math.floor(this.state.score);

    // Persist high score
    if (finalScore > this._bestScore) {
      this._bestScore = finalScore;
      localStorage.setItem('ir_best', String(this._bestScore));
    }

    // Update Game Over overlay
    this._finalScore.textContent     = finalScore;
    this._highScore.textContent      = `Best: ${this._bestScore}`;

    document.getElementById('game-over-screen').classList.remove('hidden');
  }
}

/* ──────────────────────────────────────────────────────────────
   BOOTSTRAP
   Wait for the DOM to be ready, then instantiate the Game.
   ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  window._game = new Game();
});
