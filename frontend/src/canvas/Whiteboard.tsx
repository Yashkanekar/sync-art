// frontend/src/canvas/Whiteboard.tsx
import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Line } from "react-konva";
import { socket } from "../socket";

type LineData = {
  id: string;
  points: number[];
  stroke: string;
  strokeWidth: number;
};

export default function Whiteboard() {
  const [lines, setLines] = useState<LineData[]>([]);

  // Now track only your stroke IDs for undo,
  // and the actual LineData for redo.
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<LineData[]>([]);

  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(4);

  const isDrawing = useRef(false);
  const currentId = useRef<string | null>(null);

  // Listen for draw, remove, and redo events
  useEffect(() => {
    socket.on("draw:begin", (data: LineData & { x: number; y: number }) => {
      setLines((prev) => [
        ...prev,
        {
          id: data.id,
          points: [data.x, data.y],
          stroke: data.stroke,
          strokeWidth: data.strokeWidth,
        },
      ]);
    });

    socket.on("draw:move", (data: { id: string; x: number; y: number }) => {
      setLines((prev) =>
        prev.map((line) =>
          line.id === data.id
            ? { ...line, points: [...line.points, data.x, data.y] }
            : line
        )
      );
    });

    // Remove a single stroke by ID (undo)
    socket.on("draw:remove", (id: string) => {
      setLines((prev) => prev.filter((line) => line.id !== id));
    });

    // Re‑add a single stroke (redo)
    socket.on("draw:redo", (line: LineData) => {
      setLines((prev) => [...prev, line]);
    });

    return () => {
      socket.off("draw:begin");
      socket.off("draw:move");
      socket.off("draw:remove");
      socket.off("draw:redo");
    };
  }, []);

  // Start a stroke
  const handleMouseDown = (e: any) => {
    isDrawing.current = true;
    const pos = e.target.getStage()!.getPointerPosition()!;
    const id = `${socket.id}_${Date.now()}`;
    currentId.current = id;

    // Track this stroke for undo; new action means clear redo
    setUndoStack((us) => [...us, id]);
    setRedoStack([]);

    const newLine: LineData = {
      id,
      points: [pos.x, pos.y],
      stroke: brushColor,
      strokeWidth: brushSize,
    };

    setLines((prev) => [...prev, newLine]);
    socket.emit("draw:begin", { ...newLine, x: pos.x, y: pos.y });
  };

  // Continue a stroke
  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || !currentId.current) return;
    const pos = e.target.getStage()!.getPointerPosition()!;

    setLines((prev) =>
      prev.map((line) =>
        line.id === currentId.current
          ? { ...line, points: [...line.points, pos.x, pos.y] }
          : line
      )
    );

    socket.emit("draw:move", { id: currentId.current, x: pos.x, y: pos.y });
  };

  // End a stroke
  const handleMouseUp = () => {
    isDrawing.current = false;
    currentId.current = null;
  };

  // Undo: remove your last stroke
  const undo = () => {
    if (undoStack.length === 0) return;

    const lastId = undoStack[undoStack.length - 1];
    setUndoStack((us) => us.slice(0, -1));

    // Find & stash the removed stroke for redo
    const removed = lines.find((l) => l.id === lastId);
    if (!removed) return;
    setRedoStack((rs) => [...rs, removed]);

    // Broadcast removal
    socket.emit("draw:remove", lastId);
  };

  // Redo: re‑add your last removed stroke
  const redo = () => {
    if (redoStack.length === 0) return;

    const lastLine = redoStack[redoStack.length - 1];
    setRedoStack((rs) => rs.slice(0, -1));
    setUndoStack((us) => [...us, lastLine.id]);

    // Broadcast redo with full stroke data
    socket.emit("draw:redo", lastLine);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Toolbar */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "rgba(255,255,255,0.8)",
          padding: "8px 12px",
          borderRadius: 4,
          zIndex: 10,
          display: "flex",
          gap: "12px",
        }}
      >
        <button onClick={undo} disabled={undoStack.length === 0}>
          Undo
        </button>
        <button onClick={redo} disabled={redoStack.length === 0}>
          Redo
        </button>

        <label>
          Color:
          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            style={{ marginLeft: 6 }}
          />
        </label>

        <label>
          Size:
          <input
            type="range"
            min={1}
            max={50}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            style={{ marginLeft: 6 }}
          />
          <span style={{ marginLeft: 4 }}>{brushSize}px</span>
        </label>
      </div>

      {/* Canvas */}
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        style={{ background: "#f0f0f0" }}
      >
        <Layer>
          {lines.map((line) => (
            <Line
              key={line.id + line.points.length}
              points={line.points}
              stroke={line.stroke}
              strokeWidth={line.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
