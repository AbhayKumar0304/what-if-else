# Security & Threat Model: "What Did I Miss?"

## 1. System Overview & Trust Boundary

"What Did I Miss?" executes as a standalone single-page application (SPA) running entirely in the user's web browser client. There is **no backend server**, **no serverless function**, and **no third-party telemetry, tracking pixels, or cloud LLM service**.

The trust boundary is strictly confined to the local browser tab execution context.

```text
+-----------------------------------------------------------------------------------+
| User's Local Machine / Web Browser Execution Context                              |
|                                                                                   |
|  +--------------------+        DOM Events       +-----------------------------+   |
|  | User Input / Paste | ----------------------> | In-Memory ChatParser        |   |
|  +--------------------+                         +-----------------------------+   |
|                                                                |                  |
|                                                                v                  |
|  +--------------------+    Safe DOM Insertion   +-----------------------------+   |
|  | Rendered Dashboard | <---------------------- | Heuristic Intelligence Core |   |
|  | (Using textContent)|                         | - ShieldEngine (Risk 0-100) |   |
|  +--------------------+                         | - RelevanceEngine (Topics)  |   |
|                                                 | - DuplicateDetector (Tokens)|   |
|                                                 | - RuleEngine (Tasks/Dates)  |   |
|                                                 +-----------------------------+   |
|                                                                                   |
|  [ NO LOCALSTORAGE ]  [ NO SESSIONSTORAGE ]  [ NO COOKIES ]  [ NO OUTBOUND XHR ]  |
+-----------------------------------------------------------------------------------+
                                    ||
                       ============================
                       AIR GAP / ZERO OUTBOUND HTTP
                       ============================
                                    ||
                                    X (Blocked / Non-existent)
                                    v
                         [ Public Cloud / APIs ]
```

---

## 2. Threat Analysis & Mitigations

### Threat A: Cross-Site Scripting (XSS) via Untrusted Chat Input
- **Threat Scenario:** A malicious user pastes a crafted chat transcript containing payloads such as `<script>alert('pwned')</script>`, `<img src="x" onerror="evilCode()">`, or `<a href="javascript:void(0)" onclick="...">`.
- **Impact:** In applications using `element.innerHTML = message`, injected scripts execute in the browser, potentially hijacking cookies, DOM state, or tokens.
- **Mitigation:**
  - **Zero `innerHTML` for dynamic content:** All dynamic message text is rendered via native DOM manipulation:
    - `element.textContent = untrustedString`
    - `document.createTextNode(untrustedString)`
    - `DOM.create('tag', { text: untrustedString })`
  - The browser parses the text strictly as string literals, rendering code tags inertly as plain visible characters (`<script>...`).

### Threat B: Data Leakage & Confidentiality Breach
- **Threat Scenario:** Sensitive chat conversations containing corporate roadmaps, internal credentials, passwords, customer emails, or student records are leaked to third-party endpoints.
- **Impact:** Regulatory fines (GDPR, FERPA, HIPAA, SOC 2) and corporate espionage.
- **Mitigation:**
  - **Zero Outbound HTTP Calls:** The application makes **zero `fetch()`**, `XMLHttpRequest`, `navigator.sendBeacon()`, or `WebSocket` connections.
  - **Zero Third-Party CDNs or Analytics:** No external tracking scripts, Google Analytics, or external fonts are imported.
  - **Fully Air-Gapped:** The application functions with 100% fidelity even when disconnected from the Internet.

### Threat C: Local Data Residue on Shared Devices
- **Threat Scenario:** A user analyzes private chats on a shared lab or office computer. A subsequent user opens the browser and views past conversations or cached analytics.
- **Impact:** Unauthorized eavesdropping on private communications.
- **Mitigation:**
  - **Zero Persistent Storage:** The application explicitly refuses to use `window.localStorage`, `window.sessionStorage`, IndexedDB, or HTTP Cookies.
  - **Volatile In-Memory Lifecycle:** All parsed messages, topic weights, and summaries live strictly in temporary JavaScript runtime memory.
  - **Instant Purge:** The "Clear All Data" button clears all memory references, resets form controls, and invokes DOM element removal. Closing the browser tab permanently flushes all traces.

### Threat D: Regular Expression Denial of Service (ReDoS) & Large Inputs
- **Threat Scenario:** An adversarial input contains repetitive sequences (e.g., `aaaaaaaa...`) designed to trigger exponential backtracking in regex engines.
- **Impact:** Freezing the browser UI thread.
- **Mitigation:**
  - All regular expressions are non-nesting and bounded.
  - Repetition and duplicate analysis use an $O(N)$ normalized hash map (`DuplicateDetector.normalize`) rather than naive $O(N^2)$ pairwise text comparisons, maintaining sub-150ms execution on 5,000+ line inputs.
  - Input length counters provide instant visual feedback for transcripts exceeding 200,000 characters.

### Threat E: Accidental Exposure of PII in Generated Summaries
- **Threat Scenario:** Exporting an executive digest inadvertently shares direct telephone numbers or student email addresses.
- **Impact:** Privacy violations and potential doxing.
- **Mitigation:**
  - Built-in heuristic PII scanner detects emails and telephone patterns.
  - Interactive "Redact Sensitive Data" switch immediately masks detected entities (`[REDACTED EMAIL]`, `[REDACTED PHONE]`) across both the on-screen report and the generated Markdown clipboard copy.
  - Source citations maintain verbatim original text in an isolated inspectable view, preserving auditability while keeping exported briefs clean.

### Threat F: False Sense of Security in Heuristic Spam/Phishing Detection
- **Threat Scenario:** A user assumes that because a message receives a low risk score, it is guaranteed to be legally legitimate, or conversely, assumes a high score is definitive proof of a criminal fraudster.
- **Impact:** Misplaced trust or unfair accusation of legitimate peers.
- **Mitigation & Transparency:**
  - **Transparent Heuristic Framing:** The UI and reports explicitly label the 0–100 score as a *heuristic risk indicator*, never a definitive proof of fraud.
  - **Explainable Reasoning:** Every flagged item clearly lists the specific triggers detected (e.g., *Prompts for an OTP code in an urgent security context*).
  - **Preservation of Legitimate Notices:** Legitimate academic notices with words like "URGENT" or "DEADLINE" are recognized via mitigating rules and not penalized as spam.
  - **Offline Limitations Notice:** The application transparently states its offline constraints: sender authenticity (SPF/DKIM), link reputation databases (Google Safe Browsing), and shortened URL redirection cannot be checked without network queries.
  - **Neutrality on Unknown Senders:** Generic or unknown sender identifiers (e.g., `Speaker 99`) are evaluated neutrally and never penalized as spam on their own.

### Threat G: Privacy-Preserving User Relevance Feedback
- **Threat Scenario:** User relevance preferences or 👍 / 👎 feedback persist across sessions and build a profile of user interests that could be harvested.
- **Impact:** Profiling user habits without consent.
- **Mitigation:**
  - Personal relevance adjustments are stored strictly in volatile session memory.
  - Feedback keywords and overrides are never stored persistently (no cookies, no storage).
  - Clicking "Clear All Data" or closing the tab resets all feedback state immediately.

---

## 3. How to Independently Audit & Verify

Any developer or security auditor can verify these guarantees in under 60 seconds:

1. **Open DevTools:** Press `F12` or `Ctrl + Shift + I` in Microsoft Edge, Google Chrome, or Mozilla Firefox.
2. **Audit Network Traffic:**
   - Go to the **Network** tab.
   - Click "Load Demo Chat" and then "Generate Catch-Up Report".
   - Confirm that **0 network requests** are dispatched.
3. **Audit Storage:**
   - Go to the **Application** (or **Storage**) tab.
   - Expand `Local Storage`, `Session Storage`, and `Cookies`.
   - Confirm that all storage categories remain completely empty (`0 items`).
4. **Audit DOM Sanitization:**
   - Paste `<img src=x onerror=alert('xss')>` into the chat input.
   - Click "Generate Catch-Up Report".
   - Confirm that the string is displayed literally on screen as text and no alert dialog executes.
5. **Run Automated Test Suite:**
   - Run `powershell -ExecutionPolicy Bypass -File .\run_tests.ps1` to execute all 42 automated tests and code audit checks.
