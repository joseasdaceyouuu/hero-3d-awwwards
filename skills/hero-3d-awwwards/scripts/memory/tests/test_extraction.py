"""
Tests for Fase 2: pattern extraction.

Verifies that:
    1. extract_patterns_from_episode() correctly calls LLM and parses output
    2. Patterns are stored in semantic memory
    3. Anti-patterns are stored (or updated if similar exists)
    4. Cross-session retrieval works after extraction
    5. extract_patterns_from_episode handles LLM failures gracefully
    6. consolidate_with_llm() promotes cross-episode patterns to skills

Run with:
    cd /home/z/my-project/skills/hero-3d-awwwards/scripts
    python -m memory.tests.test_extraction
"""

import importlib.util
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from memory import MemorySystem, FakeEmbedder, clear_cache
from memory.extraction import (
    extract_patterns_from_episode,
    parse_extraction_output,
    build_extraction_user_prompt,
    consolidate_with_llm,
)


# ============================================================
# MOCK BACKEND — returns canned extraction output
# ============================================================

class MockExtractionBackend:
    """Returns a valid extraction JSON for any prompt."""

    EXTRACTION_RESPONSE = {
        "patterns": [
            {
                "content": "For photographer portfolios, parallax 2.5D with 3-5 layers and accent color achieves premium feel",
                "category": "archetype-selection",
                "importance": 8,
                "evidence": "Session used parallax 2.5D with 4 layers, scored 8.5 on premium_feel",
                "applies_to_verticals": ["portfolio", "ecommerce"],
            },
            {
                "content": "fBm with 5 octaves is sufficient for organic shader backgrounds without GPU burn",
                "category": "shader",
                "importance": 7,
                "evidence": "Shader plane with 5 octaves hit 60fps on mobile",
                "applies_to_verticals": [],
            },
            {
                "content": "GSAP stagger 0.08s per word with power4.out at 1.2s duration produces cinematic entry",
                "category": "timing",
                "importance": 9,
                "evidence": "Headline stagger passed C11 and got wow_factor=8 from User Simulator",
                "applies_to_verticals": [],
            },
        ],
        "anti_patterns": [
            {
                "description": "Linear easing on primary animations fails C11 timing cinematográfico — always use power3.out or power4.out",
                "failure_mode": "C11",
                "evidence": "First iteration used linear, auditor flagged, had to correct to power4.out",
            },
            {
                "description": "Palettes with 4+ saturated colors fail C10 and get flagged as 'busy' by User Simulator",
                "failure_mode": "C10",
                "evidence": "User simulator flagged 4-color palette as 'lacks discipline'",
            },
        ],
    }

    def __init__(self):
        self.calls = 0

    def complete(self, system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
        self.calls += 1
        return json.dumps(self.EXTRACTION_RESPONSE, indent=2)


class MockConsolidationBackend:
    """Returns a valid consolidation JSON."""

    CONSOLIDATION_RESPONSE = {
        "skills_to_promote": [
            {
                "description": "Default parallax hero for photographer portfolios with 3-5 layers and accent color",
                "code_template_summary": "CSS 3D parallax with mouse-driven lerp, 4 PNG layers, accent color for CTA",
                "valid_verticals": ["portfolio"],
                "source_episodes": ["ep-1", "ep-2", "ep-3"],
                "estimated_success_rate": 0.85,
            },
        ],
        "anti_patterns_to_promote": [
            {
                "description": "Audio autoplay without explicit opt-in causes abort in 4+ sessions",
                "failure_mode": "S1",
                "occurred_in_episodes": ["ep-1", "ep-2", "ep-3", "ep-4"],
                "frequency": "high",
            },
        ],
    }

    def __init__(self):
        self.calls = 0

    def complete(self, system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
        self.calls += 1
        return json.dumps(self.CONSOLIDATION_RESPONSE, indent=2)


class MockFailingBackend:
    """Always raises an exception — for testing graceful failure."""

    def complete(self, system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
        raise RuntimeError("LLM API is down")


class MockInvalidJsonBackend:
    """Returns invalid JSON — for testing parse failure."""

    def complete(self, system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
        return "This is not JSON, sorry."


# ============================================================
# HELPER: create a fake episode in memory
# ============================================================

def _create_test_episode(
    memory: MemorySystem,
    brief: str = "Design a hero for photographer portfolio",
    vertical: str = "portfolio",
    archetype: str = "2.5D-Parallax",
    stack: str = "css-3d",
    final_score: float = 8.5,
    final_subj: float = 8.0,
    outcome: str = "success",
    code: dict = None,
) -> str:
    """Seed memory with a fake completed episode. Returns episode_id."""
    if code is None:
        code = {
            "Hero.tsx": """'use client';

export function Hero() {
  return (
    <section id="hero" style={{ height: '100vh', background: '#05050f' }}>
      <h1 style={{ color: '#ffffff' }}>FLOW STATE</h1>
      <p style={{ color: '#ffffff', opacity: 0.7 }}>Tagline here</p>
    </section>
  );
}
""",
        }

    iterations = [
        {
            "iteration": 1,
            "audit": {
                "score": 7.5,
                "overall_pass": True,
                "blockers": [],
                "criteria": [
                    {"id": "C7", "name": "prefers-reduced-motion", "passed": True, "severity": "blocker"},
                    {"id": "C11", "name": "timing cinematográfico", "passed": True, "severity": "major"},
                ],
            },
            "subjective": {
                "subjective_score": 8.0,
                "first_impression": {"hook_clarity": 8, "wow_factor": 8, "memorability": 7, "premium_feel": 9},
                "subjective_blockers": [],
                "competitive_comparison": {"sotd_worthy": True},
            },
        },
    ]

    return memory.episodic.save_episode(
        brief=brief,
        brief_summary=brief[:200],
        vertical=vertical,
        archetype=archetype,
        stack=stack,
        final_score=final_score,
        final_subjective_score=final_subj,
        outcome=outcome,
        iterations=iterations,
        code=code,
    )


# ============================================================
# TESTS
# ============================================================

class TestParseExtractionOutput(unittest.TestCase):

    def test_valid_json(self):
        output = json.dumps({
            "patterns": [
                {"content": "Test pattern", "category": "timing", "importance": 7, "evidence": "x", "applies_to_verticals": []}
            ],
            "anti_patterns": [
                {"description": "Don't do X", "failure_mode": "C7", "evidence": "y"}
            ],
        })
        parsed = parse_extraction_output(output)
        self.assertEqual(len(parsed["patterns"]), 1)
        self.assertEqual(parsed["patterns"][0]["content"], "Test pattern")
        self.assertEqual(len(parsed["anti_patterns"]), 1)

    def test_markdown_fences_stripped(self):
        output = "```json\n" + json.dumps({"patterns": [], "anti_patterns": []}) + "\n```"
        parsed = parse_extraction_output(output)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["patterns"], [])

    def test_invalid_json_returns_none(self):
        parsed = parse_extraction_output("not json at all")
        self.assertIsNone(parsed)

    def test_missing_keys_default_to_empty(self):
        parsed = parse_extraction_output(json.dumps({}))
        self.assertEqual(parsed["patterns"], [])
        self.assertEqual(parsed["anti_patterns"], [])

    def test_short_content_filtered(self):
        """Patterns with content < 10 chars should be filtered out."""
        output = json.dumps({
            "patterns": [
                {"content": "ok", "category": "x", "importance": 5, "evidence": "", "applies_to_verticals": []},
                {"content": "This is a valid pattern with enough text", "category": "x", "importance": 5, "evidence": "", "applies_to_verticals": []},
            ],
            "anti_patterns": [],
        })
        parsed = parse_extraction_output(output)
        self.assertEqual(len(parsed["patterns"]), 1)

    def test_importance_clamped(self):
        """Importance should be clamped to 1-10."""
        output = json.dumps({
            "patterns": [
                {"content": "This is a long enough pattern description", "category": "x", "importance": 15, "evidence": "", "applies_to_verticals": []},
                {"content": "Another pattern with sufficient text length", "category": "x", "importance": -3, "evidence": "", "applies_to_verticals": []},
            ],
            "anti_patterns": [],
        })
        parsed = parse_extraction_output(output)
        self.assertEqual(parsed["patterns"][0]["importance"], 10)
        self.assertEqual(parsed["patterns"][1]["importance"], 1)


class TestBuildExtractionPrompt(unittest.TestCase):

    def test_prompt_contains_brief(self):
        episode = {
            "brief": "Design a hero for photographer",
            "vertical": "portfolio",
            "archetype": "2.5D-Parallax",
            "stack": "css-3d",
            "outcome": "success",
            "final_score": 8.5,
            "final_subjective_score": 8.0,
            "user_feedback": "",
        }
        prompt = build_extraction_user_prompt(episode, [], {})
        self.assertIn("Design a hero for photographer", prompt)
        self.assertIn("portfolio", prompt)
        self.assertIn("2.5D-Parallax", prompt)

    def test_prompt_contains_iterations_summary(self):
        episode = {"brief": "x", "vertical": "y", "archetype": "", "stack": "", "outcome": "success", "final_score": 8.0, "final_subjective_score": 7.5, "user_feedback": ""}
        iterations = [
            {"iteration": 1, "audit": {"score": 7.0, "blockers": [], "criteria": [], "overall_pass": True}, "subjective": {"subjective_score": 7.5, "subjective_blockers": []}}
        ]
        prompt = build_extraction_user_prompt(episode, iterations, {})
        self.assertIn("audit_score", prompt)
        self.assertIn("subjective_score", prompt)

    def test_prompt_truncates_long_code(self):
        episode = {"brief": "x", "vertical": "", "archetype": "", "stack": "", "outcome": "s", "final_score": 8.0, "final_subjective_score": 7.5, "user_feedback": ""}
        long_code = {"file.tsx": "\n".join(["line " + str(i) for i in range(300)])}
        prompt = build_extraction_user_prompt(episode, [], long_code)
        self.assertIn("more lines", prompt)


class TestExtractPatternsFromEpisode(unittest.TestCase):

    def setUp(self):
        clear_cache()
        self.tmpdir = tempfile.mkdtemp()
        self.db_path = Path(self.tmpdir) / "memory.db"
        self.lancedb_path = Path(self.tmpdir) / "lancedb"
        self._embedder_patcher = patch("memory.stores.get_embedder", return_value=FakeEmbedder(dimension=64))
        self._embedder_patcher.start()
        self.memory = MemorySystem(db_path=self.db_path, lancedb_path=self.lancedb_path)

    def tearDown(self):
        self._embedder_patcher.stop()
        clear_cache()
        self.memory.close()
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_extracts_and_stores_patterns(self):
        """Verify patterns are extracted and stored in semantic memory."""
        episode_id = _create_test_episode(self.memory)
        backend = MockExtractionBackend()

        before_count = self.memory.stats()["semantic_notes"]
        patterns, anti_patterns = extract_patterns_from_episode(
            memory=self.memory,
            episode_id=episode_id,
            backend=backend,
            verbose=False,
        )
        after_count = self.memory.stats()["semantic_notes"]

        self.assertEqual(len(patterns), 3)
        self.assertEqual(len(anti_patterns), 2)
        self.assertEqual(after_count - before_count, 3)

        # Verify patterns have correct fields
        for p in patterns:
            self.assertIn("id", p)
            self.assertIn("content", p)
            self.assertIn("importance", p)
            self.assertIn("category", p)

    def test_anti_patterns_stored(self):
        """Verify anti-patterns are stored in anti_patterns table."""
        episode_id = _create_test_episode(self.memory)
        backend = MockExtractionBackend()

        before_count = self.memory.stats()["anti_patterns"]
        patterns, anti_patterns = extract_patterns_from_episode(
            memory=self.memory,
            episode_id=episode_id,
            backend=backend,
            verbose=False,
        )
        after_count = self.memory.stats()["anti_patterns"]

        self.assertEqual(len(anti_patterns), 2)
        self.assertEqual(after_count - before_count, 2)

    def test_anti_pattern_dedup_on_similar(self):
        """If a similar anti-pattern already exists, update it instead of adding new."""
        # Pre-seed an anti-pattern
        self.memory.anti_patterns.add(
            description="Linear easing on primary animations fails C11 timing cinematográfico",
            failure_mode="C11",
        )
        before_count = self.memory.stats()["anti_patterns"]

        episode_id = _create_test_episode(self.memory)
        backend = MockExtractionBackend()
        patterns, anti_patterns = extract_patterns_from_episode(
            memory=self.memory,
            episode_id=episode_id,
            backend=backend,
            verbose=False,
        )

        after_count = self.memory.stats()["anti_patterns"]
        # Should have added 1 new (the C10 one) and updated 1 existing (the C11 one)
        self.assertEqual(after_count - before_count, 1)
        # The updated one should have occurrence_count = 2 (initial + new)
        updated = [ap for ap in anti_patterns if ap.get("updated")][0]
        self.assertIn("Linear easing", updated["description"])

    def test_handles_llm_failure_gracefully(self):
        """If LLM call fails, return empty lists, don't crash."""
        episode_id = _create_test_episode(self.memory)
        backend = MockFailingBackend()

        patterns, anti_patterns = extract_patterns_from_episode(
            memory=self.memory,
            episode_id=episode_id,
            backend=backend,
            verbose=False,
        )
        self.assertEqual(patterns, [])
        self.assertEqual(anti_patterns, [])

    def test_handles_invalid_json_gracefully(self):
        """If LLM returns invalid JSON, return empty lists."""
        episode_id = _create_test_episode(self.memory)
        backend = MockInvalidJsonBackend()

        patterns, anti_patterns = extract_patterns_from_episode(
            memory=self.memory,
            episode_id=episode_id,
            backend=backend,
            verbose=False,
        )
        self.assertEqual(patterns, [])
        self.assertEqual(anti_patterns, [])

    def test_handles_nonexistent_episode(self):
        """If episode_id doesn't exist, return empty lists."""
        backend = MockExtractionBackend()
        patterns, anti_patterns = extract_patterns_from_episode(
            memory=self.memory,
            episode_id="nonexistent-id",
            backend=backend,
            verbose=False,
        )
        self.assertEqual(patterns, [])
        self.assertEqual(anti_patterns, [])

    def test_extracted_patterns_retrievable_next_session(self):
        """Critical: patterns extracted from session 1 should be retrieved in session 2.

        This is the cross-session learning test — the whole point of Fase 2.
        """
        # Session 1: create episode and extract patterns
        episode_id = _create_test_episode(self.memory, brief="Design a hero for photographer portfolio")
        backend = MockExtractionBackend()
        extract_patterns_from_episode(
            memory=self.memory,
            episode_id=episode_id,
            backend=backend,
            verbose=False,
        )

        # Session 2: start new session with similar brief
        # Close and reopen memory to simulate new session
        self.memory.close()
        self.memory = MemorySystem(db_path=self.db_path, lancedb_path=self.lancedb_path)

        self.memory.start_session(
            brief="Design a hero for a wedding photographer",
            brief_summary="wedding photographer portfolio hero",
            vertical="portfolio",
        )

        # Should retrieve the parallax pattern for photographers
        self.assertGreater(len(self.memory.working.retrieved_patterns), 0)
        found_photographer_pattern = any(
            "photographer" in p.get("content", "").lower()
            for p in self.memory.working.retrieved_patterns
        )
        self.assertTrue(found_photographer_pattern,
                        f"Expected photographer pattern in retrieved: {[p['content'][:50] for p in self.memory.working.retrieved_patterns]}")


class TestConsolidateWithLLM(unittest.TestCase):

    def setUp(self):
        clear_cache()
        self.tmpdir = tempfile.mkdtemp()
        self.db_path = Path(self.tmpdir) / "memory.db"
        self.lancedb_path = Path(self.tmpdir) / "lancedb"
        self._embedder_patcher = patch("memory.stores.get_embedder", return_value=FakeEmbedder(dimension=64))
        self._embedder_patcher.start()
        self.memory = MemorySystem(db_path=self.db_path, lancedb_path=self.lancedb_path)

    def tearDown(self):
        self._embedder_patcher.stop()
        clear_cache()
        self.memory.close()
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_consolidation_promotes_skills_and_anti_patterns(self):
        """Verify LLM consolidation promotes skills + anti-patterns."""
        # Seed 3 episodes (above min_episodes threshold)
        for i in range(3):
            _create_test_episode(self.memory, brief=f"Photographer hero {i}")

        backend = MockConsolidationBackend()
        result = consolidate_with_llm(
            memory=self.memory,
            backend=backend,
            days_back=30,
            min_episodes=3,
            verbose=False,
        )

        self.assertEqual(result["episodes_processed"], 3)
        self.assertEqual(result["skills_promoted"], 1)
        self.assertEqual(result["anti_patterns_added"], 1)

        # Verify skill was stored
        stats = self.memory.stats()
        self.assertEqual(stats["skills"], 1)
        self.assertGreaterEqual(stats["anti_patterns"], 1)

    def test_consolidation_skips_if_insufficient_episodes(self):
        """Don't run consolidation if fewer than min_episodes."""
        # Only 1 episode
        _create_test_episode(self.memory, brief="single episode")

        backend = MockConsolidationBackend()
        result = consolidate_with_llm(
            memory=self.memory,
            backend=backend,
            days_back=30,
            min_episodes=3,
            verbose=False,
        )

        self.assertEqual(result["episodes_processed"], 1)
        self.assertEqual(result["skills_promoted"], 0)
        self.assertEqual(backend.calls, 0)  # LLM not called

    def test_consolidation_handles_llm_failure(self):
        """If LLM fails, return zeros with error."""
        for i in range(3):
            _create_test_episode(self.memory, brief=f"Hero {i}")

        backend = MockFailingBackend()
        result = consolidate_with_llm(
            memory=self.memory,
            backend=backend,
            days_back=30,
            min_episodes=3,
            verbose=False,
        )

        self.assertEqual(result["skills_promoted"], 0)
        self.assertEqual(result["anti_patterns_added"], 0)
        self.assertIn("error", result)


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    unittest.main(verbosity=2)
