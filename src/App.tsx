import React, { useCallback, useEffect, useRef, useState } from 'react';

const GRID_COLOR = '#1f2937';
const ALIVE_COLOR = '#06b6d4';
const DEAD_COLOR = '#051025';

function createEmptyGrid(rows: number, cols: number): Uint8Array[] {
  const g: Uint8Array[] = [];
  for (let r = 0; r < rows; r++) g[r] = new Uint8Array(cols);
  return g;
}

function cloneGrid(grid: Uint8Array[]): Uint8Array[] {
  return grid.map(row => new Uint8Array(row));
}

export default function App(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const speedRef = useRef(8);
  const isMouseDown = useRef(false);
  const drawMode = useRef(1);

  const [cellSize, setCellSize] = useState(20);
  const [rows] = useState(20);
  const [cols] = useState(30);
  const [grid, setGrid] = useState<Uint8Array[]>(() => createEmptyGrid(rows, cols));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(8);

  speedRef.current = speed;

  const countNeighbors = (g: Uint8Array[], r: number, c: number) => {
    const R = g.length;
    const C = g[0].length;
    let sum = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = (r + dr + R) % R;
        const nc = (c + dc + C) % C;
        sum += g[nr][nc];
      }
    }
    return sum;
  };

  const step = useCallback((g: Uint8Array[]) => {
    const newG = createEmptyGrid(g.length, g[0].length);
    for (let r = 0; r < g.length; r++) {
      for (let c = 0; c < g[0].length; c++) {
        const n = countNeighbors(g, r, c);
        newG[r][c] = g[r][c] ? (n === 2 || n === 3 ? 1 : 0) : n === 3 ? 1 : 0;
      }
    }
    return newG;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;

    ctx.fillStyle = DEAD_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c]) {
          ctx.fillStyle = ALIVE_COLOR;
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let x = 0; x <= cols * cellSize; x += cellSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, rows * cellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= rows * cellSize; y += cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(cols * cellSize, y + 0.5);
      ctx.stroke();
    }
  }, [grid, rows, cols, cellSize]);

  useEffect(() => draw(), [draw]);

  const runLoop = () => {
    let lastTime = performance.now();
    const loop = (time: number) => {
      if (!runningRef.current) return;
      const interval = 1000 / Math.max(1, speedRef.current);
      if (time - lastTime >= interval) {
        setGrid((g) => step(g));
        lastTime = time;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const toggleRunning = () => {
    runningRef.current = !runningRef.current;
    setRunning(runningRef.current);
    if (runningRef.current) runLoop();
    else if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isMouseDown.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    setGrid((g) => {
      const ng = cloneGrid(g);
      if (y >= 0 && y < rows && x >= 0 && x < cols) {
        drawMode.current = ng[y][x] ? 0 : 1;
        ng[y][x] = drawMode.current;
      }
      return ng;
    });
  };

  const handleMouseUp = () => {
    isMouseDown.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    setGrid((g) => {
      const ng = cloneGrid(g);
      if (y >= 0 && y < rows && x >= 0 && x < cols) {
        ng[y][x] = drawMode.current;
      }
      return ng;
    });
  };

  const randomize = () => {
    setGrid((g) => {
      const ng = createEmptyGrid(g.length, g[0].length);
      for (let r = 0; r < ng.length; r++) {
        for (let c = 0; c < ng[0].length; c++) {
          ng[r][c] = Math.random() > 0.75 ? 1 : 0;
        }
      }
      return ng;
    });
  };

  const clear = () => setGrid((g) => createEmptyGrid(g.length, g[0].length));
  const stepOnce = () => setGrid((g) => step(g));

  return (
    <div className="app">
      <div className="panel controls">
        <div className="row"><strong>Conway's Game of Life</strong></div>
        <div className="row">
          <button onClick={toggleRunning} className={running ? 'primary' : ''}>{running ? 'Stop' : 'Start'}</button>
          <button onClick={stepOnce}>Step</button>
          <button onClick={randomize}>Randomize</button>
          <button onClick={clear}>Clear</button>
        </div>
        <div className="row">
          <label className="info">Speed:</label>
          <input className="slider" type="range" min={1} max={24} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          <div className="info">{speed} gen/s</div>
        </div>
        <div className="row">
          <label className="info">Cell size:</label>
          <input className="slider" type="range" min={6} max={40} value={cellSize} onChange={(e) => setCellSize(Number(e.target.value))} />
          <div className="info">{cellSize}px</div>
        </div>
        <div className="row info">Rows: {rows} — Cols: {cols}</div>
        <div className="row info">Click or drag on canvas to toggle cells. Grid wraps at edges (toroidal).</div>
      </div>

      <div className="canvasWrap panel" style={{minHeight:400}}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        />
      </div>
    </div>
  );
}
