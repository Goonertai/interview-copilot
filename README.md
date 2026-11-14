# Interview Copilot MVP

Next.js, TypeScript, Chrome Web Speech API and OpenAI Responses streaming. No database, login or agents.

## Run on computer B (Windows)

Install Node.js 22 or newer. Extract this project, open PowerShell in the project folder:

```powershell
npm ci
Copy-Item .env.example .env.local
notepad .env.local
npm run dev
```

Set `OPENAI_API_KEY` to your own API key in `.env.local`. API billing is separate from ChatGPT subscriptions. Models are routed by question type: General Question uses `gpt-6-luna` with no reasoning; Coding and System Design use `gpt-6.1-sol` with medium reasoning. The legacy `OPENAI_MODEL` variable is ignored; an existing line can be removed. Your API project must have access to both models. No silent fallback to a different model is used. Never put the key in source code, a browser field or GitHub. Open **http://localhost:3000** in desktop Google Chrome. The server binds only to loopback. For production build locally: `npm run build`, then `npm start`.

1. Paste resume/project notes or load a UTF-8 `.txt` file. Background text is automatically saved in this browser and restored on refresh or reopening. Edits also auto-save. Use **Clear saved background** to remove it. Use the same browser profile, address and port (localhost and 127.0.0.1 have separate browser storage). Clearing browser data or using private mode may remove the saved background. Role, JD, answer preferences, questions and answers remain session-only.
   Optionally enter a target role/company and paste a JD or attach its UTF-8 TXT file
   (up to 80 KB / 20,000 characters). You can edit or remove the loaded JD.
   In Suggested Answer choose an IELTS level from 5 to 9 in half-band steps
   (default 6.5), and Natural, Professional, Conversational, Concise or STAR style.
   These preferences apply the next time you generate; they do not rewrite an existing answer.
   IELTS is a vocabulary/sentence-complexity preference, not a score prediction.
   Role and JD guide relevance but are never treated as evidence of your experience.
2. Click **Start Listening** and allow the microphone.
3. Play the English question through computer A's speakers.
4. Choose **General Question**, **Coding** or **System Design** in the question panel. Review/edit the transcript or paste a complete problem, then click **Generate Answer**. Interim speech is included at click time. Background is required only for General Question; technical modes work without a resume. Coding defaults to Python with Java, JavaScript, TypeScript, C++ and Go options. Mode, language and answer settings remain selected for the next question. Switching mode clears the old answer and retains the current question.
5. Generate freezes the current question (including its interim transcript). Later microphone results go to a separate editable **Later audio** buffer and are never automatically included in a request. Review/remove your own speech there, then click **Use Buffer as Follow-up** to prepare the next question. Alternatively click **Capture Follow-up** for a blank question and begin speaking/typing the follow-up. Both keep this topic's completed question/answer history. Click Generate Answer to send the prepared follow-up with that history.
6. **Edit / Retry** unlocks the frozen question for correction or regeneration, preserving history. **Discard Buffer** clears only later audio. The buffer holds up to 12,000 recent characters and cannot identify speakers.
7. Click **Next Question** to cancel any ongoing generation and clear the current topic: history, question, answer and buffer. Recognition resumes into the fresh question. Background, role, JD and preferences remain available. Mode changes preserve history; library samples are disabled after a topic has begun.
8. **Stop Listening** releases recognition; **Stop generating** cancels an answer. Failed or cancelled answers are not recorded as completed history.

Keep the tab open and awake. Continuous recognition may disconnect; automatic reconnection uses backoff and stops after six consecutive failures. Permission/device errors require user intervention. If browser recognition is unavailable you can type questions. Chrome speech recognition may require internet and sends audio to its recognition provider; it is not guaranteed offline. The app does not record audio or persist transcripts. Background text is saved only in this browser’s localStorage, not on the server. If local saving fails, the page reports it and you can continue using the current background for this session. On Generate, the question and resume are sent to OpenAI with `store:false`; provider data policies still apply. Use where assistance and recording are permitted.

## Verification

### API key configuration troubleshooting

Run `npm run doctor` in the folder containing `package.json`. It checks configuration
without displaying the key or making a paid API call. The filename must be exactly
`.env.local`, not `.env.local.txt` or `.env local`. Save it as UTF-8 with
`OPENAI_API_KEY=your-key` on one line; pasting the key alone is insufficient.
The answer endpoint now reads this file as a fallback when its process has no key,
so saving a missing key does not require a restart. Existing non-empty environment
variables take precedence; restart after changing a key already loaded by Next.js.

If Generate Answer reports `Cross-origin request denied`, update to the latest source,
restart the server, and open **http://127.0.0.1:3000** in Chrome (use the port shown
in the terminal if 3000 is occupied). The API accepts localhost/127.0.0.1/IPv6
loopback aliases on the same protocol and port, while rejecting foreign origins.

```sh
npm run typecheck
npm test
npm run build
npm run test:production
```

GitHub Actions runs these on pushes and PRs. The production smoke test starts a local mock OpenAI endpoint, checks both model routes and all 14 design examples through HTTP, and verifies prompt/case files are included in production tracing. It uses no paid API calls. Automated tests validate input and API safeguards; API streaming is tested with mocked OpenAI events. Browser integration is not yet verified in this environment. Mock tests do not validate physical microphones, acoustic pickup, actual browser speech services, model quality or latency. Live API testing requires a configured paid API key. On computer B verify microphone permission, question pickup, stream latency, second-question isolation and stopping/reconnecting. This MVP is local only; do not expose its unauthenticated endpoint on a public server.

## Documentation

- https://developers.openai.com/api/docs/guides/streaming-responses
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/continuous
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/end_event

## Technical answer formats and case library

- `prompts/coding-amazon.md` is injected into Coding requests. It covers clarification,
  baseline, optimization, correctness/invariants, complete code, walkthrough/test
  cases, complexity and follow-ups. It is an original practice framework informed
  by Amazon's public preparation guidance, not an official Amazon scoring rubric.
- `prompts/system-design.md` is injected into System Design requests. It covers
  scope, explicit assumptions/estimates, APIs/data model, architecture/data flows,
  deep dives, failures/operation and tradeoffs. Narrow follow-ups stay focused.
- `knowledge/system-design/` contains 14 original worked practice examples plus a
  manifest and source notes. Keyword/alias matching on the current question plus the original question of this topic selects at
  most two examples, with a generic-framework fallback. This is local retrieval,
  not embeddings or training. The model must validate relevance and adapt examples
  to the current requirements, rather than copy an answer. Brand overlaps can
  be misleading and indirect paraphrases can be missed. Topic coverage reflects
  common teaching examples, not verified Amazon frequency rankings.
- In System Design, expand **Practice case library** to load a sample question.
  Reference patterns are previewed and the actual model/reference names appear
  with generated answers. Coding responses display fenced code; design tables
  and headings use a small safe Markdown renderer. Raw HTML is never interpreted.
- IELTS and style apply to explanatory prose. Technical sections, correct code,
  and design accuracy take priority over a short/STAR style preference.
- Technical modes reserve up to 25,000 output tokens including reasoning; visible
  content is guided by the format, not forced to use the full budget. General
  reserves 900. SDK request timeout is 180 seconds. Longer technical responses
  can cost more and take longer to show their first visible text. Incomplete
  responses keep partial text and report budget exhaustion rather than success.
- No code execution or automatic correctness guarantee is provided. Same-topic
  follow-ups receive prior completed questions and suggested answers. These are
  suggestions, not a transcript of what the candidate actually said.
  All regression API tests mock OpenAI; real model quality, latency and access
  must be checked with your API project. Never paste an API key into the question.

Source files are traced into production output via `next.config.ts`. Restart or
rebuild after editing prompt/case Markdown. Model routing is in `lib/generation.ts`.

## Same-topic context and frozen transcription

Completed turns are held in memory in this tab and sent explicitly with the next
request (no database or provider-side conversation storage). Refreshing/closing
the tab clears the topic; locally saved background is separate. Next Question is
the only in-page operation that clears this history. A topic supports 12 completed
answers and a 120,000-character context budget; reaching the limit pauses new
generation rather than silently dropping earlier turns. History increases input
usage and therefore can increase cost.

The question freezes before recognition restarts at a clean boundary. Old
recognizer callbacks are detached and identity-checked so late results cannot
pollute a follow-up or new topic. New audio stays in the editable buffer after
an answer completes, until you explicitly prepare a follow-up or start a new
topic. Capture Follow-up discards the old buffer and starts a blank draft; Use
Buffer as Follow-up copies reviewed buffer text into the draft. Neither button
sends a request. Next Question also aborts any active answer, and late results
from the previous generation cannot replace the new topic. Only successful,
non-empty completed answers enter history; partial/failed answers remain visible
but are excluded. Regenerating with Edit / Retry adds another completed turn.

Regression tests cover freezing, interim/final speech separation, buffer editing,
explicit promotion, context validation, root-case retrieval, reset and late-turn
rejection. Production HTTP smoke tests also verify follow-up history reaches the
mock upstream. Browser speech services and physical microphones require a local
Chrome check; the tests do not establish real speech accuracy or model quality.
