import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "memory-data", "memory.db");

export function getDb(): Database.Database {
  return new Database(DB_PATH, { readonly: true, fileMustExist: false });
}

export interface Episode {
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

export interface SemanticNote {
  id: string;
  content: string;
  vertical: string | null;
  category: string | null;
  importance: number;
  created_at: string;
  last_accessed: string;
  access_count: number;
}

export interface AntiPattern {
  id: string;
  description: string;
  failure_mode: string | null;
  occurrence_count: number;
  created_at: string;
  last_seen: string;
  status: string;
}

export interface Skill {
  id: string;
  description: string;
  success_count: number;
  fail_count: number;
  last_used: string | null;
  valid_verticals: string | null;
  status: string;
  created_at: string;
}

export interface Stats {
  episodes: number;
  patterns: number;
  skills: number;
  anti_patterns: number;
  avg_score: number | null;
  top_vertical: string | null;
  top_category: string | null;
}

export function getStats(): Stats {
  const db = getDb();
  try {
    const episodes = (db.prepare("SELECT COUNT(*) as n FROM episodes").get() as { n: number }).n;
    const patterns = (db.prepare("SELECT COUNT(*) as n FROM semantic_notes").get() as { n: number }).n;
    const skills = (db.prepare("SELECT COUNT(*) as n FROM skills").get() as { n: number }).n;
    const anti_patterns = (db.prepare("SELECT COUNT(*) as n FROM anti_patterns").get() as { n: number }).n;

    const avgRow = db.prepare("SELECT AVG(final_score) as avg FROM episodes").get() as { avg: number | null };
    const avg_score = avgRow.avg;

    const topVert = db.prepare(
      "SELECT vertical, COUNT(*) as n FROM episodes WHERE vertical != '' GROUP BY vertical ORDER BY n DESC LIMIT 1"
    ).get() as { vertical: string } | undefined;

    const topCat = db.prepare(
      "SELECT category, COUNT(*) as n FROM semantic_notes WHERE category != '' GROUP BY category ORDER BY n DESC LIMIT 1"
    ).get() as { category: string } | undefined;

    return {
      episodes,
      patterns,
      skills,
      anti_patterns,
      avg_score,
      top_vertical: topVert?.vertical ?? null,
      top_category: topCat?.category ?? null,
    };
  } finally {
    db.close();
  }
}

export function getEpisodes(): Episode[] {
  const db = getDb();
  try {
    return db.prepare(
      `SELECT id, timestamp, brief, brief_summary, vertical, archetype, stack,
              final_score, final_subjective_score, outcome, user_feedback
       FROM episodes ORDER BY timestamp DESC`
    ).all() as Episode[];
  } finally {
    db.close();
  }
}

export function getPatterns(filter?: {
  category?: string;
  vertical?: string;
  minImportance?: number;
}): SemanticNote[] {
  const db = getDb();
  try {
    let query = `SELECT id, content, vertical, category, importance, created_at, last_accessed, access_count
                 FROM semantic_notes WHERE 1=1`;
    const params: (string | number)[] = [];
    if (filter?.category) {
      query += ` AND category = ?`;
      params.push(filter.category);
    }
    if (filter?.vertical) {
      query += ` AND (vertical = ? OR vertical = '')`;
      params.push(filter.vertical);
    }
    if (filter?.minImportance !== undefined) {
      query += ` AND importance >= ?`;
      params.push(filter.minImportance);
    }
    query += ` ORDER BY importance DESC, last_accessed DESC`;
    return db.prepare(query).all(...params) as SemanticNote[];
  } finally {
    db.close();
  }
}

export function getAntiPatterns(): AntiPattern[] {
  const db = getDb();
  try {
    return db.prepare(
      `SELECT id, description, failure_mode, occurrence_count, created_at, last_seen, status
       FROM anti_patterns WHERE status = 'active' ORDER BY occurrence_count DESC, last_seen DESC`
    ).all() as AntiPattern[];
  } finally {
    db.close();
  }
}

export function getSkills(): Skill[] {
  const db = getDb();
  try {
    return db.prepare(
      `SELECT id, description, success_count, fail_count, last_used, valid_verticals, status, created_at
       FROM skills WHERE status = 'active' ORDER BY success_count DESC, created_at DESC`
    ).all() as Skill[];
  } finally {
    db.close();
  }
}
