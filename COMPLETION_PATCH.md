# Completion Patch Notes

This patch makes the project runnable as a complete IELTS learning app even when private resources have not been imported yet.

## Verify locally

```bash
npm install
npm run smoke:source
npm run build
npm run dev
```

Then open:

- `/learning-check` for app health
- `/mission` for the full mission flow
- `/vocabulary` for vocabulary library
- `/synonym-arena` for paraphrase practice
- `/dictation` for listening spelling practice
- `/reading/dossier`, `/reading/passages`, `/reading/questions` for IELTS reading assets
- `/reading-lab` for scenario reading
- `/review` for spaced review

## Runtime fallback strategy

- Vocabulary uses private generated data when available, otherwise bundled sample data.
- Dictation uses private transcript/audio-generated items when available, otherwise sample listening-survival words.
- Reading assets use private generated passages/questions when available, otherwise bundled Reading Lab articles converted into IELTS-style passages, questions, and answer keys.
- Scenario reading uses private imported articles when available, otherwise bundled sample scenario readings.
- `/api/app-health` checks that all core data sources are usable.
