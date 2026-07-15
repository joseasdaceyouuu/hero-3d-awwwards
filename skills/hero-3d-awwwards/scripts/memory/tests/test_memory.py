"""
Unit tests for the memory module.

Run with:
    cd /home/z/my-project/skills/hero-3d-awwwards/scripts
    python -m memory.tests.test_memory

Or with pytest:
    pytest memory/tests/test_memory.py -v
"""

import json
import math
import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

# Add parent to path so we can import the memory module
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from memory.embeddings import FakeEmbedder, get_embedder, clear_cache
from memory.retrieval import tri_score, cosine_sim, recency_score, importance_score, retrieve_top_k
from memory.compression import (
    toon_compress_audit,
    toon_compress_subjective,
    compress_iteration_for_replay,
    compress_iteration_history,
    hash_content,
    hash_files,
    estimate_tokens,
    compression_stats,
)
from memory.stores import MemorySystem, WorkingMemory


# ============================================================
# RETRIEVAL TESTS
# ============================================================

class TestCosineSim(unittest.TestCase):

    def test_identical_vectors(self):
        v = [1.0, 0.0, 0.0]
        self.assertAlmostEqual(cosine_sim(v, v), 1.0, places=5)

    def test_orthogonal_vectors(self):
        a = [1.0, 0.0]
        b = [0.0, 1.0]
        self.assertAlmostEqual(cosine_sim(a, b), 0.0, places=5)

    def test_opposite_vectors(self):
        a = [1.0, 0.0]
        b = [-1.0, 0.0]
        self.assertAlmostEqual(cosine_sim(a, b), -1.0, places=5)

    def test_zero_vector(self):
        a = [0.0, 0.0]
        b = [1.0, 0.0]
        self.assertEqual(cosine_sim(a, b), 0.0)

    def test_dimension_mismatch_raises(self):
        with self.assertRaises(ValueError):
            cosine_sim([1.0], [1.0, 2.0])


class TestRecencyScore(unittest.TestCase):

    def test_just_accessed(self):
        now = datetime.utcnow()
        score = recency_score(now.isoformat() + "Z", half_life_days=30.0, now=now)
        self.assertAlmostEqual(score, 1.0, places=3)

    def test_one_half_life(self):
        now = datetime.utcnow()
        past = (now - timedelta(days=30)).isoformat() + "Z"
        score = recency_score(past, half_life_days=30.0, now=now)
        self.assertAlmostEqual(score, 0.5, places=3)

    def test_two_half_lives(self):
        now = datetime.utcnow()
        past = (now - timedelta(days=60)).isoformat() + "Z"
        score = recency_score(past, half_life_days=30.0, now=now)
        self.assertAlmostEqual(score, 0.25, places=3)

    def test_none_returns_one(self):
        score = recency_score(None, half_life_days=30.0)
        self.assertAlmostEqual(score, 1.0, places=3)


class TestImportanceScore(unittest.TestCase):

    def test_max_importance(self):
        self.assertAlmostEqual(importance_score(10), 1.0)

    def test_min_importance(self):
        self.assertAlmostEqual(importance_score(0), 0.0)

    def test_default(self):
        self.assertAlmostEqual(importance_score(None), 0.5)

    def test_clipping(self):
        self.assertAlmostEqual(importance_score(15), 1.0)
        self.assertAlmostEqual(importance_score(-5), 0.0)


class TestTriScore(unittest.TestCase):

    def setUp(self):
        self.embedder = FakeEmbedder(dimension=32)

    def test_perfect_match_recent_important(self):
        """Memory that's identical, just accessed, and importance 10."""
        text = "test memory"
        emb = self.embedder.embed(text)
        memory = {
            "id": "1",
            "last_accessed": datetime.utcnow().isoformat() + "Z",
            "importance": 10,
        }
        score = tri_score(
            memory, emb, emb,
            weights=(0.4, 0.4, 0.2),
            store_type="semantic",
        )
        # All components should be ~1.0
        self.assertGreater(score, 0.95)

    def test_old_unimportant_irrelevant(self):
        """Old, low-importance, irrelevant memory should score low."""
        emb1 = self.embedder.embed("hello world")
        emb2 = self.embedder.embed("completely different text")
        memory = {
            "id": "1",
            "last_accessed": (datetime.utcnow() - timedelta(days=365)).isoformat() + "Z",
            "importance": 1,
        }
        score = tri_score(
            memory, emb1, emb2,
            weights=(0.4, 0.4, 0.2),
            store_type="semantic",
        )
        self.assertLess(score, 0.4)

    def test_different_weights_for_different_stores(self):
        """Procedural store weights semantic match higher than recency."""
        emb = self.embedder.embed("test")
        memory = {
            "id": "1",
            "last_accessed": (datetime.utcnow() - timedelta(days=365)).isoformat() + "Z",
            "importance": 5,
        }
        # Procedural: semantic=0.6, recency=0.1, importance=0.3
        # Old memory with perfect semantic match
        score_proc = tri_score(
            memory, emb, emb,
            store_type="procedural",
        )
        # Semantic: semantic=0.5, recency=0.2, importance=0.3
        score_sem = tri_score(
            memory, emb, emb,
            store_type="semantic",
        )
        # Procedural should score higher because recency matters less
        self.assertGreater(score_proc, score_sem)


class TestRetrieveTopK(unittest.TestCase):

    def setUp(self):
        self.embedder = FakeEmbedder(dimension=32)

    def test_returns_top_k(self):
        query = self.embedder.embed("query")
        memories = []
        embeddings = {}
        for i in range(10):
            text = f"memory_{i}"
            emb = self.embedder.embed(text)
            memories.append({
                "id": str(i),
                "last_accessed": datetime.utcnow().isoformat() + "Z",
                "importance": 5,
            })
            embeddings[str(i)] = emb

        results = retrieve_top_k(
            memories, query, embeddings, k=3, store_type="semantic"
        )
        self.assertEqual(len(results), 3)
        # Results should be sorted descending
        scores = [s for _, s in results]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_min_score_filter(self):
        query = self.embedder.embed("query")
        memories = [
            {"id": "1", "last_accessed": datetime.utcnow().isoformat() + "Z", "importance": 5},
        ]
        embeddings = {"1": self.embedder.embed("completely different")}
        results = retrieve_top_k(
            memories, query, embeddings, k=5, min_score=0.99, store_type="semantic"
        )
        # FakeEmbedder produces unrelated vectors for different text, so score should be < 0.99
        self.assertEqual(len(results), 0)


# ============================================================
# COMPRESSION TESTS
# ============================================================

class TestHashContent(unittest.TestCase):

    def test_same_content_same_hash(self):
        self.assertEqual(hash_content("hello"), hash_content("hello"))

    def test_different_content_different_hash(self):
        self.assertNotEqual(hash_content("hello"), hash_content("world"))

    def test_hash_is_hex_string(self):
        h = hash_content("test")
        self.assertEqual(len(h), 64)  # SHA256 hex
        int(h, 16)  # Should not raise


class TestToonCompress(unittest.TestCase):

    def test_basic_audit(self):
        audit = {
            "score": 7.8,
            "overall_pass": False,
            "iteration": 2,
            "blockers": ["C7"],
            "criteria": [
                {"id": "C7", "name": "reduced-motion", "severity": "blocker",
                 "passed": False, "fix_hint": "Add useReducedMotion hook"},
                {"id": "C1", "name": "archetype", "severity": "major",
                 "passed": True},
            ],
            "recommendation": "continue_loop",
            "summary": "C7 blocker needs fix",
        }
        compressed = toon_compress_audit(audit)
        self.assertIn("score:7.8", compressed)
        self.assertIn("pass:False", compressed)
        self.assertIn("blockers:C7", compressed)
        self.assertIn("C7 [blo] reduced-motion", compressed)
        self.assertIn("fix:Add useReducedMotion hook", compressed)
        self.assertNotIn("C1", compressed)  # Passed criteria not included

    def test_compression_saves_tokens(self):
        audit = {
            "score": 7.8,
            "overall_pass": False,
            "iteration": 2,
            "blockers": ["C7", "C12"],
            "criteria": [
                {"id": c, "name": f"criterion {c}", "severity": "major",
                 "passed": False, "fix_hint": f"Fix {c} by doing X" * 20}
                for c in [f"C{i}" for i in range(7, 15)]
            ],
            "summary": "Multiple issues" * 30,
        }
        original = json.dumps(audit, indent=2)
        compressed = toon_compress_audit(audit)
        stats = compression_stats(original, compressed)
        self.assertGreater(stats["savings_pct"], 30)

    def test_empty_audit(self):
        self.assertEqual(toon_compress_audit({}), "")

    def test_subjective_compression(self):
        subj = {
            "subjective_score": 7.2,
            "first_impression": {
                "hook_clarity": 7, "wow_factor": 8,
                "memorability": 6, "premium_feel": 8,
            },
            "soul_analysis": {
                "soul_description": "Fluid motion as identity",
                "soul_clarity": 7,
            },
            "competitive_comparison": {
                "sotd_worthy": False,
                "sotd_gap": "No narrative arc",
            },
            "subjective_blockers": [
                {"id": "S1", "name": "No narrative", "severity": "major",
                 "fix_hint": "Add scroll-triggered state"}
            ],
            "summary": "Good but missing depth",
        }
        compressed = toon_compress_subjective(subj)
        self.assertIn("sub_score:7.2", compressed)
        self.assertIn("hook:7", compressed)
        self.assertIn("wow:8", compressed)
        self.assertIn("sotd:False", compressed)
        self.assertIn("S1 [maj] No narrative", compressed)


class TestGraduatedReduction(unittest.TestCase):

    def test_age_0_full_data(self):
        it = {
            "iteration": 1,
            "audit": {"score": 7.0, "blockers": []},
            "code": {"file.tsx": "export const X = 1;"},
        }
        result = compress_iteration_for_replay(it, age=0, include_code_hashes=False)
        # Should be valid JSON
        parsed = json.loads(result)
        self.assertEqual(parsed["iteration"], 1)
        self.assertIn("audit", parsed)

    def test_age_1_toon_compressed(self):
        it = {
            "iteration": 1,
            "audit": {"score": 7.0, "blockers": ["C7"], "overall_pass": False,
                      "criteria": [{"id": "C7", "name": "test", "severity": "blocker",
                                    "passed": False, "fix_hint": "fix it"}]},
            "code": {"file.tsx": "code"},
        }
        result = compress_iteration_for_replay(it, age=1)
        self.assertIn("Iteration 1", result)
        self.assertIn("AUDIT:", result)
        self.assertIn("score:7.0", result)

    def test_age_2_3_blockers_only(self):
        it = {
            "iteration": 1,
            "audit": {"score": 6.5, "blockers": ["C7", "C11"]},
            "subjective": {"subjective_score": 5.5, "subjective_blockers": [{"id": "S1"}]},
        }
        result = compress_iteration_for_replay(it, age=2)
        self.assertIn("iter1:", result)
        self.assertIn("blockers=C7,C11", result)
        # Should NOT include fix hints at this age
        self.assertNotIn("fix:", result)

    def test_age_4_plus_one_line(self):
        it = {
            "iteration": 1,
            "audit": {"score": 5.0, "recommendation": "escalate"},
        }
        result = compress_iteration_for_replay(it, age=5)
        self.assertIn("iter1:", result)
        self.assertIn("score=5.0", result)
        # Should be a single line
        self.assertEqual(len(result.split("\n")), 1)

    def test_history_compression(self):
        iterations = [
            {"iteration": 1, "audit": {"score": 5.0, "blockers": ["C7"]}},
            {"iteration": 2, "audit": {"score": 6.5, "blockers": ["C11"]}},
            {"iteration": 3, "audit": {"score": 7.5, "blockers": []}},
        ]
        result = compress_iteration_history(iterations, current_iteration_num=3)
        # iter 3 (age 0) should be full JSON
        # iter 2 (age 1) should be TOON
        # iter 1 (age 2) should be blockers only
        lines = result.split("\n\n")
        self.assertEqual(len(lines), 3)


# ============================================================
# STORES INTEGRATION TESTS
# ============================================================

class TestMemorySystem(unittest.TestCase):

    def setUp(self):
        # Use FakeEmbedder for tests (no API calls)
        clear_cache()
        self.tmpdir = tempfile.mkdtemp()
        self.db_path = Path(self.tmpdir) / "test_memory.db"
        self.lancedb_path = Path(self.tmpdir) / "lancedb"
        self.embedder = FakeEmbedder(dimension=32)
        self.memory = MemorySystem(
            db_path=self.db_path,
            lancedb_path=self.lancedb_path,
            embedder=self.embedder,
        )

    def tearDown(self):
        self.memory.close()
        import shutil
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_stats_empty(self):
        stats = self.memory.stats()
        self.assertEqual(stats["episodes"], 0)
        self.assertEqual(stats["semantic_notes"], 0)
        self.assertEqual(stats["skills"], 0)
        self.assertEqual(stats["anti_patterns"], 0)

    def test_full_session_workflow(self):
        """Test the full workflow: start → iterations → finalize."""
        # Start session
        self.memory.start_session(
            brief="Design a hero for photographer portfolio",
            brief_summary="photographer portfolio hero parallax",
            vertical="portfolio",
            archetype="2.5D-Parallax",
            stack="css-3d",
        )

        # Verify working memory
        self.assertEqual(self.memory.working.vertical, "portfolio")
        self.assertEqual(self.memory.working.archetype, "2.5D-Parallax")
        self.assertEqual(self.memory.working.iteration, 0)

        # Save iteration 1
        self.memory.save_iteration(
            iteration=1,
            code={"Hero.tsx": "export const Hero = () => null;"},
            audit={"score": 6.5, "blockers": ["C7"], "criteria": [],
                   "overall_pass": False, "recommendation": "continue_loop"},
            subjective={"subjective_score": 5.5, "subjective_blockers": []},
        )
        self.assertEqual(self.memory.working.iteration, 1)
        self.assertEqual(len(self.memory.working.iterations_history), 1)

        # Save iteration 2
        self.memory.save_iteration(
            iteration=2,
            code={"Hero.tsx": "export const Hero = () => <div/>;"},
            audit={"score": 8.5, "blockers": [], "criteria": [],
                   "overall_pass": True, "recommendation": "deliver"},
            subjective={"subjective_score": 8.0, "subjective_blockers": []},
        )
        self.assertEqual(len(self.memory.working.iterations_history), 2)

        # Finalize
        episode_id = self.memory.finalize_session(
            outcome="success",
            final_score=8.5,
            final_subjective_score=8.0,
            user_feedback="Great work!",
        )
        self.assertTrue(episode_id)

        # Verify episode was saved
        stats = self.memory.stats()
        self.assertEqual(stats["episodes"], 1)

        # Verify we can retrieve it
        ep = self.memory.episodic.get_episode(episode_id)
        self.assertEqual(ep["vertical"], "portfolio")
        self.assertEqual(ep["outcome"], "success")

    def test_semantic_store(self):
        # Add some patterns
        self.memory.semantic.add(
            content="Parallax 2.5D works for photographer portfolios",
            vertical="portfolio",
            category="archetype-selection",
            importance=8,
        )
        self.memory.semantic.add(
            content="SaaS heroes prefer minimal Text 3D",
            vertical="saas",
            category="archetype-selection",
            importance=7,
        )
        self.memory.semantic.add(
            content="Magenta accent with black/white achieves premium feel",
            vertical="portfolio",
            category="color",
            importance=6,
        )

        # Search for photographer-related patterns
        results = self.memory.semantic.search(
            "photographer portfolio hero",
            top_k=2,
        )
        self.assertGreater(len(results), 0)
        # First result should be about photographer parallax
        top_pattern = results[0][0]
        self.assertIn("Parallax", top_pattern["content"])

    def test_procedural_store(self):
        # Add a skill
        skill_id = self.memory.procedural.add(
            description="Default parallax hero for photographer portfolios",
            code_template="<div>parallax hero</div>",
            valid_verticals=["portfolio"],
        )

        # Search
        results = self.memory.procedural.search(
            "photographer hero",
            top_k=1,
        )
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0][0]["id"], skill_id)

        # Record outcome
        self.memory.procedural.record_outcome(skill_id, success=True)
        self.memory.procedural.record_outcome(skill_id, success=True)

        # Verify counts
        ep = self.memory.conn.execute(
            "SELECT success_count, fail_count FROM skills WHERE id = ?",
            (skill_id,),
        ).fetchone()
        self.assertEqual(ep["success_count"], 2)
        self.assertEqual(ep["fail_count"], 0)

    def test_anti_pattern_store(self):
        # Add an anti-pattern
        ap_id = self.memory.anti_patterns.add(
            description="Linear easing on primary animations always fails C11",
            failure_mode="C11",
            episode_id="ep-1",
            criterion_id="C11",
        )

        # Search
        results = self.memory.anti_patterns.search("linear easing animation", top_k=3)
        self.assertEqual(len(results), 1)
        self.assertIn("Linear easing", results[0]["description"])

        # Record another occurrence
        self.memory.anti_patterns.record_occurrence(
            ap_id, episode_id="ep-2", criterion_id="C11"
        )
        ap = self.memory.anti_patterns.find_similar("Linear easing on primary")
        self.assertIsNotNone(ap)
        self.assertEqual(ap["occurrence_count"], 2)

    def test_cross_session_retrieval(self):
        """Test that patterns from session 1 are retrieved in session 2."""
        # Session 1: add a pattern
        self.memory.semantic.add(
            content="For photographer portfolios, parallax 2.5D with 3-5 layers works best",
            vertical="portfolio",
            category="archetype-selection",
            importance=9,
            source_episodes=["ep-1"],
        )

        # Session 2: start a new session with similar brief
        self.memory.start_session(
            brief="Design a hero for a wedding photographer",
            brief_summary="wedding photographer portfolio hero",
            vertical="portfolio",
        )

        # The pattern should be in retrieved_patterns
        self.assertGreater(len(self.memory.working.retrieved_patterns), 0)
        top_pattern = self.memory.working.retrieved_patterns[0]
        self.assertIn("photographer", top_pattern["content"].lower())

    def test_code_hash_dedup(self):
        """Test that identical code files share the same hash."""
        code = {"Hero.tsx": "export const Hero = () => null;"}

        # Save episode 1
        self.memory.start_session(
            brief="Hero 1", brief_summary="hero 1",
            vertical="portfolio", archetype="2.5D-Parallax", stack="r3f",
        )
        self.memory.save_iteration(1, code, {"score": 8.0, "blockers": [], "criteria": [], "overall_pass": True})
        ep1_id = self.memory.finalize_session("success", 8.5, 8.0)

        # Save episode 2 with same code
        self.memory.start_session(
            brief="Hero 2", brief_summary="hero 2",
            vertical="portfolio", archetype="2.5D-Parallax", stack="r3f",
        )
        self.memory.save_iteration(1, code, {"score": 8.5, "blockers": [], "criteria": [], "overall_pass": True})
        ep2_id = self.memory.finalize_session("success", 9.0, 8.5)

        # Verify code_hashes table has only 1 entry (deduped)
        row = self.memory.conn.execute(
            "SELECT COUNT(*) as n FROM code_hashes"
        ).fetchone()
        self.assertEqual(row["n"], 1)

        # Reference count should be 2
        row = self.memory.conn.execute(
            "SELECT reference_count FROM code_hashes"
        ).fetchone()
        self.assertEqual(row["reference_count"], 2)


# ============================================================
# RUN ALL TESTS
# ============================================================

if __name__ == "__main__":
    unittest.main(verbosity=2)
