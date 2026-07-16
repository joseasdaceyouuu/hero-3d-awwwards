"use client";

/**
 * GRAVITAS — Hero con physics simulation (Matter.js).
 *
 * NUEVO ARQUETIPO 6: Physics Simulation
 * Tipografía que cae con gravedad, stackea, y reacciona al cursor como
 * objeto físico (no como uniform de shader). No-determinismo controlado.
 *
 * Inspirado en Bruno Simon's portfolio (Awwwards Site of the Year 2025).
 *
 * TÉCNICAS NUEVAS:
 *   - Matter.js physics engine (gravidad, colisiones, fricción)
 *   - Letras como bodies físicos con masa y forma rectangular
 *   - Mouse constraint: cursor arrastra letras físicamente
 *   - Ground + walls invisibles para que las letras stackeen
 *   - Click → explosión (aplicar fuerza radial a todas las letras)
 *
 * Anti-patterns: 5.9 (overflow clip), 5.18 (preloader timer)
 */

import { useState, useEffect, useRef } from "react";
import Matter from "matter-js";
import { HeroPolish } from "@/lib/library/components/HeroPolish";

export default function GravitasHero() {
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const lettersRef = useRef<Matter.Body[]>([]);

  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 1800);
    return () => clearTimeout(t);
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Motor de física
    const engine = Matter.Engine.create();
    engine.gravity.y = 1;
    engineRef.current = engine;

    // Ground + walls
    const ground = Matter.Bodies.rectangle(width / 2, height + 30, width, 60, { isStatic: true, restitution: 0.3 });
    const wallLeft = Matter.Bodies.rectangle(-30, height / 2, 60, height, { isStatic: true });
    const wallRight = Matter.Bodies.rectangle(width + 30, height / 2, 60, height, { isStatic: true });
    Matter.World.add(engine.world, [ground, wallLeft, wallRight]);

    // Crear letras como bodies físicos
    const word = "GRAVITAS";
    const letterSpacing = 90;
    const startX = width / 2 - (word.length * letterSpacing) / 2;
    const letters: Matter.Body[] = [];

    for (let i = 0; i < word.length; i++) {
      const x = startX + i * letterSpacing;
      const y = -100 - i * 50; // Caen en cascada
      const body = Matter.Bodies.rectangle(x, y, 70, 90, {
        restitution: 0.4,
        friction: 0.1,
        density: 0.002,
        angle: (Math.random() - 0.5) * 0.3,
      });
      // Guardar la letra en el body
      (body as any).letter = word[i];
      (body as any).color = ["#C9A05E", "#7BA7BC", "#f0f0f5", "#ff0055", "#00ff88"][i % 5];
      letters.push(body);
      Matter.World.add(engine.world, body);
    }
    lettersRef.current = letters;

    // Mouse constraint — cursor arrastra letras
    const mouse = Matter.Mouse.create(canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    });
    Matter.World.add(engine.world, mouseConstraint);

    // Click → explosión
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      letters.forEach((body) => {
        const dx = body.position.x - cx;
        const dy = body.position.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 300 && dist > 0) {
          const force = (300 - dist) / 300 * 0.15;
          Matter.Body.applyForce(body, body.position, {
            x: (dx / dist) * force,
            y: (dy / dist) * force - 0.05,
          });
        }
      });
    };
    canvas.addEventListener("click", onClick);

    // Resize
    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    // Render loop
    let raf: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Fondo radial
      const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
      grad.addColorStop(0, "#0a0a12");
      grad.addColorStop(1, "#020205");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Dibujar letras
      for (const body of letters) {
        const { x, y } = body.position;
        const angle = body.angle;
        const letter = (body as any).letter;
        const color = (body as any).color;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.fillStyle = color;
        ctx.font = "bold 80px Syne, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(letter, 0, 0);

        ctx.restore();
      }

      // Hint
      if (letters.every((l) => l.position.y > height - 200)) {
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.font = "12px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("[ ARRASTRA LAS LETRAS · CLICK PARA EXPLOSIÓN ]", width / 2, 50);
      }

      raf = requestAnimationFrame(render);
    };
    render();

    // Physics loop
    const physicsInterval = setInterval(() => {
      Matter.Engine.update(engine, 16.666);
    }, 16.666);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(physicsInterval);
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
    };
  }, [loaded]);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip", background: "#020205" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@300;400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { overflow-x: clip; overflow-y: hidden; height: 100vh; }
        body { background: #020205; color: #fff; font-family: 'JetBrains Mono', monospace; cursor: grab; }
        body:active { cursor: grabbing; }
        @keyframes load { to { width: 100%; } }
      `}</style>

      {!loaded && (
        <div style={{ position: "fixed", inset: 0, background: "#020205", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "24px", fontWeight: 800, color: "#C9A05E", letterSpacing: "0.15em", marginBottom: "20px" }}>GRAVITAS</div>
          <div style={{ width: "220px", height: "2px", background: "rgba(255,255,255,0.1)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "0%", background: "#C9A05E", animation: "load 1.8s ease-in-out forwards" }} />
          </div>
        </div>
      )}

      {loaded && (
        <>
          <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 1 }} aria-label="Hero interactivo con física. Arrastra las letras o click para explosión." tabIndex={0} />

          {/* HUD */}
          <div style={{ position: "fixed", top: "30px", left: "40px", zIndex: 20, fontSize: "9px", color: "rgba(201,160,94,0.4)", letterSpacing: "0.2em", textTransform: "uppercase" }} aria-hidden>
            <div>PHYSICS · MATTER.JS</div>
            <div>GRAVITY · 1.0</div>
            <div>RESTITUTION · 0.4</div>
          </div>
          <div style={{ position: "fixed", top: "30px", right: "40px", zIndex: 20, fontSize: "9px", color: "rgba(201,160,94,0.4)", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "right" }} aria-hidden>
            <div>ARQUETIPO · 06</div>
            <div>BODIES · {word.length}</div>
            <div>ENGINE · 60FPS</div>
          </div>

          {/* Volver */}
          <a href="/heroes" style={{ position: "fixed", bottom: "30px", right: "50%", transform: "translateX(50%)", zIndex: 20, fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.3em", textTransform: "uppercase", textDecoration: "none" }} aria-label="Volver a galería">← Galería</a>
        </>
      )}
            <HeroPolish accentColor="#7BA7BC" />
      </main>
  );
}

const word = "GRAVITAS";
