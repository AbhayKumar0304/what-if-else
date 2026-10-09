# Problem Statement: "What Did I Miss?"

## 1. Executive Summary

Modern knowledge workers, software engineering teams, students, and hackathon participants are drowning in asynchronous communication. Across Slack, Microsoft Teams, Discord, WhatsApp, and Telegram, team members wake up or return from focused deep-work sessions to hundreds of unread messages scattered across multiple channels.

Catching up today is painful, slow, and error-prone. Users must skim through banter, fragmented discussions, and emoji reactions to identify what actually matters: **critical decisions, assigned action items, looming deadlines, and urgent blockers.**

---

## 2. Core Pain Points

### A. Information Overload & Context Fragmentation
- A team discussing a bug fix might exchange 60 messages over 2 hours.
- Only 3 of those messages contain actionable data:
  1. The diagnosis of the failure ("Database pool leak").
  2. The assigned developer ("Liam is taking this").
  3. The target delivery time ("Patch deployed by 10:30 AM").
- Manually scrolling through hundreds of lines consumes cognitive energy and causes critical tasks or code freeze deadlines to be missed.

### B. The Privacy & Data Leakage Dilemma
When busy professionals attempt to summarize conversations using public generative AI tools (such as ChatGPT, Claude, or web LLM summarizers), they paste **unredacted chat logs** into third-party cloud servers. These transcripts frequently contain:
- Unreleased feature roadmaps and architecture decisions.
- Customer support discussions containing Personally Identifiable Information (PII) such as customer emails and phone numbers.
- Internal API keys, server endpoints, and incident post-mortems.

Pastings chats into external clouds breaches enterprise compliance (GDPR, SOC2, HIPAA) and exposes proprietary intellectual property.

### C. The Hallucination & Cost Problem of Generative Models
- Generative AI models are prone to hallucinating deadlines or misattributing tasks to the wrong team members.
- Paid LLM APIs introduce operational expenses, token quotas, latency (5–15 seconds per summary), and reliance on continuous internet connectivity.

---

## 3. The Proposed Solution: "What Did I Miss?"

**"What Did I Miss?"** is an ultra-fast, 100% private, client-side chat catch-up intelligence tool built entirely in HTML, CSS, and vanilla JavaScript.

### Key Pillars:
1. **Zero Cloud / 100% Local Processing:** Runs entirely within the user's browser sandbox using deterministic rule-based natural language heuristics. No text ever leaves the machine.
2. **Instant Catch-Up Intelligence:** Classifies chat threads into five distinct pillars:
   - 🚨 **Urgent Alerts & Blockers:** High-priority incidents and blockers.
   - ⚖️ **Decisions Made:** Agreed architectures, pivots, and consensus.
   - ✅ **Action Items & Tasks:** Assigned tasks with extracted assignees.
   - ⏰ **Deadlines & Target Times:** Hard deadlines, code freeze times, and delivery dates.
   - 💡 **Key Highlights & Updates:** Verifications and deployment milestones.
3. **Traceability & Zero Hallucination:** Every extracted action item or decision includes an expandable citation linking directly to the verbatim original chat message, sender, and line number.
4. **On-the-Fly PII Redaction:** Automatically detects common email and phone number patterns with an instant redaction toggle.
5. **Zero Persistence:** Ephemeral in-memory operation. No cookies, no `localStorage`, no `sessionStorage`. When the user clicks "Clear All Data" or closes the tab, all memory is wiped.
