import React, { useCallback, useEffect, useRef, useState } from 'react';

const GRID_COLOR = '#1f2937';

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
  const speedRef = useRef(1);
  const isMouseDown = useRef(false);
  const drawMode = useRef(1);

  // Core state
  const [cellSize, setCellSize] = useState(20);
  const [rows, setRows] = useState(20);
  const [cols, setCols] = useState(30);
  const [grid, setGrid] = useState<Uint8Array[]>(() => createEmptyGrid(rows, cols));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Additional parameters
  const [fillProb, setFillProb] = useState(0.25);
  const [showGrid, setShowGrid] = useState(true);
  const [aliveColor, setAliveColor] = useState('#06b6d4');
  const [deadColor, setDeadColor] = useState('#051025');
  const [wrapEdges, setWrapEdges] = useState(true);
  const [surviveCounts, setSurviveCounts] = useState([2, 3]);
  const [birthCounts, setBirthCounts] = useState([3]);
  const [pattern, setPattern] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  speedRef.current = speed;

  const surviveRef = useRef(surviveCounts);
  const birthRef = useRef(birthCounts);
  useEffect(() => { surviveRef.current = surviveCounts; }, [surviveCounts]);
  useEffect(() => { birthRef.current = birthCounts; }, [birthCounts]);

  // Panel drag
  const panelRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [panelPos, setPanelPos] = useState({ x: 20, y: 20 });

  const countNeighbors = (g: Uint8Array[], r: number, c: number) => {
    const R = g.length;
    const C = g[0].length;
    let sum = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        let nr = r + dr;
        let nc = c + dc;
        if (wrapEdges) {
          nr = (nr + R) % R;
          nc = (nc + C) % C;
        } else if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
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
        newG[r][c] = g[r][c]
          ? (surviveRef.current.includes(n) ? 1 : 0)
          : (birthRef.current.includes(n) ? 1 : 0);
      }
    }
    return newG;
  }, [wrapEdges]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;

    ctx.fillStyle = deadColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c]) {
          ctx.fillStyle = aliveColor;
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }

    if (showGrid) {
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
    }
  }, [grid, rows, cols, cellSize, aliveColor, deadColor, showGrid]);

  useEffect(() => draw(), [draw]);

  const runLoop = () => {
    let lastTime = performance.now();
    const loop = (time: number) => {
      if (!runningRef.current) return;
      const interval = 1000 / Math.max(0.25, speedRef.current);
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
    for (let r = 0; r < ng.length; r++)
      for (let c = 0; c < ng[0].length; c++)
        ng[r][c] = Math.random() < fillProb ? 1 : 0;
    return ng;
  });
  const clear = () => setGrid(() => createEmptyGrid(rows, cols));
  const stepOnce = () => setGrid((g) => step(g));

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - panelPos.x, y: e.clientY - panelPos.y };
  };
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) setPanelPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const handleMouseUp = () => { isDragging.current = false; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

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

  const patternOptions = ['Glider', 'Blinker', 'Block'];
  const applyPattern = (pat: string) => {
    const centerR = Math.floor(rows / 2);
    const centerC = Math.floor(cols / 2);
    const ng = createEmptyGrid(rows, cols);
    if (pat === 'Glider') [[1,0],[2,1],[0,2],[1,2],[2,2]].forEach(([r,c]) => ng[centerR+r][centerC+c] = 1);
    if (pat === 'Blinker') [[0,0],[0,1],[0,2]].forEach(([r,c]) => ng[centerR+r][centerC+c] = 1);
    if (pat === 'Block') [[0,0],[0,1],[1,0],[1,1]].forEach(([r,c]) => ng[centerR+r][centerC+c] = 1);
    setGrid(ng);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'auto', background: '#111827' }}>
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          top: panelPos.y,
          left: panelPos.x,
          background: 'rgba(17,24,39,0.95)',
          padding: '12px',
          borderRadius: '10px',
          maxWidth: '350px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        {/* Header */}
        <div
          onMouseDown={handleHeaderMouseDown}
          style={{ textAlign: 'center', marginBottom: '10px', fontWeight: 'bold', cursor: 'move', userSelect: 'none', padding: '4px 0', background: 'rgba(55,65,81,0.8)', borderRadius: '6px', fontSize: '1rem' }}
        >Conway's Game of Life</div>
        {/* Buttons */}
        {/* Buttons */}
<div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'nowrap' }}>
  {[
    { label: running ? 'Stop' : 'Start', onClick: toggleRunning, width: 60, bg: running ? '#06b6d4' : '#374151' },
    { label: 'Step', onClick: stepOnce, width: 60, bg: '#374151' },
    { label: 'Randomize', onClick: randomize, width: 80, bg: '#374151' },
    { label: 'Clear', onClick: clear, width: 60, bg: '#374151' },
    { label: 'Advanced', onClick: () => setShowAdvanced(prev => !prev), width: 80, bg: '#374151' },
  ].map(({ label, onClick, width, bg }) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        width: `${width}px`,
        padding: '6px',
        borderRadius: '6px',
        background: bg,
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 'normal',  // NOT bold now
        fontSize: '0.95rem',
      }}
    >
      {label}
    </button>
  ))}
</div>

        {/* Sliders */}
        {[
          ['Speed', speed, 0, 5, setSpeed, ' gen/s'],
          ['Cell size', cellSize, 6, 40, setCellSize, ' px'],
          ['Rows', rows, 5, 300, handleRowsChange, ''],
          ['Cols', cols, 5, 300, handleColsChange, '']
        ].map(([label, value, min, max, setter, unit], idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: 600 }}>
            <label style={{ width: '90px', fontWeight: 600 }}>{label}:</label>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="range"
                min={min as number}
                max={max as number}
                step={label === 'Speed' ? 0.25 : 1}
                value={value as number}
                onChange={(e) => setter(Number(e.target.value))}
                style={{ flex: 1, height: '8px', borderRadius: '4px' }}
              />
              <span style={{ minWidth: '50px', textAlign: 'right', fontSize: '0.95rem' }}>
                {`${value}${unit}`}
              </span>
            </div>
          </div>
        ))}

        {/* Advanced settings */}
        {showAdvanced && (
          <>
            {/* Fill prob slider */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: 600 }}>
              <label style={{ width: '90px' }}>Fill prob:</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={fillProb}
                onChange={(e) => setFillProb(Number(e.target.value))}
                style={{ flex: 1, marginRight: '6px', height: '8px', borderRadius: '4px' }}
              />
              <div style={{ width: '40px', textAlign: 'right', fontSize: '0.95rem' }}>{`${Math.round(fillProb * 100)}%`}</div>
            </div>

            {/* Color pickers */}
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <label>Alive:</label>
              <input type="color" value={aliveColor} onChange={(e) => setAliveColor(e.target.value)} />
              <label>Dead:</label>
              <input type="color" value={deadColor} onChange={(e) => setDeadColor(e.target.value)} />
            </div>

            {/* Toggles */}
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <label><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /> Show Grid</label>
              <label><input type="checkbox" checked={wrapEdges} onChange={(e) => setWrapEdges(e.target.checked)} /> Wrap Edges</label>
            </div>

            {/* Pattern selector */}
            <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontWeight: 600 }}>
              <label>Pattern:</label>
              <select
                value={pattern}
                onChange={(e) => { setPattern(e.target.value); applyPattern(e.target.value); }}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid #374151',
                  background: 'rgba(31, 41, 55, 0.95)',
                  color: '#fff',
                  fontWeight: 400,
                  cursor: 'pointer',
                  outline: 'none',
                  fontSize: '0.95rem'
                }}
              >
                <option value="">Select Pattern</option>
                {patternOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Life-like rules */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ marginBottom: '4px', fontWeight: 600 }}>Survive counts:</div>
              <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'space-between', gap: '6px' }}>
                {Array.from({ length: 9 }, (_, n) => (
                  <label key={`s${n}`} style={{ display: 'flex', alignItems: 'center', fontSize: '0.95rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={surviveCounts.includes(n)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSurviveCounts(prev => checked ? [...prev, n] : prev.filter(x => x !== n));
                      }}
                    />
                    <span style={{ marginLeft: '3px' }}>{n}</span>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: '6px', marginBottom: '4px', fontWeight: 600 }}>Birth counts:</div>
              <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'space-between', gap: '6px' }}>
                {Array.from({ length: 9 }, (_, n) => (
                  <label key={`b${n}`} style={{ display: 'flex', alignItems: 'center', fontSize: '0.95rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={birthCounts.includes(n)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setBirthCounts(prev => checked ? [...prev, n] : prev.filter(x => x !== n));
                      }}
                    />
                    <span style={{ marginLeft: '3px' }}>{n}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Canvas */}
      <div style={{ padding: '10px' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          style={{ display: 'block', cursor: 'crosshair', background: deadColor }}
        />
      </div>
    </div>
  );
}
