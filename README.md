# Interview Copilot

A local Next.js interview practice app: continuous Chrome transcription, streamed
OpenAI suggestions, actual spoken-answer transcripts, and context grouped by Part.
No database, login or agents.

## Run on computer B (Windows)

Install Node.js 22 or newer. Open PowerShell in the folder containing package.json:

```powershell
npm ci
Copy-Item .env.example .env.local
notepad .env.local
npm run dev
```

Set `OPENAI_API_KEY=your-key` in `.env.local`, save as UTF-8, and open
**http://127.0.0.1:3000** in desktop Chrome (use the terminal's port if different).
Never put the key in a browser field or GitHub. The server binds only to loopback;
do not expose its unauthenticated endpoint on a public server. For a local
production build run `npm run build`, then `npm start`.

## The Part workflow

A **Part** is one large interview problem with its smaller questions/follow-ups.

1. Paste/load background, optionally enter a target role/company and paste or
   attach a JD TXT file. Choose General Question, Coding or System Design.
2. Click **Start Listening** once and allow the microphone. Computer A plays the
   interviewer; computer B transcribes the small question. You can edit or type it.
3. Click **Answer**. The question locks, a suggestion streams, and microphone
   transcription switches to **Your spoken answer**. Speak your answer; it is
   recorded separately from the AI suggestion. Answer can start recognition if
   you typed the question and recognition was not already running.
4. Click **End Answer** when you finish. This saves the small question, your
   actual spoken/edited answer, and the separate suggestion in this Part's
   history. Recognition immediately returns to the next small question.
5. Repeat Answer → speak → End Answer. Each new request includes all saved
   question/answer turns from the current Part. There is no buffer promotion or
   manual follow-up setup.
6. Click **Next Part**, or say **next part** as a standalone phrase. This finishes
   any current answer, cancels active generation, archives the old Part for
   review, clears active context and begins a new Part. Earlier Parts are never
   sent as context for the new Part. Saying "My answer is complete. Next part."
   is also supported while recording an answer. A phrase such as "the next part
   of the design" is not a command. Only finalized speech triggers navigation;
   there is no speaker identification, so either speaker's standalone command
   can trigger it. Use the button if recognition misses the words.

**End Answer works while a suggestion is still generating.** It saves your
transcript and any partial suggestion, then cancels the remaining generation.
If generation fails, you can still record your answer and end it; Retry suggestion
is available without discarding your speech. A missing transcript stays explicitly
empty and is never replaced with the AI suggestion. Text can be corrected in
Your spoken answer before finishing. No audio recording file is created.

The main cycle has two buttons (Answer / End Answer) plus Next Part. Pause
Listening is independent. Settings, background and role/JD remain available
between Parts. A library sample can be selected before the first answer in a
Part. Original-question context is retained for design-case retrieval on follow-ups.

## Background and settings

Background text automatically saves in this browser and restores on refresh or
reopening. Edits auto-save; Clear saved background removes it. Use the same
browser profile, address and port: localhost and 127.0.0.1 have separate browser
storage. Clearing browser data/private mode can remove the saved background.
Role, JD, preferences, active history and earlier Parts remain in memory in this
tab only; refreshing/closing clears them. Background supports TXT up to 160 KB /
40,000 characters; optional JD supports TXT up to 80 KB / 20,000 characters.

Choose IELTS 5–9 in half-band steps (default 6.5) and Natural, Professional,
Conversational, Concise or STAR style. IELTS controls explanatory vocabulary and
sentence complexity, not a score prediction or code correctness. Technical formats
and completeness take precedence over a short/STAR style. The JD guides relevance
and is not treated as proof of the candidate's experience.

## Models, formats and examples

- General Question: `gpt-6-luna`, reasoning none, up to 900 output tokens.
- Coding / System Design: `gpt-6.1-sol`, reasoning medium, up to 25,000 output
  tokens including reasoning. SDK timeout: 180 seconds. Your API project must
  have access to both models; there is no silent model fallback.
- Legacy `OPENAI_MODEL` is ignored and can be removed from .env.local.
- `prompts/coding-amazon.md`: clarification, baseline, optimization, correctness,
  complete code, tests, complexity and follow-ups. This original framework is
  informed by Amazon public guidance, not an official scoring rubric. Languages:
  Python (default), Java, JavaScript, TypeScript, C++ and Go.
- `prompts/system-design.md`: scope/assumptions, estimates, APIs/data model,
  architecture, deep dives, failures/operation and tradeoffs.
- `knowledge/system-design/`: 14 original example designs and a manifest with
  source notes. Keyword/alias matching over the current and original question
  selects up to two examples; unmatched questions use the general framework.
  Examples must be adapted, not copied. This is local retrieval, not model
  training or verified Amazon question-frequency data. Indirect paraphrases can
  be missed. Expand Practice case library to load a sample.
- Prompt and case Markdown is injected server-side and traced into production
  output by next.config.ts. Rebuild/restart after editing these files.
- Safe Markdown rendering supports headings, code and tables without raw HTML.
  The app does not execute code or guarantee correct solutions.

## Context, privacy and limits

Part history distinguishes `answerSource: candidate` (actual transcript) and
`suggestedAnswer` (AI text), including whether the suggestion completed. Legacy
history without a source remains an AI suggestion, never candidate speech. A
transcript is context for follow-ups, not verified evidence of work experience.

A Part supports 30 saved turns and 240,000 characters of context (questions,
actual answers and suggestions combined). New generation stops at the limit
instead of silently dropping old turns. Earlier Parts remain review-only in
browser memory. History increases input usage and cost. Nothing is sent to
OpenAI while merely listening: generation sends background, role/JD, current
question and this Part's history with `store:false`. Provider policies still
apply. Chrome recognition may require internet and send audio to its provider;
it is not guaranteed offline. Use where assistance and recording are permitted.

Recognition reconnects with backoff after interruption and stops after six
consecutive failures. Permission/device errors require intervention. At phase
boundaries old callbacks are detached and identity-checked; interim text is
preserved, and late generation results cannot overwrite a later small question
or new Part. Speech is routed by the Answer/End Answer phase, not by speaker:
click End Answer before the interviewer starts the next question.

## Troubleshooting

Run `npm run doctor` to check key configuration without printing it or making
paid API calls. The file must be exactly `.env.local` beside package.json, not
`.env.local.txt` or `.env local`; use `OPENAI_API_KEY=your-key`, not the key alone.
The server can read a newly saved missing key without restarting. Existing
non-empty environment variables take precedence; restart after changing a key
already loaded by Next.js.

For Cross-origin request denied, update the source, restart and open the same
127.0.0.1 address/port shown in the terminal. The API accepts loopback aliases on
the same protocol/port but rejects external origins. If model access is denied,
check that the API project can use both routed models.

## Verification

```sh
npm run typecheck
npm test
npm run build
npm run test:production
```

GitHub Actions runs these on pushes and PRs. Unit tests cover input/context
validation, Part speech routing, saved actual versus suggested answers, voice
commands, archives/reset, late-result rejection, mode routing and case retrieval.
Production smoke tests use a local fake OpenAI endpoint and key, verify both
models, all 14 examples, actual/suggested history and production file tracing.
They create no paid API calls. Actual browser clicks, acoustic pickup, Chrome
speech accuracy, API access, model quality and latency need local Chrome testing.

## Documentation

- https://developers.openai.com/api/docs/guides/streaming-responses
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/continuous
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/end_event
