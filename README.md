# What Did I Miss? — Local & Private Chat Catch-Up Briefing

> **Instant catch-up intelligence for busy teams and students. 100% in-browser, rule-based, and zero-cloud.**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla_JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Privacy](https://img.shields.io/badge/Privacy-100%25_Local_&_Zero_Storage-10b981?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-42%2F42_Passed-34d399?style=flat-square)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)

---

## 📖 Table of Contents

- [The Problem](#-the-problem)
- [How It Works](#-how-it-works)
- [Major New Features](#-major-new-features)
  - [🛡️ Feature A: Local Spam & Scam Shield](#-feature-a-local-spam--scam-shield)
  - [🎯 Feature B: Personal Relevance Engine](#-feature-b-personal-relevance-engine)
  - [🔁 Feature C: Smart Duplicate Detection](#-feature-c-smart-duplicate-detection)
- [Quick Start: How to Run](#-quick-start-how-to-run)
- [Running Automated Tests](#-running-automated-tests)
- [Privacy & Security Guarantees](#-privacy--security-guarantees)
- [Traceability & Verification](#-traceability--verification)
- [Architecture & Heuristic Engine](#-architecture--heuristic-engine)
- [Project Structure](#-project-structure)
- [License](#-license)

---

## 🎯 The Problem

When you step away from Slack, Microsoft Teams, Discord, or WhatsApp for a few hours, you return to hundreds of unread messages. Finding out what actually matters—**critical decisions made, tasks assigned to you, impending deadlines, and urgent blockers**—normally requires 20 minutes of tedious scrolling.

Furthermore:
- **Phishing & Scam Exposure:** Group chats frequently receive credential-harvesting phishing links, prize scams, and fake admin alerts.
- **Noise & Info Overload:** Discussion channels are flooded with repeated blast announcements and irrelevant chatter.
- **Privacy Breaches in Public AI:** Pasting raw chat logs into public AI services (ChatGPT, Claude) leaks company roadmaps, student records, and credentials onto external cloud servers.

**"What Did I Miss?"** solves this in milliseconds without a single byte of your data ever leaving your browser.

---

## 💡 How It Works

1. **Paste or Load:** Paste chat text from Slack, Teams, WhatsApp, Discord, or click **"Load Demo Chat"**.
2. **Rule-Based Heuristic Analysis:** Our deterministic JavaScript engine extracts key intelligence in under 20ms using local pattern matching and syntactic rules.
3. **Structured Briefing:** Review prioritized sections:
   - 🛡️ **Spam & Scam Shield Alerts (0–100 heuristic scoring with explainable reasons)**
   - 🚨 **Urgent Alerts & Blockers**
   - ⚖️ **Key Decisions**
   - ✅ **Action Items & Tasks (with extracted assignees)**
   - ⏰ **Deadlines & Target Times**
   - 💡 **Discussion Highlights**
   - 📦 **Deprioritized / Low-Relevance Messages (Optional separate review)**
   - 👥 **Active Participants**
4. **Original Source Traceability:** Every extracted item includes an expandable source citation with sender, timestamp, line number, and verbatim quote.
5. **Redact & Export:** Toggle PII redaction to mask emails and phone numbers, then click **"Copy Summary"** to grab an executive Markdown briefing.

---

## ⚡ Major New Features

### 🛡️ Feature A: Local Spam & Scam Shield

An explainable, browser-local heuristic risk evaluation system that screens messages for deceptive signals without transmitting data:
- **0–100 Heuristic Risk Score:** Transparent score derived from evaluated signals.
- **5 Clear Classifications:**
  1. `Potential scam / high risk` (Score $\ge 70$)
  2. `Suspicious — review recommended` (Score $40 - 69$)
  3. `Possibly promotional or repetitive` (Score $20 - 39$)
  4. `Legitimate-looking announcement / deadline` (Time-sensitive notices preserved)
  5. `No significant risk detected` (Clean peer communication)
- **Multi-Signal Risk Assessment:**
  - *Credential Harvesting:* Prompts for OTPs, 2FA codes, passwords, or PINs.
  - *Financial & Impersonation Scams:* Unrealistic lottery prizes, crypto grants, upfront payment demands, and urgent threats of account deactivation.
  - *Suspicious URLs:* Typosquatting brand spoofing (`paypa1`), raw IP addresses, spam TLDs (`.xyz`, `.top`), and shortened redirect links (`bit.ly`, `tinyurl`).
  - *Manipulative Urgency:* Urgency combined with suspicious requests (whereas genuine deadlines like "register by 5 PM" are mitigated and preserved!).
  - *Repetition Blasts:* Blast announcements repeated across the conversation.
- **Transparency & Offline Limitations Disclaimer:** Explains that heuristic scoring is an indicative signal, not a verified legal finding of fraud, and notes that unknown sender identity alone is never treated as proof of spam.

### 🎯 Feature B: Personal Relevance Engine

Allows users to filter noise according to their personal focus areas:
- **Interactive Topic Filters:**
  - 📚 *Assignments & Exams*
  - 🏛️ *College Announcements*
  - 💻 *Projects & Meetings*
  - 💼 *Internships & Placements*
  - 👤 *Personal Mentions* (matches `@username` or your configured name)
  - 🎟️ *Events & Registrations*
- **Relevance Tiers:** Categorizes items into `Relevant`, `Possibly relevant`, or `Low relevance`.
- **Session-Only Learning (Zero Persistent Storage):** Users can click 👍 **Relevant** or 👎 **Not relevant** on cards to tune ranking for that session. All weights and overrides are held in volatile JavaScript memory and wiped when the tab is closed.
- **Deprioritized Section:** Optional toggle allows users to move low-relevance items into a separate collapsible section at the bottom rather than deleting them.

### 🔁 Feature C: Smart Duplicate Detection

- **O(N) Token Normalization:** Normalizes whitespace, casing, and punctuation to match duplicate announcements.
- **Single Representative Cards:** Displays one primary card with a `🔁 N Occurrences` indicator.
- **Full Traceability Citations:** Inspecting the citation displays original timestamps, line numbers, and verbatim text for each duplicate occurrence.

---

## 🚀 Quick Start: How to Run

Because "What Did I Miss?" requires **no backend, no database, and no build tools**, running it takes less than 5 seconds!

### Method 1: Direct Double-Click (Easiest for Beginners)
1. Navigate to the project folder (`what-did-i-miss`).
2. Double-click the file named **`index.html`**.
3. It will immediately open in your default browser (Microsoft Edge, Google Chrome, Mozilla Firefox, or Safari).

### Method 2: Launch via Windows Command Prompt / PowerShell
In PowerShell, from the project directory, run:
```powershell
Start-Process index.html
```
*(Or simply type `start index.html` in Command Prompt).*

### Method 3: Visual Studio Code "Live Server" (Optional)
If you are using VS Code:
1. Open the `what-did-i-miss` folder in VS Code.
2. Install the **"Live Server"** extension (by Ritwick Dey).
3. Right-click `index.html` and choose **"Open with Live Server"**.

---

## 🧪 Running Automated Tests

A comprehensive test suite with 42 automated tests covers input handling, chat formats, rule-based extraction, security invariants, the Spam & Scam Shield, Personal Relevance, and Duplicate Detection.

To execute the test suite in PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File .\run_tests.ps1
```

Or open `tests/test-runner.html` directly in any web browser to view the visual test dashboard!

---

## 🔒 Privacy & Security Guarantees

| Guarantee | How It Is Enforced |
| :--- | :--- |
| **Zero Network Calls** | No `fetch()`, `XMLHttpRequest`, WebSockets, or third-party tracking scripts. |
| **Zero Persistent Storage** | We explicitly never use `localStorage`, `sessionStorage`, IndexedDB, or cookies. |
| **Ephemeral In-Memory Only** | All data and session feedback live only in local JavaScript variables during your session. |
| **Strict XSS Defense** | We **never use `innerHTML`** with imported text. All chat strings are mounted safely via `textContent`. |
| **Transparent Auditing** | Open DevTools (`F12`), check the **Network** and **Application** tabs—verify 0 requests and 0 storage items! |

---

## 🔍 Traceability & Verification

In generative AI summarizers, users frequently cannot verify whether a deadline was real or hallucinated. 

In **"What Did I Miss?"**, every single decision, task, deadline, alert, and shield card includes a clickable **"💬 View Source Citation"** button. Expanding it displays:
- The exact **sender**
- The **timestamp**
- The **line number** in your transcript
- The **verbatim original message** (unredacted in citations to allow factual auditing)

---

## 🛠️ Architecture & Heuristic Engine

The application is structured into modular, deterministic JavaScript modules:

- **`ChatParser`:** State machine that normalizes timestamps, dates, and senders across Slack, Teams, WhatsApp, and Discord formats, handling multi-line continuations.
- **`ShieldEngine`:** Multi-signal risk assessment engine that scores phishing, credentials, and scam patterns with explainable reasons and academic mitigation rules.
- **`RelevanceEngine`:** Contextual keyword and handle matching engine with session-only interactive feedback learning.
- **`DuplicateDetector`:** Normalized text token matching engine that clusters repeated announcements into representative cards.
- **`RuleEngine`:** Evaluates messages against urgent, decision, action, and deadline linguistic triggers.
- **`DOM` & `UIRenderer`:** Constructs high-contrast, emerald-accented dark UI cards strictly through native `document.createElement()` and `textContent`.
- **`SummaryFormatter`:** Converts structured report objects into clean, readable Markdown digests.

---

## 📂 Project Structure

```text
what-did-i-miss/
├── index.html                      # Semantic single-page application markup
├── styles.css                      # Premium dark theme with emerald-green accents
├── script.js                       # Rule-based NLP parser, DOM renderer & state manager
├── README.md                       # Documentation & quick start guide
├── LICENSE                         # MIT Open Source License
├── .gitignore                      # Standard project gitignore
├── run_tests.ps1                   # Automated CLI test suite runner
├── tests/
│   ├── test-runner.html            # Browser test runner UI
│   └── test-suite.js               # 42 unit and integration test cases
└── docs/
    ├── problem-statement.md        # Comprehensive problem statement & background
    ├── security-and-threat-model.md# In-depth security analysis & XSS threat model
    └── testing.md                  # Test suites, edge case matrices & verification logs
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
