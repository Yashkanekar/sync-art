// frontend/src/canvas/Whiteboard.tsx
import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Line } from "react-konva";
import { socket } from "../socket";

type LineData = {
  id: string;
  points: number[];
  stroke: string; // color
  strokeWidth: number; // brush size
};

export default function Whiteboard() {
  const [lines, setLines] = useState<LineData[]>([]);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(4);
  const isDrawing = useRef(false);
  const currentId = useRef<string | null>(null);

  // Handle incoming draw events (with color/size)
  useEffect(() => {
    socket.on("draw:begin", (data: LineData & { x: number; y: number }) => {
      const { id, x, y, stroke, strokeWidth } = data;
      setLines((prev) => [
        ...prev,
        { id, points: [x, y], stroke, strokeWidth },
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

    return () => {
      socket.off("draw:begin");
      socket.off("draw:move");
    };
  }, []);

  // Mouse event handlers
  const handleMouseDown = (e: any) => {
    isDrawing.current = true;
    const pos = e.target.getStage()!.getPointerPosition()!;
    const id = `${socket.id}_${Date.now()}`;
    currentId.current = id;

    // Add the stroke locally, with selected color & size
    setLines((prev) => [
      ...prev,
      {
        id,
        points: [pos.x, pos.y],
        stroke: brushColor,
        strokeWidth: brushSize,
      },
    ]);

    // Broadcast begin, including color & size
    socket.emit("draw:begin", {
      id,
      x: pos.x,
      y: pos.y,
      stroke: brushColor,
      strokeWidth: brushSize,
    });
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || currentId.current == null) return;
    const pos = e.target.getStage()!.getPointerPosition()!;

    // Update locally
    setLines((prev) =>
      prev.map((line) =>
        line.id === currentId.current
          ? { ...line, points: [...line.points, pos.x, pos.y] }
          : line
      )
    );
    // Broadcast move
    socket.emit("draw:move", {
      id: currentId.current,
      x: pos.x,
      y: pos.y,
    });
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    currentId.current = null;
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
        }}
      >
        <label style={{ marginRight: 12 }}>
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
            style={{ marginLeft: 6, verticalAlign: "middle" }}
          />
          <span style={{ marginLeft: 4 }}>{brushSize}px</span>
        </label>
      </div>

      {/* Konva Stage */}
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
