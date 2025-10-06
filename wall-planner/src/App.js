
import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";

import wall1Layout from "./wall1-layout.json";
import wall2Layout from "./wall2-layout.json";
import wall3Layout from "./wall3-layout.json";

// Paper sizes in cm
const PAPER_CM = {
  A1: { w: 59.4, h: 84.1 },
  A2: { w: 42.0, h: 59.4 },
  A3: { w: 29.7, h: 42.0 },
  A4: { w: 21.0, h: 29.7 },
  A5: { w: 14.8, h: 21.0 },
  A6: { w: 10.5, h: 14.8 },
};

// Wall definitions
const WALLS = {
  wall1: { wcm: 490, hcm: 300, json: wall1Layout },
  wall2: { wcm: 559, hcm: 300, json: wall2Layout },
  wall3: { wcm: 336, hcm: 300, json: wall3Layout },
};

// Simple ID
function uuid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [wallKey, setWallKey] = useState("wall1");
  const [tiles, setTiles] = useState([]);
  const [scale, setScale] = useState(3);
  const [gridCm, setGridCm] = useState(5);
  const wallRef = useRef(null);
  const dragRef = useRef(null);

  // Load JSON when wall changes
  useEffect(() => {
    const preset = WALLS[wallKey].json || [];
    setTiles(preset);
  }, [wallKey]);

  const wall = WALLS[wallKey];
  const canvasW = wall.wcm * scale;
  const canvasH = wall.hcm * scale;
  const gridPx = gridCm * scale;

  function onMouseDown(e, id) {
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = { id, offX: e.clientX - rect.left, offY: e.clientY - rect.top };
    // show controls for 3s
    setTiles(ts => ts.map(t => t.id === id ? { ...t, showControls: true } : t));
    setTimeout(() => {
      setTiles(ts => ts.map(t => t.id === id ? { ...t, showControls: false } : t));
    }, 3000);
  }
  function onMouseMove(e) {
    if (!dragRef.current || !wallRef.current) return;
    const { id, offX, offY } = dragRef.current;
    const rect = wallRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left - offX;
    let y = e.clientY - rect.top - offY;
    x = Math.round(x / gridPx) * gridPx;
    y = Math.round(y / gridPx) * gridPx;
    setTiles(ts => ts.map(t => t.id === id ? { ...t, x, y } : t));
  }
  function onMouseUp() {
    dragRef.current = null;
  }

  function rotateTile(id) {
    setTiles(ts => ts.map(t => t.id === id ? { ...t, rotated: !t.rotated, w: t.h, h: t.w } : t));
  }
  function deleteTile(id) {
    setTiles(ts => ts.filter(t => t.id !== id));
  }
  function uploadFor(id) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setTiles(ts => ts.map(t => t.id === id ? { ...t, img: reader.result } : t));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function addTile(size) {
    const paper = PAPER_CM[size];
    const w = paper.w * scale;
    const h = paper.h * scale;
    const x = Math.max(0, Math.floor(Math.random() * (canvasW - w)));
    const y = Math.max(0, Math.floor(Math.random() * (canvasH - h)));
    setTiles(ts => [...ts, { id: uuid(), size, x, y, w, h, rotated: false }]);
  }

  async function exportPNG() {
    if (!wallRef.current) return;
    const canvas = await html2canvas(wallRef.current, { backgroundColor: "#fff", scale: 2 });
    const a = document.createElement("a");
    a.download = `${wallKey}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  }
  function exportJSON() {
    const blob = new Blob([JSON.stringify(tiles, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${wallKey}-layout.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function importJSON() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const parsed = JSON.parse(text);
        setTiles(parsed);
      } catch {
        alert("Invalid JSON file");
      }
    };
    input.click();
  }

  return (
    <div style={{ background: "black", minHeight: "100vh", color: "white", padding: 16 }}>
      <h1>Wall Planner</h1>

      {/* Controls */}
      <div style={{ marginBottom: 8 }}>
        <label>Wall: </label>
        <select value={wallKey} onChange={(e) => setWallKey(e.target.value)}>
          <option value="wall1">Wall 1 (490×300 cm)</option>
          <option value="wall2">Wall 2 (559×300 cm)</option>
          <option value="wall3">Wall 3 (336×300 cm)</option>
        </select>

        <span style={{ marginLeft: 12 }}>
          Scale(px/cm): <input type="number" value={scale} onChange={(e)=>setScale(+e.target.value||1)} style={{ width: 60 }} />
        </span>
        <span style={{ marginLeft: 12 }}>
          Grid(cm): <input type="number" value={gridCm} onChange={(e)=>setGridCm(+e.target.value||1)} style={{ width: 60 }} />
        </span>
      </div>

      <div style={{ marginBottom: 8 }}>
        {["A1","A2","A3","A4","A5","A6"].map(s => (
          <button key={s} onClick={() => addTile(s)} style={{ marginRight: 6 }}>{s}</button>
        ))}
        <button onClick={exportPNG} style={{ marginLeft: 12 }}>Export PNG</button>
        <button onClick={exportJSON} style={{ marginLeft: 6 }}>Export JSON</button>
        <button onClick={importJSON} style={{ marginLeft: 6 }}>Import JSON</button>
      </div>

      {/* Canvas */}
      <div
        ref={wallRef}
        style={{ position: "relative", background: "white", width: canvasW, height: canvasH, margin: "0 auto" }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {tiles.map((t) => {
          const width = t.rotated ? t.h : t.w;
          const height = t.rotated ? t.w : t.h;
          return (
            <div
              key={t.id}
              style={{
                position: "absolute",
                left: t.x, top: t.y, width, height,
                border: "2px solid #333",
                background: t.img ? `url(${t.img}) center/cover` : "#ddd",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "black", fontSize: 12, cursor: "move"
              }}
              onMouseDown={(e)=>onMouseDown(e,t.id)}
              onDoubleClick={()=>uploadFor(t.id)}
              title="Drag to move • Double‑click to add photo"
            >
              {!t.img && `${t.size} ${t.rotated ? "(L)" : "(P)"}`}

              {t.showControls && (
                <div style={{ position: "absolute", bottom: -28, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
                  <button onClick={(e)=>{e.stopPropagation(); rotateTile(t.id);}}>Rotate</button>
                  <button onClick={(e)=>{e.stopPropagation(); deleteTile(t.id);}} style={{ background: "red", color: "white" }}>Delete</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
