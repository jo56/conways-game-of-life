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
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const isMouseDown = useRef(false);
  const drawMode = useRef(1);

  const defaults = {
    cellSize: 25,
    rows: 25,
    cols: 30,
    speed: 2,
    fillProb: 0.25,
    showGrid: true,
    aliveColor: '#06b6d4',
    deadColor: '#051025',
    wrapEdges: true,
    surviveCounts: [2, 3],
    birthCounts: [3],
    pattern: '',
    showAdvanced: false
  };

  const [cellSize, setCellSize] = useState(defaults.cellSize);
  const [rows, setRows] = useState(defaults.rows);
  const [cols, setCols] = useState(defaults.cols);
  const [grid, setGrid] = useState<Uint8Array[]>(() => createEmptyGrid(defaults.rows, defaults.cols));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(defaults.speed);

  const [fillProb, setFillProb] = useState(defaults.fillProb);
  const [showGrid, setShowGrid] = useState(defaults.showGrid);
  const [aliveColor, setAliveColor] = useState(defaults.aliveColor);
  const [deadColor, setDeadColor] = useState(defaults.deadColor);
  const [wrapEdges, setWrapEdges] = useState(defaults.wrapEdges);
  const [surviveCounts, setSurviveCounts] = useState(defaults.surviveCounts);
  const [birthCounts, setBirthCounts] = useState(defaults.birthCounts);
  const [pattern, setPattern] = useState(defaults.pattern);
  const [showAdvanced, setShowAdvanced] = useState(defaults.showAdvanced);

  const [panelMinimized, setPanelMinimized] = useState(false);

  const surviveRef = useRef(surviveCounts);
  const birthRef = useRef(birthCounts);
  useEffect(() => { surviveRef.current = surviveCounts; }, [surviveCounts]);
  useEffect(() => { birthRef.current = birthCounts; }, [birthCounts]);
  const speedRef = useRef(speed);
useEffect(() => {
  speedRef.current = speed;
}, [speed]);

  

  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [panelPos, setPanelPos] = useState({ x: 20, y: 20 });
  const mousePos = useRef({ x: 0, y: 0 });

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 800;
      setIsMobile(mobile);
      if (!mobile && canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        setPanelPos({ x: rect.right + 10, y: rect.top });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const countNeighbors = (g: Uint8Array[], r: number, c: number) => {
    const R = g.length, C = g[0].length;
    let sum = 0;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        let nr = r + dr, nc = c + dc;
        if (wrapEdges) {
          nr = (nr + R) % R; nc = (nc + C) % C;
        } else if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
        sum += g[nr][nc];
      }
    return sum;
  };

  const step = useCallback((g: Uint8Array[]) => {
    const newG = createEmptyGrid(g.length, g[0].length);
    for (let r = 0; r < g.length; r++)
      for (let c = 0; c < g[0].length; c++) {
        const n = countNeighbors(g, r, c);
        newG[r][c] = g[r][c]
          ? (surviveRef.current.includes(n) ? 1 : 0)
          : (birthRef.current.includes(n) ? 1 : 0);
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

    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (grid[r][c]) {
          ctx.fillStyle = aliveColor;
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
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
    const interval = 1000 / Math.max(0.25, speedRef.current);  // <-- use ref
    if (time - lastTime >= interval) {
      setGrid(g => step(g));
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
    setGrid(g => {
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
    setGrid(g => {
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

  const clear = () => {
  setGrid(createEmptyGrid(rows, cols));
};

  const stepOnce = () => setGrid(g => step(g));

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - panelPos.x, y: e.clientY - panelPos.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      //console.log('Mouse position updated:', mousePos.current); 
      
      if (isDragging.current)
        setPanelPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const handleMouseUp = () => { isDragging.current = false; };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        e.preventDefault();
        
        console.log('Shift pressed! Current state:', {
          isMobile,
          mousePos: mousePos.current,
          currentPanelPos: panelPos
        });
        
        setIsMobile(false);
        
        const mouseX = mousePos.current.x || window.innerWidth / 2;
        const mouseY = mousePos.current.y || window.innerHeight / 2;
        
        // Simple positioning - just put it at mouse location with small offset
        const newX = Math.max(10, Math.min(mouseX - 200, window.innerWidth - 440));
        const newY = Math.max(10, Math.min(mouseY - 50, window.innerHeight - 400));
        
        console.log('Setting new panel position:', { newX, newY });
        
        // Force the panel position update
        setPanelPos({ x: newX, y: newY });
        
        // Also force a re-render by updating a dummy state if needed
        setTimeout(() => {
          console.log('Panel position after update:', panelPos);
        }, 100);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobile, panelPos]); // Add dependencies

  const handleRowsChange = (newRows: number) => {
    setRows(newRows);
    setGrid(g => {
      const newGrid = createEmptyGrid(newRows, cols);
      for (let r = 0; r < Math.min(g.length, newRows); r++) newGrid[r].set(g[r]);
      return newGrid;
    });
  };
  const handleColsChange = (newCols: number) => {
    setCols(newCols);
    setGrid(g => g.map(row => {
      const newRow = new Uint8Array(newCols);
      newRow.set(row.slice(0, Math.min(row.length, newCols)));
      return newRow;
    }));
  };

  const patternOptions = ['Glider', 'Blinker', 'Block'];
  const applyPattern = (pat: string) => {
    setGrid(g => {
      const newGrid = cloneGrid(g);
      const centerR = Math.floor(rows / 2);
      const centerC = Math.floor(cols / 2);

      const patternCells: [number, number][] =
        pat === 'Glider' ? [[1,0],[2,1],[0,2],[1,2],[2,2]] :
        pat === 'Blinker' ? [[0,0],[0,1],[0,2]] :
        pat === 'Block' ? [[0,0],[0,1],[1,0],[1,1]] :
        [];

      patternCells.forEach(([r, c]) => {
        const row = centerR + r;
        const col = centerC + c;
        if (row >= 0 && row < rows && col >= 0 && col < cols) {
          newGrid[row][col] = 1;
        }
      });

      return newGrid;
    });
  };

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: '#111827',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'flex-start'
    }}>
      <div ref={canvasContainerRef} style={{ padding: '10px', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          style={{ display: 'block', cursor: 'crosshair', background: deadColor }}
        />
      </div>

      <div
        ref={panelRef}
        style={{
          position: isMobile ? 'relative' : 'fixed',
          top: isMobile ? undefined : panelPos.y,
          left: isMobile ? undefined : panelPos.x,
          marginTop: isMobile ? '10px' : undefined,
          background: 'rgba(17,24,39,0.95)',
          padding: '12px',
          borderRadius: '10px',
          maxWidth: '430px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        {/* Header with minimize button */}
        <div
        onMouseDown={handleHeaderMouseDown}
        style={{
            fontWeight: 500,
            textAlign: 'center',
            marginBottom: '12px',
            cursor: 'move',
            padding: '1px 1px',
            background: 'rgba(55,65,81,0.8)',
            borderRadius: '6px',
            fontSize: '1rem',
            userSelect: 'none',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0px'   // spacing between text and button
        }}
        >
        <span>Conway's Game of Life</span>
        <button
            onClick={() => setPanelMinimized(prev => !prev)}
            style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '1rem',
            width: '20px',         // fixed width prevents text shift
            textAlign: 'center'
            }}
        >
            {panelMinimized ? '+' : '-'}
        </button>
        </div>
        {/* Panel contents with collapse animation */}
        <div style={{
          maxHeight: panelMinimized ? '0px' : '2000px',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease'
        }}>
          <div style={{
            opacity: panelMinimized ? 0 : 1,
            transition: 'opacity 0.3s ease',
            pointerEvents: panelMinimized ? 'none' : 'auto'
          }}>
            {/* Buttons */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {[ 
                { label: running ? 'Stop' : 'Start', onClick: toggleRunning, bg: running ? '#06b6d4' : '#374151' },
                { label: 'Step', onClick: stepOnce, bg: '#374151' },
                { label: 'Random', onClick: randomize, bg: '#374151' },
                { label: 'Clear', onClick: clear, bg: '#374151' },
                { label: 'Adv.', onClick: () => setShowAdvanced(prev => !prev), bg: '#374151' },
              ].map(({ label, onClick, bg }) => (
                <button
                  key={label}
                  onClick={onClick}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: bg,
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'normal',
                    fontSize: '0.95rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sliders */}
            {[['Speed', speed, 0.25, 100, setSpeed, ' gen/s'],
              ['Cell size', cellSize, 1, 40, setCellSize, ' px'],
              ['Rows', rows, 5, 1000, handleRowsChange, ''],
              ['Cols', cols, 5, 1000, handleColsChange, '']].map(([label, value, min, max, setter, unit], idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ width: '100px', fontWeight: 600 }}>{label}:</label>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
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

            {/* Advanced Settings */}
            {showAdvanced && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ width: '100px', fontWeight: 600 }}>Random Fill:</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={fillProb}
                    onChange={(e) => setFillProb(Number(e.target.value))}
                    style={{ flex: 1, marginRight: '8px', height: '8px', borderRadius: '4px' }}
                  />
                  <div style={{ width: '40px', textAlign: 'right', fontSize: '0.95rem' }}>
                    {`${Math.round(fillProb * 100)}%`}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', gap: '8px' }}>
                  <label style={{ fontWeight: 600 }}>Alive:</label>
                  <input type="color" value={aliveColor} onChange={e => setAliveColor(e.target.value)} />
                  <label style={{ fontWeight: 600 }}>Dead:</label>
                  <input type="color" value={deadColor} onChange={e => setDeadColor(e.target.value)} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', gap: '8px', fontWeight: 600 }}>
                  <label><input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} /> Show Grid</label>
                  <label><input type="checkbox" checked={wrapEdges} onChange={e => setWrapEdges(e.target.checked)} /> Wrap Edges</label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '10px', gap: '4px' }}>
                  <label style={{ fontWeight: 600 }}>Starting Pattern:</label>
                  <select
                    value={pattern}
                    onChange={(e) => { setPattern(e.target.value); applyPattern(e.target.value); }}
                    style={{ padding: '4px 8px', borderRadius: '6px', background: '#374151', color: '#fff', border: 'none' }}
                  >
                    <option value="">None</option>
                    {patternOptions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <div style={{ marginBottom: '4px', fontWeight: 600 }}>Survive counts:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
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
        </div>
      </div>
    </div>
  );
}