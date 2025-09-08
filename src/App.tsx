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
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= cols * cellSize; x += cellSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.25, 0);
      ctx.lineTo(x + 0.25, rows * cellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= rows * cellSize; y += cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.25);
      ctx.lineTo(cols * cellSize, y + 0.25);
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

  const handleMouseUp = () => { isMouseDown.current = false; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    setGrid((g) => {
      const ng = cloneGrid(g);
      if (y >= 0 && y < rows && x >= 0 && x < cols) ng[y][x] = drawMode.current;
      return ng;
    });
  };

  const randomize = () => setGrid(() => {
    const ng = createEmptyGrid(rows, cols);
    for (let r = 0; r < ng.length; r++) for (let c = 0; c < ng[0].length; c++) ng[r][c] = Math.random() > 0.75 ? 1 : 0;
    return ng;
  });

  const clear = () => setGrid(() => createEmptyGrid(rows, cols));
  const stepOnce = () => setGrid((g) => step(g));

  const handleRowsChange = (newRows: number) => {
    setRows(newRows);
    setGrid((g) => {
      const newGrid = createEmptyGrid(newRows, cols);
      for (let r = 0; r < Math.min(g.length, newRows); r++) newGrid[r].set(g[r]);
      return newGrid;
    });
  };

  const handleColsChange = (newCols: number) => {
    setCols(newCols);
    setGrid((g) => g.map(row => {
      const newRow = new Uint8Array(newCols);
      newRow.set(row.slice(0, Math.min(row.length, newCols)));
      return newRow;
    }));
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'auto', background: '#111827' }}>
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          background: 'rgba(17,24,39,0.95)',
          padding: '12px',
          borderRadius: '10px',
          maxWidth: '300px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '10px' }}><strong>Conway's Game of Life</strong></div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <button onClick={toggleRunning} style={{ flex: 1, padding: '6px', borderRadius: '6px', background: running ? '#06b6d4' : '#374151', color: '#fff', border: 'none' }}>{running ? 'Stop' : 'Start'}</button>
          <button onClick={stepOnce} style={{ flex: 1, padding: '6px', borderRadius: '6px' }}>Step</button>
          <button onClick={randomize} style={{ flex: 1, padding: '6px', borderRadius: '6px' }}>Randomize</button>
          <button onClick={clear} style={{ flex: 1, padding: '6px', borderRadius: '6px' }}>Clear</button>
        </div>

        {[
          ['Speed', speed, 1, 24, setSpeed, ' gen/s'],
          ['Cell size', cellSize, 6, 40, setCellSize, ' px'],
          ['Rows', rows, 5, 300, handleRowsChange, ''],
          ['Cols', cols, 5, 300, handleColsChange, '']
        ].map(([label, value, min, max, setter, unit], idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ width: '80px', fontWeight: 500 }}>{label}:</label>
            <input
              type="range"
              min={min as number}
              max={max as number}
              value={value as number}
              onChange={(e) => setter(Number(e.target.value))}
              style={{ flex: 1, marginRight: '6px', height: '6px', borderRadius: '4px' }}
            />
            <div style={{ width: '40px', textAlign: 'right' }}>{value}{unit}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          style={{ display: 'block', cursor: 'crosshair', background: DEAD_COLOR }}
        />
      </div>
    </div>
  );
}
