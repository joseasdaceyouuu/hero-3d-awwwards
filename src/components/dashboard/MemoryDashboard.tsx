"use client";

/**
 * MemoryDashboard.tsx
 *
 * Visualización en vivo del sistema de memoria del skill hero-3d-awwwards.
 * Muestra episodios, patrones, anti-patterns, skills + retrieval simulator.
 *
 * Lee de /api/memory/* que a su vez lee la SQLite DB en memory-data/memory.db.
 */

import { useEffect, useState, useCallback } from "react";

interface Stats {
  episodes: number;
  patterns: number;
  skills: number;
  anti_patterns: number;
  avg_score: number | null;
  top_vertical: string | null;
  top_category: string | null;
}

interface Episode {
  id: string;
  timestamp: string;
  brief: string;
  brief_summary: string;
  vertical: string | null;
  archetype: string | null;
  stack: string | null;
  final_score: number;
  final_subjective_score: number;
  outcome: string;
  user_feedback: string | null;
}

interface Pattern {
  id: string;
  content: string;
  vertical: string | null;
  category: string | null;
  importance: number;
  created_at: string;
  last_accedido: string;
  access_count: number;
}

interface AntiPattern {
  id: string;
  description: string;
  failure_mode: string | null;
  occurrence_count: number;
  created_at: string;
  last_seen: string;
  status: string;
}

interface Skill {
  id: string;
  description: string;
  success_count: number;
  fail_count: number;
  last_used: string | null;
  valid_verticals: string | null;
  status: string;
  created_at: string;
}

interface RetrievalResult {
  brief: string;
  vertical: string;
  patterns: Array<{
    id: string;
    content: string;
    category: string;
    importance: number;
    vertical: string;
  }>;
  skills: Array<{
    id: string;
    description: string;
    success_count: number;
    valid_verticals: string[];
  }>;
  anti_patterns: Array<{
    id: string;
    description: string;
    failure_mode: string;
    occurrence_count: number;
  }>;
  stats: Stats;
}

export function MemoryDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [antiPatterns, setAntiPatterns] = useState<AntiPattern[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"patterns" | "episodes" | "anti" | "skills" | "simulator">("patterns");

  const [simBrief, setSimBrief] = useState("Design a hero with procedural noise background and particles for a creative agency");
  const [simVertical, setSimVertical] = useState("agency");
  const [simResult, setSimResult] = useState<RetrievalResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterMinImportance, setFilterMinImportance] = useState<number>(0);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, epRes, patRes, apRes, skillRes] = await Promise.all([
        fetch("/api/memory/stats").then((r) => r.json()),
        fetch("/api/memory/episodes").then((r) => r.json()),
        fetch("/api/memory/patterns").then((r) => r.json()),
        fetch("/api/memory/anti-patterns").then((r) => r.json()),
        fetch("/api/memory/skills").then((r) => r.json()),
      ]);

      setStats(statsRes);
      setEpisodes(epRes.episodes || []);
      setPatterns(patRes.patterns || []);
      setAntiPatterns(apRes.anti_patterns || []);
      setSkills(skillRes.skills || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const runRetrieval = async () => {
    setSimLoading(true);
    setSimError(null);
    try {
      const res = await fetch("/api/memory/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: simBrief,
          vertical: simVertical,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setSimError(data.error);
      } else {
        setSimResult(data);
      }
    } catch (e) {
      setSimError(String(e));
    } finally {
      setSimLoading(false);
    }
  };

  const filteredPatterns = patterns.filter((p) => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterMinImportance && p.importance < filterMinImportance) return false;
    return true;
  });

  const categories = Array.from(new Set(patterns.map((p) => p.category).filter(Boolean)));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#030014", color: "#fff" }}>
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
            Cargando memoria...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#030014", color: "#fff" }}>
        <div className="max-w-md text-center">
          <p className="text-[#ff0040] mb-4 text-sm uppercase tracking-widest">Error</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#030014", color: "#fff" }}>
      <header className="border-b border-white/5 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Panel de Memoria
              </h1>
              <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "#00d4ff" }}>
                hero-3d-awwwards · skill v5
              </p>
            </div>
            <button
              onClick={fetchAll}
              className="text-xs uppercase tracking-widest border border-white/10 px-4 py-2 hover:border-[#00d4ff] hover:text-[#00d4ff] transition-colors"
            >
              ↻ Actualizar
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Episodios" value={stats?.episodes ?? 0} accent="#00d4ff" />
            <StatCard label="Patrones" value={stats?.patterns ?? 0} accent="#b026ff" />
            <StatCard label="Habilidades" value={stats?.skills ?? 0} accent="#00ff88" />
            <StatCard label="Anti-patrones" value={stats?.anti_patterns ?? 0} accent="#ff0040" />
            <StatCard
              label="Promedio"
              value={stats?.avg_score ? stats.avg_score.toFixed(1) : "—"}
              accent="#ffaa00"
            />
          </div>

          {(stats?.top_vertical || stats?.top_category) && (
            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              {stats.top_vertical && (
                <span style={{ color: "rgba(255,255,255,0.4)" }}>
                  Vertical principal:{" "}
                  <span style={{ color: "#00d4ff" }}>{stats.top_vertical}</span>
                </span>
              )}
              {stats.top_category && (
                <span style={{ color: "rgba(255,255,255,0.4)" }}>
                  Categoría principal:{" "}
                  <span style={{ color: "#b026ff" }}>{stats.top_category}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <nav className="border-b border-white/5 sticky top-0 z-10" style={{ background: "rgba(3,0,20,0.95)", backdropFilter: "blur(10px)" }}>
        <div className="max-w-7xl mx-auto flex gap-1 px-6 md:px-8 overflow-x-auto">
          {[
            { id: "patterns", label: `Patrones (${patterns.length})` },
            { id: "episodes", label: `Episodios (${episodes.length})` },
            { id: "anti", label: `Anti-patrones (${antiPatterns.length})` },
            { id: "skills", label: `Habilidades (${skills.length})` },
            { id: "simulator", label: "Simulador de Recuperación" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-4 text-xs uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#00d4ff] text-[#00d4ff]"
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        {activeTab === "patterns" && (
          <div>
            <div className="flex flex-wrap gap-4 mb-8 items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Categoría:
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-transparent border border-white/10 px-3 py-1 text-xs"
                  style={{ color: "#fff" }}
                >
                  <option value="" style={{ background: "#030014" }}>All</option>
                  {categories.map((c) => (
                    <option key={c} value={c} style={{ background: "#030014" }}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Importancia mínima:
                </label>
                <select
                  value={filterMinImportance}
                  onChange={(e) => setFilterMinImportance(parseInt(e.target.value))}
                  className="bg-transparent border border-white/10 px-3 py-1 text-xs"
                  style={{ color: "#fff" }}
                >
                  {[0, 5, 7, 8, 9].map((n) => (
                    <option key={n} value={n} style={{ background: "#030014" }}>
                      {n === 0 ? "All" : `${n}+`}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Mostrando {filteredPatterns.length} of {patterns.length}
              </span>
            </div>

            {filteredPatterns.length === 0 ? (
              <EmptyState message="No hay patrones que coincidan con estos filtros" />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredPatterns.map((p) => (
                  <PatternCard key={p.id} pattern={p} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "episodes" && (
          <div>
            {episodes.length === 0 ? (
              <EmptyState message="No hay episodios aún. Ejecuta el agent loop para crear uno." />
            ) : (
              <div className="space-y-4">
                {episodes.map((ep) => (
                  <EpisodeCard key={ep.id} episode={ep} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "anti" && (
          <div>
            {antiPatterns.length === 0 ? (
              <EmptyState message="No hay anti-patrones aún." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {antiPatterns.map((ap) => (
                  <AntiPatternCard key={ap.id} antiPattern={ap} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "skills" && (
          <div>
            {skills.length === 0 ? (
              <EmptyState message="No hay habilidades aún. Se promueven desde patrones recurrentes durante la consolidación semanal." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {skills.map((s) => (
                  <SkillCard key={s.id} skill={s} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "simulator" && (
          <div className="max-w-3xl">
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-2">Simulador de Recuperación</h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                Ingresa un brief para ver what patterns, skills, and anti-patterns the system would retrieve for a new session.
                Esto es exactamente lo que el agente Creator vería en su prompt.
              </p>
            </div>

            <div className="space-y-4 mb-8 p-6 border border-white/10" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Brief (petición del usuario)
                </label>
                <textarea
                  value={simBrief}
                  onChange={(e) => setSimBrief(e.target.value)}
                  rows={3}
                  className="w-full bg-transparent border border-white/10 px-3 py-2 text-sm focus:border-[#00d4ff] outline-none"
                  style={{ color: "#fff" }}
                  placeholder="Design a hero for..."
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Vertical (opcional)
                </label>
                <select
                  value={simVertical}
                  onChange={(e) => setSimVertical(e.target.value)}
                  className="bg-transparent border border-white/10 px-3 py-2 text-sm"
                  style={{ color: "#fff" }}
                >
                  <option value="" style={{ background: "#030014" }}>(auto-detectar)</option>
                  <option value="agency" style={{ background: "#030014" }}>agency</option>
                  <option value="saas" style={{ background: "#030014" }}>saas</option>
                  <option value="portfolio" style={{ background: "#030014" }}>portfolio</option>
                  <option value="ecommerce" style={{ background: "#030014" }}>ecommerce</option>
                </select>
              </div>
              <button
                onClick={runRetrieval}
                disabled={simLoading || !simBrief}
                className="px-6 py-2 text-xs uppercase tracking-widest border border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#030014] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {simLoading ? "Recuperando..." : "Ejecutar Recuperación"}
              </button>
            </div>

            {simError && (
              <div className="p-4 border border-[#ff0040]/30 mb-6" style={{ background: "rgba(255,0,64,0.05)" }}>
                <p className="text-xs text-[#ff0040]">{simError}</p>
              </div>
            )}

            {simResult && (
              <div className="space-y-6">
                <div className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Recuperado para: <span style={{ color: "#00d4ff" }}>"{simResult.brief.slice(0, 60)}..."</span>
                </div>

                {simResult.patterns.length > 0 && (
                  <div>
                    <h3 className="text-sm uppercase tracking-widest mb-3" style={{ color: "#b026ff" }}>
                      Patterns ({simResult.patterns.length})
                    </h3>
                    <div className="space-y-3">
                      {simResult.patterns.map((p, i) => (
                        <div key={p.id} className="p-4 border border-white/10" style={{ background: "rgba(176,38,255,0.03)" }}>
                          <div className="flex items-start gap-3">
                            <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs px-2 py-0.5 border border-[#b026ff]/30" style={{ color: "#b026ff" }}>
                                  imp {p.importance}/10
                                </span>
                                <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                                  {p.category}
                                </span>
                              </div>
                              <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
                                {p.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {simResult.anti_patterns.length > 0 && (
                  <div>
                    <h3 className="text-sm uppercase tracking-widest mb-3" style={{ color: "#ff0040" }}>
                      Anti-patterns ({simResult.anti_patterns.length})
                    </h3>
                    <div className="space-y-3">
                      {simResult.anti_patterns.map((ap) => (
                        <div key={ap.id} className="p-4 border border-[#ff0040]/20" style={{ background: "rgba(255,0,64,0.03)" }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 border border-[#ff0040]/30" style={{ color: "#ff0040" }}>
                              {ap.failure_mode}
                            </span>
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                              seen {ap.occurrence_count}x
                            </span>
                          </div>
                          <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
                            {ap.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {simResult.skills.length > 0 && (
                  <div>
                    <h3 className="text-sm uppercase tracking-widest mb-3" style={{ color: "#00ff88" }}>
                      Skills ({simResult.skills.length})
                    </h3>
                    <div className="space-y-3">
                      {simResult.skills.map((s) => (
                        <div key={s.id} className="p-4 border border-[#00ff88]/20" style={{ background: "rgba(0,255,136,0.03)" }}>
                          <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
                            {s.description}
                          </p>
                          <span className="text-xs mt-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>
                            success: {s.success_count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {simResult.patterns.length === 0 &&
                  simResult.anti_patterns.length === 0 &&
                  simResult.skills.length === 0 && (
                    <EmptyState message="No se encontraron coincidencias para este brief." />
                  )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="p-4 border border-white/5" style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
        {label}
      </div>
      <div className="text-3xl font-bold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function PatternCard({ pattern }: { pattern: Pattern }) {
  return (
    <div className="p-5 border border-white/10 hover:border-[#b026ff]/30 transition-colors" style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs px-2 py-0.5 border"
            style={{
              color: pattern.importance >= 8 ? "#00d4ff" : pattern.importance >= 6 ? "#b026ff" : "rgba(255,255,255,0.5)",
              borderColor: "currentColor",
            }}
          >
            imp {pattern.importance}/10
          </span>
          {pattern.category && (
            <span className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
              {pattern.category}
            </span>
          )}
          {pattern.vertical && (
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              · {pattern.vertical}
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          accedido {pattern.access_count}x
        </span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
        {pattern.content}
      </p>
      <div className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
        {new Date(pattern.created_at).toLocaleString()}
      </div>
    </div>
  );
}

function EpisodeCard({ episode }: { episode: Episode }) {
  const outcomeColor =
    episode.outcome === "success"
      ? "#00ff88"
      : episode.outcome === "score_sufficient"
      ? "#00d4ff"
      : "#ff0040";

  return (
    <div className="p-5 border border-white/10" style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-start justify-between mb-3 gap-4">
        <div className="flex-1">
          <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.9)" }}>
            {episode.brief_summary || episode.brief}
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            {episode.vertical && (
              <span style={{ color: "rgba(255,255,255,0.4)" }}>
                vertical: <span style={{ color: "#00d4ff" }}>{episode.vertical}</span>
              </span>
            )}
            {episode.archetype && (
              <span style={{ color: "rgba(255,255,255,0.4)" }}>
                archetype: <span style={{ color: "#b026ff" }}>{episode.archetype}</span>
              </span>
            )}
            {episode.stack && (
              <span style={{ color: "rgba(255,255,255,0.4)" }}>
                stack: <span style={{ color: "#00ff88" }}>{episode.stack}</span>
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold" style={{ color: outcomeColor }}>
            {episode.final_score.toFixed(1)}
          </div>
          <div className="text-xs uppercase tracking-widest" style={{ color: outcomeColor }}>
            {episode.outcome}
          </div>
        </div>
      </div>
      {episode.user_feedback && (
        <p className="text-xs italic mt-2 pt-2 border-t border-white/5" style={{ color: "rgba(255,255,255,0.4)" }}>
          &ldquo;{episode.user_feedback}&rdquo;
        </p>
      )}
      <div className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
        {new Date(episode.timestamp).toLocaleString()}
      </div>
    </div>
  );
}

function AntiPatternCard({ antiPattern }: { antiPattern: AntiPattern }) {
  return (
    <div className="p-5 border border-[#ff0040]/20" style={{ background: "rgba(255,0,64,0.03)" }}>
      <div className="flex items-center gap-2 mb-3">
        {antiPattern.failure_mode && (
          <span className="text-xs px-2 py-0.5 border border-[#ff0040]/30" style={{ color: "#ff0040" }}>
            {antiPattern.failure_mode}
          </span>
        )}
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          seen {antiPattern.occurrence_count}x
        </span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
        {antiPattern.description}
      </p>
      <div className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
        última vez: {new Date(antiPattern.last_seen).toLocaleString()}
      </div>
    </div>
  );
}

function SkillCard({ skill }: { skill: Skill }) {
  return (
    <div className="p-5 border border-[#00ff88]/20" style={{ background: "rgba(0,255,136,0.03)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs px-2 py-0.5 border border-[#00ff88]/30" style={{ color: "#00ff88" }}>
          skill
        </span>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          ✓ {skill.success_count} · ✗ {skill.fail_count}
        </span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
        {skill.description}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>{message}</p>
    </div>
  );
}
