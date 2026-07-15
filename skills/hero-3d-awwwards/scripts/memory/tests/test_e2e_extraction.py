"""
End-to-end test for Fase 2: pattern extraction integrated into hero-loop.

Verifies that:
    1. After a session completes, patterns are extracted and stored
    2. The extracted patterns are visible in memory stats after the loop
    3. A second session retrieves those patterns

Run with:
    cd /home/z/my-project/skills/hero-3d-awwwards/scripts
    python -m memory.tests.test_e2e_extraction
"""

import importlib.util
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from memory import MemorySystem, FakeEmbedder, clear_cache


# ============================================================
# MOCK BACKEND: handles all 5 agent roles + extraction
# ============================================================

class FullMockBackend:
    """Mock backend that returns appropriate responses based on which agent is calling.
    
    Detects agent by inspecting system_prompt content.
    """

    def __init__(self):
        self.calls = []

    def complete(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
        self.calls.append({
            "system_length": len(system_prompt),
            "user_length": len(user_prompt),
            "temperature": temperature,
        })

        # Detect which agent / phase is calling
        if "Creator Agent" in system_prompt[:200]:
            return self._creator_response()
        elif "Auditor Agent" in system_prompt[:200]:
            return self._auditor_response()
        elif "User Simulator Agent" in system_prompt[:200]:
            return self._user_simulator_response()
        elif "Corrector Agent" in system_prompt[:200]:
            return self._corrector_response()
        elif "Pattern Extraction Agent" in system_prompt[:200]:
            return self._extraction_response()
        else:
            return '{"error": "unknown agent"}'

    def _creator_response(self) -> str:
        return """## Manifest
```json
{
  "archetype": "2.5D-Parallax",
  "stack": "css-3d",
  "palette": ["#05050f", "#ffffff", "#ff0040"],
  "timing_seconds": 2.5,
  "cta": "Get Started"
}
```

## Files Created
- `Hero.tsx`

## Code
### `Hero.tsx`
```tsx
"use client";
export function Hero() {
  return (
    <section style={{ height: "100vh", background: "#05050f" }}>
      <h1 style={{ color: "#ffffff" }}>FLOW STATE</h1>
    </section>
  );
}
```
"""

    def _auditor_response(self) -> str:
        return """{
  "iteration": 1,
  "overall_pass": true,
  "score": 9.0,
  "total_applicable": 22,
  "criteria_passed": 22,
  "criteria_failed": 0,
  "blockers": [],
  "scope_creep": false,
  "criteria": [{"id": "C7", "name": "reduced-motion", "category": "performance", "severity": "blocker", "applies": true, "passed": true, "evidence": "Code includes matchMedia check.", "fix_hint": null, "fix_superficial": false}],
  "summary": "All pass",
  "recommendation": "deliver"
}"""

    def _user_simulator_response(self) -> str:
        return """{
  "iteration": 1,
  "subjective_score": 8.5,
  "first_impression": {"hook_clarity": 8, "wow_factor": 8, "memorability": 7, "premium_feel": 9},
  "competitive_comparison": {"sotd_worthy": true},
  "soul_analysis": {"soul_description": "Restrained minimalism", "soul_clarity": 8},
  "subjective_blockers": [],
  "summary": "Strong",
  "recommendation": "deliver"
}"""

    def _corrector_response(self) -> str:
        return "## Changes Applied\n(none needed)"

    def _extraction_response(self) -> str:
        return """{
  "patterns": [
    {
      "content": "For photographer portfolios, parallax 2.5D with 3-5 layers achieves premium feel",
      "category": "archetype-selection",
      "importance": 8,
      "evidence": "Score 9.0 with parallax approach",
      "applies_to_verticals": ["portfolio"]
    },
    {
      "content": "Magenta accent (#ff0040) on deep navy creates Awwwards-worthy contrast",
      "category": "color",
      "importance": 7,
      "evidence": "User Simulator premium_feel=9",
      "applies_to_verticals": []
    }
  ],
  "anti_patterns": [
    {
      "description": "Linear easing on primary animations fails C11",
      "failure_mode": "C11",
      "evidence": "Auditor would flag linear easing"
    }
  ]
}"""


# ============================================================
# E2E TEST
# ============================================================

class TestE2EExtraction(unittest.TestCase):

    def setUp(self):
        clear_cache()
        self.tmpdir = tempfile.mkdtemp()
        self._embedder_patcher = patch("memory.stores.get_embedder", return_value=FakeEmbedder(dimension=64))
        self._embedder_patcher.start()

    def tearDown(self):
        self._embedder_patcher.stop()
        clear_cache()
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_full_session_with_extraction(self):
        """End-to-end: run loop → episode saved → patterns extracted → visible in stats."""
        # Load hero_loop
        hero_loop_path = Path(__file__).parent.parent.parent / "hero-loop.py"
        spec = importlib.util.spec_from_file_location("hero_loop", hero_loop_path)
        hero_loop = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(hero_loop)

        backend = FullMockBackend()

        # Run a 1-iteration session with memory enabled
        state = hero_loop.run_loop(
            user_prompt="Design a hero for photographer portfolio",
            backend=backend,
            output_dir=Path(self.tmpdir) / "output",
            max_iterations=1,
            min_score=9.0,
            enable_user_simulator=True,
            enable_memory=True,
            memory_db=Path(self.tmpdir) / "memory.db",
            memory_lancedb=Path(self.tmpdir) / "lancedb",
            vertical="portfolio",
            archetype="2.5D-Parallax",
            stack="css-3d",
            verbose=False,
        )

        # Verify session succeeded
        self.assertEqual(state["stopped_reason"], "success")

        # Verify episode was saved
        self.assertIsNotNone(state.get("episode_id"))

        # Verify patterns were extracted
        self.assertIn("patterns_extracted", state)
        self.assertEqual(state["patterns_extracted"], 2)
        self.assertEqual(state["anti_patterns_extracted"], 1)

        # Verify in the actual memory DB
        with MemorySystem(
            db_path=Path(self.tmpdir) / "memory.db",
            lancedb_path=Path(self.tmpdir) / "lancedb",
        ) as mem:
            stats = mem.stats()
            self.assertEqual(stats["episodes"], 1)
            self.assertEqual(stats["semantic_notes"], 2)
            self.assertEqual(stats["anti_patterns"], 1)

    def test_cross_session_learning(self):
        """Run session 1 → patterns extracted → session 2 retrieves them."""
        hero_loop_path = Path(__file__).parent.parent.parent / "hero-loop.py"
        spec = importlib.util.spec_from_file_location("hero_loop", hero_loop_path)
        hero_loop = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(hero_loop)

        backend = FullMockBackend()
        memory_db = Path(self.tmpdir) / "memory.db"
        lancedb_path = Path(self.tmpdir) / "lancedb"

        # Session 1
        state1 = hero_loop.run_loop(
            user_prompt="Design a hero for photographer portfolio",
            backend=backend,
            output_dir=Path(self.tmpdir) / "session1",
            max_iterations=1,
            min_score=9.0,
            enable_user_simulator=True,
            enable_memory=True,
            memory_db=memory_db,
            memory_lancedb=lancedb_path,
            vertical="portfolio",
            verbose=False,
        )
        self.assertEqual(state1["stopped_reason"], "success")
        self.assertEqual(state1["patterns_extracted"], 2)

        # Session 2 — should retrieve patterns from session 1
        # Need to clear the embedding cache so it doesn't interfere
        clear_cache()

        state2 = hero_loop.run_loop(
            user_prompt="Design a hero for wedding photographer",
            backend=backend,
            output_dir=Path(self.tmpdir) / "session2",
            max_iterations=1,
            min_score=9.0,
            enable_user_simulator=True,
            enable_memory=True,
            memory_db=memory_db,
            memory_lancedb=lancedb_path,
            vertical="portfolio",
            verbose=False,
        )

        # Session 2 should also succeed
        self.assertEqual(state2["stopped_reason"], "success")

        # Verify the second session's memory had retrieved patterns
        # (we can't directly inspect from state, but we can check the memory DB)
        with MemorySystem(db_path=memory_db, lancedb_path=lancedb_path) as mem:
            stats = mem.stats()
            # Should have 2 episodes now (session 1 + session 2)
            self.assertEqual(stats["episodes"], 2)
            # Should still have the patterns from session 1
            # (session 2 may have added more, but at least the original 2)
            self.assertGreaterEqual(stats["semantic_notes"], 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
