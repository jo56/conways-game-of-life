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
  const [rows, setRows] = useState(20);
  const [cols, setCols] = useState(30);
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
    setGrid(() => {
      const ng = createEmptyGrid(rows, cols);
      for (let r = 0; r < ng.length; r++) {
        for (let c = 0; c < ng[0].length; c++) {
          ng[r][c] = Math.random() > 0.75 ? 1 : 0;
        }
      }
      return ng;
    });
  };

  const clear = () => setGrid(() => createEmptyGrid(rows, cols));
  const stepOnce = () => setGrid((g) => step(g));

  const controlRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px'
  };

  const infoLabelStyle: React.CSSProperties = {
    width: '80px'
  };

  const sliderStyle: React.CSSProperties = {
    flex: 1
  };

  return (
    <div className="app" style={{ padding: '10px', fontFamily: 'sans-serif', color: '#f0f0f0' }}>
      <div className="panel controls" style={{ marginBottom: '10px', padding: '10px', background: '#111827', borderRadius: '8px' }}>
        <div style={controlRowStyle}><strong>Conway's Game of Life</strong></div>
        <div style={controlRowStyle}>
          <button onClick={toggleRunning} style={{ padding: '4px 8px', background: running ? '#06b6d4' : '#374151', border: 'none', color: '#fff', borderRadius: '4px' }}>{running ? 'Stop' : 'Start'}</button>
          <button onClick={stepOnce} style={{ padding: '4px 8px' }}>Step</button>
          <button onClick={randomize} style={{ padding: '4px 8px' }}>Randomize</button>
          <button onClick={clear} style={{ padding: '4px 8px' }}>Clear</button>
        </div>

        <div style={controlRowStyle}>
        <label style={infoLabelStyle}>Speed:</label>
        <input className="slider" type="range" min={1} max={24} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={sliderStyle} />
        <div>{speed} gen/s</div>
        </div>

        <div style={controlRowStyle}>
        <label style={infoLabelStyle}>Cell size:</label>
        <input className="slider" type="range" min={6} max={40} value={cellSize} onChange={(e) => setCellSize(Number(e.target.value))} style={sliderStyle} />
        <div>{cellSize}px</div>
        </div>

        <div style={controlRowStyle}>
        <label style={infoLabelStyle}>Rows:</label>
        <input className="slider" type="range" min={5} max={200} value={rows} onChange={(e) => {
            const newRows = Number(e.target.value);
            setRows(newRows);
            setGrid(createEmptyGrid(newRows, cols));
        }} style={sliderStyle} />
        <div>{rows}</div>
        </div>

        <div style={controlRowStyle}>
        <label style={infoLabelStyle}>Cols:</label>
        <input className="slider" type="range" min={5} max={200} value={cols} onChange={(e) => {
            const newCols = Number(e.target.value);
            setCols(newCols);
            setGrid(createEmptyGrid(rows, newCols));
        }} style={sliderStyle} />
        <div>{cols}</div>
        </div>
      </div>

      <div className="canvasWrap panel" style={{ minHeight: 400, background: '#111827', borderRadius: '8px', padding: '10px' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          style={{ display: 'block', margin: '0 auto', cursor: 'crosshair', background: DEAD_COLOR }}
        />
      </div>
    </div>
  );
}
