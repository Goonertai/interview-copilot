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

Set `OPENAI_API_KEY` to your own API key in `.env.local`. API billing is separate from ChatGPT subscriptions. `OPENAI_MODEL` is configurable, default `gpt-4.1-mini`. Never put the key in source code, a browser field or GitHub. Open **http://localhost:3000** in desktop Google Chrome. The server binds only to loopback. For production build locally: `npm run build`, then `npm start`.

1. Paste resume/project notes or load a UTF-8 `.txt` file.
   Optionally enter a target role/company and paste a JD or attach its UTF-8 TXT file
   (up to 80 KB / 20,000 characters). You can edit or remove the loaded JD.
   In Suggested Answer choose an IELTS level from 5 to 9 in half-band steps
   (default 6.5), and Natural, Professional, Conversational, Concise or STAR style.
   These preferences apply the next time you generate; they do not rewrite an existing answer.
   IELTS is a vocabulary/sentence-complexity preference, not a score prediction.
   Role and JD guide relevance but are never treated as evidence of your experience.
2. Click **Start Listening** and allow the microphone.
3. Play the English question through computer A's speakers.
4. Review/edit **Live Transcript**, click **Generate Answer**. Interim speech is included at click time.
5. Click **Next Question** when ready to discard the current question and answer; recognition reconnects automatically. This prevents your spoken answer from mixing into the next prompt. The app cannot distinguish speakers; clear the transcript after you finish speaking, before the next question.
6. **Stop Listening** releases recognition; **Stop generating** cancels an answer.

Keep the tab open and awake. Continuous recognition may disconnect; automatic reconnection uses backoff and stops after six consecutive failures. Permission/device errors require user intervention. If browser recognition is unavailable you can type questions. Chrome speech recognition may require internet and sends audio to its recognition provider; it is not guaranteed offline. The app itself does not record audio or persist your resume/transcript. On Generate, the question and resume are sent to OpenAI with `store:false`; provider data policies still apply. Use where assistance and recording are permitted.

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
```

GitHub Actions runs these on pushes and PRs. Automated tests validate input and API safeguards; API streaming is tested with mocked OpenAI events. Browser integration is not yet verified in this environment. Mock tests do not validate physical microphones, acoustic pickup, actual browser speech services, model quality or latency. Live API testing requires a configured paid API key. On computer B verify microphone permission, question pickup, stream latency, second-question isolation and stopping/reconnecting. This MVP is local only; do not expose its unauthenticated endpoint on a public server.

## Documentation

- https://developers.openai.com/api/docs/guides/streaming-responses
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/continuous
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/end_event
