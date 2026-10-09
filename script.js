/**
 * What Did I Miss? — Local & Private Chat Catch-Up Briefing
 * 
 * Core Principles:
 * - 100% In-Browser Rule-Based Processing
 * - Zero Network Requests / Cloud Dependencies
 * - Zero Persistent Storage (No localStorage, sessionStorage, or cookies)
 * - Safe DOM Construction (Strictly avoids innerHTML with untrusted chat content)
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. Sample Fictional Hackathon Conversation Data
     ========================================================================== */
  const DEMO_CHAT = 
`[09:15 AM] Maya Patel: Morning team! We have 6 hours before the hackathon submission deadline at 5:00 PM EST today. Let's make sure our core demo is rock solid.
[09:18 AM] Liam Vance: Quick update: The auth service is deployed and running smoothly on port 8080.
[09:22 AM] Elena Rostova: We decided in yesterday's sync that we are going with the Emerald Dark theme instead of the neon purple palette. It looks way more professional.
[09:30 AM] Devon Reed: URGENT: The database connection pool is failing under concurrent load! Server latency spiked to 4200ms. Liam please fix this blocker ASAP!
[09:33 AM] Liam Vance: On it! I will increase the max connection limit to 50 and patch the connection leak by 10:30 AM.
[09:40 AM] Maya Patel: Action item: @Elena please prepare the final 3-minute demo slides by 2:00 PM.
[09:42 AM] Elena Rostova: Will do! I will have the presentation deck ready before 2 PM. Reach me at elena.design@novapulse.io or +1 (555) 234-8901 if you need slide revisions.
[10:05 AM] Devon Reed: Database patch verified. Latency is back down to 14ms. Blocker resolved.
[10:15 AM] Maya Patel: Decision: We agreed to cut the export-to-PDF feature for V1 to focus entirely on the real-time catch-up digest.
[10:20 AM] Devon Reed: I will write the automated end-to-end regression tests for the catch-up parser before 3:30 PM.
[10:25 AM] Campus Bot: Notice: Hackathon project showcase registrations open at 1:00 PM in Main Hall.
[10:28 AM] Campus Bot: Notice: Hackathon project showcase registrations open at 1:00 PM in Main Hall.
[10:30 AM] Liam Vance: For partner judging credentials, call the client coordinator at +1-800-555-0199 or email partner-support@hackathon-hub.org.
[10:35 AM] Promo Bot: WINNER ALERT! Claim your $10,000 crypto reward now at bit.ly/claim-crypto-bonus before time expires!
[11:00 AM] Maya Patel: Final reminder: Code freeze is strictly at 4:30 PM. All pull requests must be merged before then.`;

  /* ==========================================================================
     2. Regular Expressions & Detection Rules
     ========================================================================== */
  const PATTERNS = {
    // PII Detection
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    phone: /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g,

    // Chat Message Line Parsers (Slack, WhatsApp, Discord, Teams, Generic)
    // Matches: [09:15 AM] Maya Patel: text or Maya Patel [09:15 AM]: text
    lineStandardBracketTime: /^\[(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s*([^:]+):\s*(.*)$/i,
    lineStandardNameBracketTime: /^([^:\[]+)\s*\[(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]:\s*(.*)$/i,
    lineWhatsAppDateBracket: /^\[(\d{1,2}\/\d{1,2}\/(?:\d{2,4}),?\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s*([^:]+):\s*(.*)$/i,
    lineWhatsAppDash: /^(\d{1,2}\/\d{1,2}\/(?:\d{2,4}),?\s*\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*-\s*([^:]+):\s*(.*)$/i,
    lineDiscordHeader: /^([^—\n]+?)\s*—\s*(?:Today at|Yesterday at|[A-Za-z]+ at)?\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)$/i,
    lineGenericColon: /^([A-Za-z0-9_.\s@\-]{2,30}):\s+(.+)$/,

    // Urgent & Blocker triggers
    urgentKeywords: /\b(urgent|asap|blocker|blocking|emergency|critical|p0|sev-?1|immediately|down|outage|broken|crash(ing|ed)?|latency spiked|fail(ing|ed|ure)?)\b/i,
    allCapsUrgent: /\b(URGENT|ASAP|BLOCKER|CRITICAL|EMERGENCY|DOWN)\b/,

    // Decisions triggers
    decisionKeywords: /\b(we decided|we agreed|decision:?|agreed (?:that|to)|settled on|going with|consensus (?:is|was)|let's go with|approved|we will use|concluded that|decided to cut)\b/i,

    // Action Items / Tasks triggers
    actionKeywords: /\b(action item:?|to-?do:?|task:?|please prepare|please fix|please make sure|please review|can you|could you|i will|i'll|assigned to)\b/i,
    selfCommitment: /\b(i will|i'll|i can take care of|i am handling|i'm on it)\s+([^.!?\n]+)/i,
    assignedTask: /(?:action item:?|to-?do:?|task:?)\s*(?:@?([\w.-]+))?\s*(?:please|must|to)?\s*([^.!?\n]+)/i,
    directRequest: /(?:@([\w.-]+)|([\w.-]+))\s+please\s+([^.!?\n]+)/i,

    // Deadlines & Target Times triggers
    deadlineKeywords: /\b(?:by|due(?: on| by)?|before|until|deadline(?:\s+(?:is|at|for))?|code freeze is strictly at|target:?)\s+([0-9]{1,2}(?::[0-9]{2})?\s*(?:[ap]m)?(?:\s+[a-z]{3,4})?(?:\s+(?:today|tomorrow|tonight))?|(?:today|tomorrow|tonight|eod|end of day|noon|midnight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:at\s+)?[0-9]{1,2}(?::[0-9]{2})?\s*(?:[ap]m)?(?:\s+[a-z]{3,4})?)?|[a-z]+\s+[0-9]{1,2}(?:st|nd|rd|th)?)\b/i,
    explicitTime: /\b(?:at\s+)?(\d{1,2}:\d{2}\s*(?:[AP]M)(?:\s+[A-Z]{2,4})?)\b/i,

    // Highlights / Milestones triggers
    highlightKeywords: /\b(deployed|running smoothly|resolved|verified|ready|shipped|merged|fixed|completed|back down to|update:?)\b/i
  };

  /* ==========================================================================
     3. State Management (Ephemeral In-Memory Only)
     ========================================================================== */
  const state = {
    rawInput: '',
    redactEnabled: false,
    parsedMessages: [],
    analysisReport: null,
    detectedPII: {
      emails: [],
      phones: []
    },
    relevancePreferences: {
      selectedTopics: ['assignments', 'college', 'projects', 'internships', 'personal', 'events'],
      userHandle: '',
      separateLowRelevance: false,
      sessionFeedback: {
        itemOverrides: {},
        positiveKeywords: {},
        negativeKeywords: {}
      }
    }
  };

  /* ==========================================================================
     4. Safe DOM Helper Utilities (Zero innerHTML for Untrusted Text)
     ========================================================================== */
  const DOM = {
    /**
     * Create an element with optional class, text content, attributes, and children.
     * Guaranteed safe against XSS by strictly using textContent.
     */
    create(tag, options = {}) {
      const el = document.createElement(tag);
      if (options.className) el.className = options.className;
      if (options.text !== undefined && options.text !== null) {
        el.textContent = String(options.text);
      }
      if (options.attrs) {
        for (const [key, val] of Object.entries(options.attrs)) {
          el.setAttribute(key, val);
        }
      }
      if (options.children && Array.isArray(options.children)) {
        for (const child of options.children) {
          if (child) el.appendChild(child);
        }
      }
      return el;
    },

    /**
     * Clear all children from an element safely
     */
    empty(el) {
      while (el.firstChild) {
        el.removeChild(el.firstChild);
      }
    },

    /**
     * Render text that may have sensitive PII masked or highlighted safely
     */
    createSanitizedTextSpan(text, redactEnabled) {
      const container = document.createElement('span');
      if (!text) return container;

      if (!redactEnabled) {
        container.textContent = text;
        return container;
      }

      // Perform regex replacement with masking markers
      let sanitized = text;
      sanitized = sanitized.replace(PATTERNS.email, '[REDACTED EMAIL]');
      sanitized = sanitized.replace(PATTERNS.phone, '[REDACTED PHONE]');

      // Parse tokens to style redaction pills
      const parts = sanitized.split(/(\[REDACTED (?:EMAIL|PHONE)\])/g);
      for (const part of parts) {
        if (part === '[REDACTED EMAIL]' || part === '[REDACTED PHONE]') {
          const pill = DOM.create('span', {
            className: 'redacted-entity',
            text: part
          });
          container.appendChild(pill);
        } else if (part) {
          container.appendChild(document.createTextNode(part));
        }
      }
      return container;
    }
  };

  /* ==========================================================================
     5. Chat Parser Engine
     ========================================================================== */
  const ChatParser = {
    /**
     * Parses raw pasted chat text into structured message objects.
     * Supports multi-line messages, Discord headers, Slack brackets, WhatsApp, and generic formats.
     */
    parse(rawText) {
      if (!rawText || !rawText.trim()) return [];

      const lines = rawText.split(/\r?\n/);
      const messages = [];
      let currentMsg = null;
      let pendingDiscordSender = null;
      let pendingDiscordTime = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Check Discord style header: "Sender — Today at 10:14 AM"
        const discordMatch = line.match(PATTERNS.lineDiscordHeader);
        if (discordMatch) {
          pendingDiscordSender = discordMatch[1].trim();
          pendingDiscordTime = discordMatch[2].trim();
          continue;
        }

        if (pendingDiscordSender) {
          currentMsg = {
            id: messages.length + 1,
            sender: pendingDiscordSender,
            time: pendingDiscordTime || '',
            text: line,
            lineNum: i + 1,
            raw: `${pendingDiscordSender} (${pendingDiscordTime}): ${line}`,
            hasHeader: true
          };
          messages.push(currentMsg);
          pendingDiscordSender = null;
          pendingDiscordTime = null;
          continue;
        }

        // 1. [09:15 AM] Maya Patel: Message
        let m = line.match(PATTERNS.lineStandardBracketTime);
        if (m) {
          currentMsg = {
            id: messages.length + 1,
            sender: m[2].trim(),
            time: m[1].trim(),
            text: m[3].trim(),
            lineNum: i + 1,
            raw: line,
            hasHeader: true
          };
          messages.push(currentMsg);
          continue;
        }

        // 2. Maya Patel [09:15 AM]: Message
        m = line.match(PATTERNS.lineStandardNameBracketTime);
        if (m) {
          currentMsg = {
            id: messages.length + 1,
            sender: m[1].trim(),
            time: m[2].trim(),
            text: m[3].trim(),
            lineNum: i + 1,
            raw: line,
            hasHeader: true
          };
          messages.push(currentMsg);
          continue;
        }

        // 3. [10/09/2026, 09:15:00] Maya Patel: Message (WhatsApp)
        m = line.match(PATTERNS.lineWhatsAppDateBracket);
        if (m) {
          currentMsg = {
            id: messages.length + 1,
            sender: m[2].trim(),
            time: m[1].trim(),
            text: m[3].trim(),
            lineNum: i + 1,
            raw: line,
            hasHeader: true
          };
          messages.push(currentMsg);
          continue;
        }

        // 4. 10/09/2026, 09:15 - Maya Patel: Message (WhatsApp dash)
        m = line.match(PATTERNS.lineWhatsAppDash);
        if (m) {
          currentMsg = {
            id: messages.length + 1,
            sender: m[2].trim(),
            time: m[1].trim(),
            text: m[3].trim(),
            lineNum: i + 1,
            raw: line,
            hasHeader: true
          };
          messages.push(currentMsg);
          continue;
        }

        // 5. Generic Sender: Message
        m = line.match(PATTERNS.lineGenericColon);
        if (m && !m[1].toLowerCase().startsWith('http')) {
          currentMsg = {
            id: messages.length + 1,
            sender: m[1].trim(),
            time: '',
            text: m[2].trim(),
            lineNum: i + 1,
            raw: line,
            hasHeader: true
          };
          messages.push(currentMsg);
          continue;
        }

        // Multi-line continuation: If current message exists AND has an explicit header, append text
        if (currentMsg && currentMsg.hasHeader) {
          currentMsg.text += `\n${line}`;
          currentMsg.raw += `\n${line}`;
        } else {
          currentMsg = {
            id: messages.length + 1,
            sender: `Speaker ${messages.length + 1}`,
            time: '',
            text: line,
            lineNum: i + 1,
            raw: line,
            hasHeader: false
          };
          messages.push(currentMsg);
        }
      }

      return messages;
    }
  };

  /* ==========================================================================
     6. Duplicate Detection Engine
     ========================================================================== */
  const DuplicateDetector = {
    normalize(text) {
      if (!text) return '';
      return text
        .toLowerCase()
        .replace(/https?:\/\/[^\s]+/g, '[url]')
        .replace(/\[\d{1,2}:\d{2}(?:\s*[ap]m)?\]/gi, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    },

    tokenize(text) {
      const norm = this.normalize(text);
      if (!norm) return [];
      return norm.split(' ').filter(w => w.length > 2);
    },

    similarity(textA, textB) {
      const normA = this.normalize(textA);
      const normB = this.normalize(textB);
      if (!normA || !normB) return 0;
      if (normA === normB) return 1.0;

      const wordsA = this.tokenize(textA);
      const wordsB = this.tokenize(textB);
      if (wordsA.length === 0 || wordsB.length === 0) return 0;

      const setA = new Set(wordsA);
      const setB = new Set(wordsB);
      let intersection = 0;
      for (const w of setA) {
        if (setB.has(w)) intersection++;
      }
      const union = setA.size + setB.size - intersection;
      return union === 0 ? 0 : intersection / union;
    },

    groupDuplicates(items) {
      if (!items || items.length === 0) return [];
      const grouped = [];
      const normMap = new Map();
      const buckets = new Map();

      for (const item of items) {
        const text = item.summary || item.text || item.raw || '';
        const norm = this.normalize(text);
        if (!norm) {
          item.duplicateCount = 1;
          item.duplicates = [];
          grouped.push(item);
          continue;
        }

        // Fast O(1) exact normalized match
        if (normMap.has(norm)) {
          const rep = normMap.get(norm);
          rep.duplicateCount = (rep.duplicateCount || 1) + 1;
          if (!rep.duplicates) rep.duplicates = [];
          const sourceObj = item.source || item;
          rep.duplicates.push({
            sender: sourceObj.sender || 'Unknown',
            time: sourceObj.time || '',
            lineNum: sourceObj.lineNum || 1,
            raw: sourceObj.raw || sourceObj.text || text
          });
          continue;
        }

        // Near-duplicate check for reasonably sized lists
        let matchedRep = null;
        if (items.length <= 300) {
          const lenBucket = Math.round(norm.length / 25);
          const candidates = [
            ...(buckets.get(lenBucket - 1) || []),
            ...(buckets.get(lenBucket) || []),
            ...(buckets.get(lenBucket + 1) || [])
          ];

          for (const rep of candidates) {
            if (this.similarity(norm, rep._norm) >= 0.82) {
              matchedRep = rep;
              break;
            }
          }
        }

        if (matchedRep) {
          matchedRep.duplicateCount = (matchedRep.duplicateCount || 1) + 1;
          if (!matchedRep.duplicates) matchedRep.duplicates = [];
          const sourceObj = item.source || item;
          matchedRep.duplicates.push({
            sender: sourceObj.sender || 'Unknown',
            time: sourceObj.time || '',
            lineNum: sourceObj.lineNum || 1,
            raw: sourceObj.raw || sourceObj.text || text
          });
        } else {
          item.duplicateCount = 1;
          item.duplicates = [];
          item._norm = norm;
          normMap.set(norm, item);
          const lenBucket = Math.round(norm.length / 25);
          if (!buckets.has(lenBucket)) buckets.set(lenBucket, []);
          buckets.get(lenBucket).push(item);
          grouped.push(item);
        }
      }
      return grouped;
    }
  };

  /* ==========================================================================
     7. Spam & Scam Shield (Local Heuristic Intelligence)
     ========================================================================== */
  const ShieldEngine = {
    CLASSIFICATIONS: {
      HIGH_RISK: 'Potential scam / high risk',
      SUSPICIOUS: 'Suspicious — review recommended',
      PROMO: 'Possibly promotional or repetitive',
      LEGIT_ANNOUNCEMENT: 'Legitimate-looking announcement / deadline',
      NO_RISK: 'No significant risk detected'
    },

    evaluate(msg, allMessages = [], context = null) {
      const text = msg.text || '';
      const rawText = msg.raw || text;
      let score = 0;
      const reasons = [];

      // 1. Password / OTP / Authentication code harvesting
      const hasOTP = /\b(otp|one-time password|verification code|security code|passcode|2fa|two-factor|auth code|secret pin|login pin)\b/i.test(text);
      const asksCreds = /\b(send|share|provide|reply with|forward|dm me|text me|enter your|submit your)\s+(?:your\s+|the\s+)?(otp|code|password|pin|credentials)\b/i.test(text);
      const explicitCredHarvest = /\b(send your password|share your otp|what is your otp|enter (?:your )?password to|verify account with code|send the \d+-digit otp)\b/i.test(text);

      if (asksCreds || explicitCredHarvest) {
        score += 60;
        reasons.push('Explicitly requests transmission of passwords, OTP codes, or sensitive credentials.');
      } else if (hasOTP && /\b(send|share|verify|urgent|locked|suspended|required)\b/i.test(text)) {
        score += 55;
        reasons.push('Prompts for an OTP or authentication code in an urgent security context.');
      }

      // 2. Suspicious payments, impersonation, unrealistic financial promises
      const hasReward = /\b(congratulations.*(?:won|winner)|claim (?:your )?(?:\$\d+|crypto|bitcoin|btc|eth|usdt|reward|prize|grant|lottery)|win \$\d+|guaranteed (?:return|profit))\b/i.test(text);
      const hasSuspiciousPay = /\b(wire transfer|western union|send (?:cash|\$\d+|crypto|gift card)|pay \$\d+ to claim|deposit to unlock|cashapp me|fee required to claim)\b/i.test(text);
      const hasThreatImpersonation = /\b(account.*(?:suspended|locked|deactivated|closed)|police.*dispatch|legal action will be taken|unauthorized transaction.*reverse)\b/i.test(text);

      if (hasReward) {
        score += 50;
        reasons.push('Contains promises of unrealistic financial gains, lottery prizes, or cryptocurrency grants.');
      }
      if (hasSuspiciousPay) {
        score += 45;
        reasons.push('Demands direct money transfer, cryptocurrency, or upfront processing fees.');
      }
      if (hasThreatImpersonation) {
        score += 35;
        reasons.push('Uses coercive threats, impersonation of authority, or claims of immediate account lock.');
      }

      // 3. Suspicious / misleading URLs
      const urlMatches = text.match(/https?:\/\/[^\s]+|\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/g) || [];
      for (const url of urlMatches) {
        const urlLower = url.toLowerCase();
        if (/(bit\.ly|tinyurl\.com|is\.gd|t\.co|cutt\.ly|shorturl\.at|rb\.gy|tiny\.cc)/i.test(urlLower)) {
          score += 25;
          reasons.push(`Contains masked or shortened URL (${url}) concealing its true destination.`);
        }
        if (/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i.test(urlLower)) {
          score += 35;
          reasons.push(`Uses raw numeric IP address (${url}) instead of a verified domain name.`);
        }
        if (/\.(xyz|top|work|click|tk|ml|ga|cf|gq|buzz|loan|rest)\b/i.test(urlLower)) {
          score += 25;
          reasons.push(`Links to top-level domain frequently associated with spam campaigns (${url}).`);
        }
        if (/(paypa1|g00gle|micros0ft|amaz0n|netfl1x|app1e|secure-bank|verify-account|account-update)/i.test(urlLower)) {
          score += 40;
          reasons.push(`URL mimics established platform name with typosquatting or brand spoofing (${url}).`);
        }
      }

      // 4. Manipulative urgency combined with other suspicious signals
      const hasUrgencyWord = /\b(urgent|asap|immediately|within \d+ (?:min|hour|minute)s?|strictly (?:next|today)|last chance|act now|expires in \d+)\b/i.test(text);
      const otherSuspiciousSignals = (asksCreds || hasOTP || hasReward || hasSuspiciousPay || hasThreatImpersonation || urlMatches.some(u => /(bit\.ly|tinyurl|\.(xyz|top)|paypa1)/i.test(u)));

      if (hasUrgencyWord && otherSuspiciousSignals) {
        score += 25;
        reasons.push('Combines psychological urgency with external requests or credential prompts.');
      }

      // 5. Excessive promotional language
      const promoWords = /\b(exclusive (?:deal|offer|discount)|\d+%\s*off|buy now|special promo|act fast|free bonus|shop now|subscribe today|earn \$\d+ daily|work from home)\b/i;
      const isPromo = promoWords.test(text);
      if (isPromo) {
        score += 30;
        reasons.push('Contains aggressive promotional phrasing or commercial sales solicitation.');
      }

      // 6. Repeated identical or near-identical blast (O(1) via context.msgFrequency or capped scan)
      let repeatCount = 0;
      const norm = DuplicateDetector.normalize(text);
      if (context && context.msgFrequency) {
        repeatCount = (context.msgFrequency.get(norm) || 1) - 1;
      } else if (allMessages.length > 1 && allMessages.length <= 150) {
        for (const other of allMessages) {
          if (other.id !== msg.id && DuplicateDetector.similarity(text, other.text) >= 0.85) {
            repeatCount++;
          }
        }
      }
      if (repeatCount >= 2) {
        score += 20;
        reasons.push(`Message content is repeated across conversation (${repeatCount + 1} occurrences detected).`);
      }

      // 7. Legitimate academic, college, or operational context (mitigating signals)
      const hasAcademicContext = /\b(college|university|campus|department|course|syllabus|assignment|exam|quiz|professor|prof\.|library|registrar|hackathon|repo|pull request|jira|confluence|patch verified|blocker resolved)\b/i.test(text);
      const isOfficialPortal = /\b(official portal|campus portal|portal\.edu|\.edu\b|student portal|course registration)\b/i.test(text);
      const isDeadlineAnnouncement = /\b(deadline|due date|submission|freeze|scheduled for)\b/i.test(text);

      if ((hasAcademicContext || isOfficialPortal || isDeadlineAnnouncement) && !asksCreds && !hasReward && !hasSuspiciousPay) {
        score = Math.max(0, score - 20);
      }

      // Clamp score 0 - 100
      score = Math.min(100, Math.max(0, Math.round(score)));

      // Determine Classification
      let label = this.CLASSIFICATIONS.NO_RISK;
      if (score >= 70) {
        label = this.CLASSIFICATIONS.HIGH_RISK;
      } else if (score >= 40) {
        label = this.CLASSIFICATIONS.SUSPICIOUS;
      } else if (score >= 20 && (isPromo || repeatCount >= 2)) {
        label = this.CLASSIFICATIONS.PROMO;
      } else if ((isDeadlineAnnouncement || hasAcademicContext || isOfficialPortal || hasUrgencyWord) && score < 25) {
        label = this.CLASSIFICATIONS.LEGIT_ANNOUNCEMENT;
        if (reasons.length === 0) {
          reasons.push('Standard academic, event, or operational announcement; no malicious markers.');
        }
      } else if (reasons.length === 0) {
        label = this.CLASSIFICATIONS.NO_RISK;
        reasons.push('Standard peer discussion; zero suspicious heuristic patterns detected.');
      }

      // Unknown sender transparency note
      const senderIsUnknown = /^(speaker \d+|unknown|user\d*)$/i.test(msg.sender);
      let senderNote = '';
      if (senderIsUnknown) {
        senderNote = 'Sender identity is generic/unknown. Evaluated neutrally and not counted as spam on its own.';
      }

      return {
        id: `shield_${msg.id}`,
        sender: msg.sender,
        time: msg.time,
        lineNum: msg.lineNum,
        raw: rawText,
        score,
        label,
        reasons,
        senderNote,
        isRepeat: repeatCount >= 1,
        repeatCount: repeatCount + 1,
        source: msg
      };
    }
  };

  /* ==========================================================================
     8. Personal Relevance Engine (Session-Only Learning)
     ========================================================================== */
  const RelevanceEngine = {
    TOPICS: {
      assignments: {
        id: 'assignments',
        name: 'Assignments & Exams',
        pattern: /\b(assignment|homework|exam|quiz|midterm|final|grades?|grading|submission|due date|lab report|syllabus|rubric|test paper|problem set)\b/i
      },
      college: {
        id: 'college',
        name: 'College Announcements',
        pattern: /\b(college|university|campus|dean|faculty|registrar|library|administration|semester|tuition|hostel|dorm|admissions|department|provost|convocation)\b/i
      },
      projects: {
        id: 'projects',
        name: 'Projects & Meetings',
        pattern: /\b(project|meeting|sync|standup|zoom|teams|google meet|call|git|github|pull request|pr\b|deploy|database|db\b|backend|frontend|sprint|task|patch|build|commit|branch|demo)\b/i
      },
      internships: {
        id: 'internships',
        name: 'Internships & Placements',
        pattern: /\b(internship|placement|job|career|resume|cv\b|interview|hiring|offer letter|stipend|referral|recruiter|company|recruitment|full-time|part-time)\b/i
      },
      personal: {
        id: 'personal',
        name: 'Personal Mentions',
        pattern: null // Evaluated dynamically against userHandle or direct @mentions
      },
      events: {
        id: 'events',
        name: 'Events & Registrations',
        pattern: /\b(event|hackathon|workshop|webinar|conference|registration|rsvp|ticket|venue|schedule|guest speaker|ceremony|fest|competition)\b/i
      }
    },

    evaluate(item, preferences) {
      const text = item.summary || item.text || item.raw || '';
      const lower = text.toLowerCase();
      const prefs = preferences || state.relevancePreferences;
      const itemId = item.id || (item.source ? item.source.id : null);

      // Session feedback overrides
      if (itemId && prefs.sessionFeedback && prefs.sessionFeedback.itemOverrides[itemId]) {
        const override = prefs.sessionFeedback.itemOverrides[itemId];
        if (override === 'relevant') {
          return {
            tier: 'Relevant',
            score: 100,
            matchedTopics: ['Session Preference (👍 Upvoted)'],
            feedbackState: 'up'
          };
        } else if (override === 'not-relevant') {
          return {
            tier: 'Low relevance',
            score: 0,
            matchedTopics: ['Session Preference (👎 Downvoted)'],
            feedbackState: 'down'
          };
        }
      }

      let score = 0;
      const matchedTopics = [];
      const selectedSet = new Set(prefs.selectedTopics || []);

      // Check Personal Mention
      const handle = (prefs.userHandle || '').trim().replace(/^@/, '').toLowerCase();
      if (handle && handle.length >= 2) {
        const handleRegex = new RegExp(`(?:@${handle}\\b|\\b${handle}\\b)`, 'i');
        if (handleRegex.test(text) || (item.assignee && item.assignee.toLowerCase() === handle)) {
          if (selectedSet.has('personal')) {
            score += 50;
            matchedTopics.push(`Personal (@${handle})`);
          }
        }
      } else if (selectedSet.has('personal') && (/@[\w.-]+/.test(text) || (item.assignee && item.assignee !== 'Unassigned'))) {
        score += 20;
        matchedTopics.push('Personal Mentions');
      }

      // Check topic categories
      for (const [key, topic] of Object.entries(this.TOPICS)) {
        if (key === 'personal') continue;
        if (topic.pattern && topic.pattern.test(text)) {
          if (selectedSet.has(key)) {
            score += 30;
            matchedTopics.push(key);
          } else {
            score -= 15;
          }
        }
      }

      // Session keyword tuning
      if (prefs.sessionFeedback) {
        for (const [kw, count] of Object.entries(prefs.sessionFeedback.positiveKeywords || {})) {
          if (lower.includes(kw)) score += Math.min(25, count * 10);
        }
        for (const [kw, count] of Object.entries(prefs.sessionFeedback.negativeKeywords || {})) {
          if (lower.includes(kw)) score -= Math.min(30, count * 15);
        }
      }

      // Determine relevance tier
      let tier = 'Low relevance';
      if (score >= 30 || matchedTopics.length > 0) {
        tier = 'Relevant';
      } else if (score >= 10 || selectedSet.size === 0) {
        tier = 'Possibly relevant';
      } else {
        tier = 'Low relevance';
      }

      return {
        tier,
        level: tier === 'Relevant' ? 'relevant' : (tier === 'Possibly relevant' ? 'possibly' : 'low'),
        score,
        matchedTopics,
        feedbackState: null
      };
    },

    evaluateRelevance(item, preferences) {
      return this.evaluate(item, preferences);
    },

    recordFeedback(itemId, itemText, isRelevant) {
      if (!state.relevancePreferences.sessionFeedback) {
        state.relevancePreferences.sessionFeedback = {
          itemOverrides: {},
          positiveKeywords: {},
          negativeKeywords: {}
        };
      }
      const fb = state.relevancePreferences.sessionFeedback;
      fb.itemOverrides[itemId] = isRelevant ? 'relevant' : 'not-relevant';

      const words = (itemText || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'will', 'your', 'about', 'please', 'team'].includes(w));

      const target = isRelevant ? fb.positiveKeywords : fb.negativeKeywords;
      const opposite = isRelevant ? fb.negativeKeywords : fb.positiveKeywords;

      for (const w of words.slice(0, 5)) {
        target[w] = (target[w] || 0) + 1;
        delete opposite[w];
      }
    }
  };

  /* ==========================================================================
     9. Rule-Based NLP & Extraction Engine
     ========================================================================== */
  const RuleEngine = {
    /**
     * Inspect text for sensitive PII (Emails and Phone numbers)
     */
    scanPII(text) {
      const emails = text.match(PATTERNS.email) || [];
      const phones = text.match(PATTERNS.phone) || [];
      return {
        emails: Array.from(new Set(emails)),
        phones: Array.from(new Set(phones))
      };
    },

    /**
     * Mask PII in a string
     */
    maskPII(text) {
      if (!text) return '';
      return text
        .replace(PATTERNS.email, '[REDACTED EMAIL]')
        .replace(PATTERNS.phone, '[REDACTED PHONE]');
    },

    /**
     * Analyze parsed messages and categorize key intelligence
     */
    analyze(messages) {
      const startTime = performance.now();

      // 1. Run Shield Engine across all parsed messages
      const msgFrequency = new Map();
      for (const m of messages) {
        const norm = DuplicateDetector.normalize(m.text || '');
        if (norm) msgFrequency.set(norm, (msgFrequency.get(norm) || 0) + 1);
      }
      const shieldContext = { msgFrequency };
      const shieldEvaluations = [];
      for (const msg of messages) {
        const evalResult = ShieldEngine.evaluate(msg, messages, shieldContext);
        shieldEvaluations.push(evalResult);
      }

      // Filter shield items to display in the dedicated shield section
      const prioritizedShield = shieldEvaluations.filter(e => 
        e.label === ShieldEngine.CLASSIFICATIONS.HIGH_RISK ||
        e.label === ShieldEngine.CLASSIFICATIONS.SUSPICIOUS ||
        e.label === ShieldEngine.CLASSIFICATIONS.PROMO ||
        (e.label === ShieldEngine.CLASSIFICATIONS.LEGIT_ANNOUNCEMENT && e.score > 0)
      );

      const displayShieldList = prioritizedShield.length > 0 
        ? prioritizedShield 
        : shieldEvaluations.filter(e => e.label === ShieldEngine.CLASSIFICATIONS.LEGIT_ANNOUNCEMENT).slice(0, 3);

      const urgentList = [];
      const decisionsList = [];
      const tasksList = [];
      const deadlinesList = [];
      const highlightsList = [];
      const participantsMap = new Map();

      for (const msg of messages) {
        const text = msg.text;
        const sender = msg.sender;

        // Record participant stats
        if (!participantsMap.has(sender)) {
          participantsMap.set(sender, {
            name: sender,
            messageCount: 0,
            tasksAssigned: 0
          });
        }
        participantsMap.get(sender).messageCount++;

        // 1. Detect Urgent / Blockers
        const isUrgent = PATTERNS.urgentKeywords.test(text) || PATTERNS.allCapsUrgent.test(text);
        if (isUrgent && !text.toLowerCase().includes('blocker resolved') && !text.toLowerCase().includes('patch verified')) {
          let severity = 'URGENT';
          if (/\b(blocker|blocking)\b/i.test(text)) severity = 'BLOCKER';
          if (/\b(asap|immediately)\b/i.test(text)) severity = 'CRITICAL';

          urgentList.push({
            id: `urg_${msg.id}`,
            type: 'urgent',
            tag: severity,
            summary: text,
            source: msg
          });
        }

        // 2. Detect Decisions
        const isDecision = PATTERNS.decisionKeywords.test(text);
        if (isDecision) {
          decisionsList.push({
            id: `dec_${msg.id}`,
            type: 'decision',
            tag: 'DECIDED',
            summary: text,
            source: msg
          });
        }

        // 3. Detect Action Items & Tasks
        const isAction = PATTERNS.actionKeywords.test(text);
        if (isAction) {
          let assignee = 'Unassigned';
          let taskDesc = text;

          const directMatch = text.match(PATTERNS.directRequest);
          const selfMatch = text.match(PATTERNS.selfCommitment);
          const assignedMatch = text.match(PATTERNS.assignedTask);

          if (assignedMatch && assignedMatch[1]) {
            assignee = assignedMatch[1].replace('@', '');
            taskDesc = assignedMatch[2].trim();
          } else if (directMatch) {
            assignee = (directMatch[1] || directMatch[2] || '').replace('@', '');
            taskDesc = directMatch[3].trim();
          } else if (selfMatch) {
            assignee = sender;
            taskDesc = `${selfMatch[1]} ${selfMatch[2]}`.trim();
          }

          if (participantsMap.has(assignee)) {
            participantsMap.get(assignee).tasksAssigned++;
          }

          tasksList.push({
            id: `tsk_${msg.id}`,
            type: 'task',
            tag: 'TASK',
            assignee: assignee,
            summary: text,
            taskSnippet: taskDesc,
            source: msg
          });
        }

        // 4. Detect Deadlines & Key Times
        const deadlineMatch = text.match(PATTERNS.deadlineKeywords);
        const timeMatch = text.match(PATTERNS.explicitTime);

        if (deadlineMatch || (timeMatch && (isAction || isUrgent || /before|due|freeze/i.test(text)))) {
          const targetTime = deadlineMatch ? deadlineMatch[1] : (timeMatch ? timeMatch[1] : 'Time Specified');
          deadlinesList.push({
            id: `dl_${msg.id}`,
            type: 'deadline',
            tag: 'DEADLINE',
            targetTime: targetTime.trim(),
            summary: text,
            source: msg
          });
        }

        // 5. Detect Discussion Highlights / Resolved Statuses
        if (PATTERNS.highlightKeywords.test(text) && !isUrgent && !isDecision) {
          highlightsList.push({
            id: `hl_${msg.id}`,
            type: 'highlight',
            tag: 'UPDATE',
            summary: text,
            source: msg
          });
        }
      }

      // Feature C: Duplicate Detection - Group duplicate announcements and items
      const dedupedUrgent = DuplicateDetector.groupDuplicates(urgentList);
      const dedupedDecisions = DuplicateDetector.groupDuplicates(decisionsList);
      const dedupedTasks = DuplicateDetector.groupDuplicates(tasksList);
      const dedupedDeadlines = DuplicateDetector.groupDuplicates(deadlinesList);
      const dedupedHighlights = DuplicateDetector.groupDuplicates(highlightsList);

      // Feature B: Personal Relevance Engine - Evaluate relevance for all items
      const allExtracted = [
        ...dedupedUrgent,
        ...dedupedDecisions,
        ...dedupedTasks,
        ...dedupedDeadlines,
        ...dedupedHighlights
      ];

      for (const item of allExtracted) {
        item.relevance = RelevanceEngine.evaluate(item, state.relevancePreferences);
      }

      for (const sItem of shieldEvaluations) {
        sItem.relevance = RelevanceEngine.evaluate(sItem, state.relevancePreferences);
      }

      // Partition low-relevance items if separate preference is active
      let finalUrgent = dedupedUrgent;
      let finalDecisions = dedupedDecisions;
      let finalTasks = dedupedTasks;
      let finalDeadlines = dedupedDeadlines;
      let finalHighlights = dedupedHighlights;
      let deprioritizedList = [];

      if (state.relevancePreferences.separateLowRelevance) {
        deprioritizedList = allExtracted.filter(item => item.relevance.tier === 'Low relevance');
        finalUrgent = dedupedUrgent.filter(item => item.relevance.tier !== 'Low relevance');
        finalDecisions = dedupedDecisions.filter(item => item.relevance.tier !== 'Low relevance');
        finalTasks = dedupedTasks.filter(item => item.relevance.tier !== 'Low relevance');
        finalDeadlines = dedupedDeadlines.filter(item => item.relevance.tier !== 'Low relevance');
        finalHighlights = dedupedHighlights.filter(item => item.relevance.tier !== 'Low relevance');
      }

      const processingTimeMs = Math.round(performance.now() - startTime);

      return {
        stats: {
          totalMessages: messages.length,
          totalParticipants: participantsMap.size,
          urgentCount: finalUrgent.length,
          decisionsCount: finalDecisions.length,
          tasksCount: finalTasks.length,
          deadlinesCount: finalDeadlines.length,
          highlightsCount: finalHighlights.length,
          shieldCount: displayShieldList.length,
          deprioritizedCount: deprioritizedList.length,
          processingTimeMs
        },
        shield: displayShieldList,
        allShieldEvaluations: shieldEvaluations,
        urgent: finalUrgent,
        decisions: finalDecisions,
        tasks: finalTasks,
        deadlines: finalDeadlines,
        highlights: finalHighlights,
        deprioritized: deprioritizedList,
        participants: Array.from(participantsMap.values()).sort((a, b) => b.messageCount - a.messageCount)
      };
    }
  };

  /* ==========================================================================
     7. Safe UI Renderer (Zero innerHTML for Dynamic Chat Data)
     ========================================================================== */
  const UIRenderer = {
    /**
     * Render the top summary metrics
     */
    renderMetrics(stats) {
      const container = document.getElementById('metricsGrid');
      DOM.empty(container);

      const metricItems = [
        { label: 'Messages', val: stats.totalMessages, class: '' },
        { label: 'Action Items', val: stats.tasksCount, class: 'metric-task' },
        { label: 'Decisions', val: stats.decisionsCount, class: 'metric-decision' },
        { label: 'Deadlines', val: stats.deadlinesCount, class: 'metric-deadline' },
        { label: 'Urgent Alerts', val: stats.urgentCount, class: 'metric-urgent' },
        { label: 'Participants', val: stats.totalParticipants, class: '' }
      ];

      for (const item of metricItems) {
        const tile = DOM.create('div', {
          className: `metric-tile ${item.class}`,
          children: [
            DOM.create('div', { className: 'metric-val', text: item.val }),
            DOM.create('div', { className: 'metric-label', text: item.label })
          ]
        });
        container.appendChild(tile);
      }
    },

    /**
     * Create an individual intelligence card with citation traceability
     */
    createItemCard(item, config = {}) {
      const card = DOM.create('div', {
        className: `item-card item-card-${item.type || 'generic'}`
      });

      // Main content row
      const mainRow = DOM.create('div', { className: 'item-main-row' });
      const textWrap = DOM.create('div', { className: 'item-text' });
      textWrap.appendChild(DOM.createSanitizedTextSpan(item.summary || item.text, state.redactEnabled));

      const tagBadge = DOM.create('span', {
        className: `item-tag tag-${item.type || 'generic'}`,
        text: item.tag || item.type || 'NOTE'
      });

      mainRow.appendChild(textWrap);
      mainRow.appendChild(tagBadge);
      card.appendChild(mainRow);

      // Meta row (Assignee, target due, relevance, topic tags, duplicates, feedback)
      const metaRow = DOM.create('div', { className: 'item-meta-row' });

      if (item.assignee) {
        const assigneeSpan = DOM.create('span', {
          className: 'meta-assignee',
          text: `Assignee: @${item.assignee}`
        });
        metaRow.appendChild(assigneeSpan);
      }

      if (item.targetTime) {
        const dueSpan = DOM.create('span', {
          className: 'meta-due',
          text: `Due: ${item.targetTime}`
        });
        metaRow.appendChild(dueSpan);
      }

      // Feature B: Relevance Badge & Matched Topics
      if (item.relevance) {
        const relTier = item.relevance.tier || 'Relevant';
        let relClass = 'relevance-high';
        let relIcon = '⭐ ';
        if (relTier === 'Possibly relevant') {
          relClass = 'relevance-medium';
          relIcon = '🔹 ';
        } else if (relTier === 'Low relevance') {
          relClass = 'relevance-low';
          relIcon = '▫️ ';
        }

        const relPill = DOM.create('span', {
          className: `relevance-pill ${relClass}`,
          text: `${relIcon}${relTier}`
        });
        metaRow.appendChild(relPill);

        if (item.relevance.matchedTopics && item.relevance.matchedTopics.length > 0) {
          for (const topic of item.relevance.matchedTopics.slice(0, 2)) {
            const tPill = DOM.create('span', {
              className: 'topic-tag-pill',
              text: `#${topic}`
            });
            metaRow.appendChild(tPill);
          }
        }
      }

      // Feature C: Duplicate Occurrences Indicator
      if (item.duplicateCount && item.duplicateCount > 1) {
        const dupBadge = DOM.create('span', {
          className: 'duplicate-badge',
          text: `🔁 ${item.duplicateCount} Occurrences`
        });
        metaRow.appendChild(dupBadge);
      }

      // Traceability Citation Trigger
      const citationToggleBtn = DOM.create('button', {
        className: 'citation-toggle-btn',
        attrs: {
          'type': 'button',
          'aria-expanded': 'false',
          'title': 'Toggle verbatim original message citation'
        },
        children: [
          DOM.create('span', { text: '💬 View Source Citation' })
        ]
      });
      metaRow.appendChild(citationToggleBtn);

      // Session Feedback Buttons (👍 Relevant / 👎 Not relevant)
      const feedbackGroup = DOM.create('div', { className: 'feedback-btn-group' });
      const upActive = item.relevance && item.relevance.feedbackState === 'up';
      const downActive = item.relevance && item.relevance.feedbackState === 'down';

      const upBtn = DOM.create('button', {
        className: `feedback-btn ${upActive ? 'active-up' : ''}`,
        attrs: {
          'type': 'button',
          'data-action': 'feedback-up',
          'data-id': item.id || '',
          'title': 'Mark as relevant (session-only memory)'
        },
        children: [DOM.create('span', { text: '👍 Relevant' })]
      });

      const downBtn = DOM.create('button', {
        className: `feedback-btn ${downActive ? 'active-down' : ''}`,
        attrs: {
          'type': 'button',
          'data-action': 'feedback-down',
          'data-id': item.id || '',
          'title': 'Mark as not relevant (session-only memory)'
        },
        children: [DOM.create('span', { text: '👎 Not relevant' })]
      });

      feedbackGroup.appendChild(upBtn);
      feedbackGroup.appendChild(downBtn);
      metaRow.appendChild(feedbackGroup);

      card.appendChild(metaRow);

      // Collapsible Source Citation Panel
      const source = item.source || {
        sender: 'Unknown',
        time: '',
        lineNum: 1,
        raw: item.summary || item.text || ''
      };

      const citationHeaderChildren = [
        DOM.create('strong', { text: `From: ${source.sender}` })
      ];
      if (source.time) {
        citationHeaderChildren.push(DOM.create('span', { text: ` (${source.time})` }));
      }
      citationHeaderChildren.push(DOM.create('span', { text: ` — Line #${source.lineNum}` }));

      const citationBox = DOM.create('div', {
        className: 'citation-box hidden',
        children: [
          DOM.create('div', {
            className: 'citation-header',
            children: citationHeaderChildren
          })
        ]
      });

      // Show exact original text verbatim without rewritten version, safe via textContent
      const quoteEl = DOM.create('div', {
        className: 'citation-quote',
        text: source.raw || source.text || ''
      });
      citationBox.appendChild(quoteEl);

      // Inspect all duplicate occurrences if present
      if (item.duplicates && item.duplicates.length > 0) {
        const dupBox = DOM.create('div', { className: 'duplicate-sources-box' });
        const dupTitle = DOM.create('div', {
          className: 'duplicate-sources-title',
          text: `Other Occurrences in Conversation (${item.duplicates.length}):`
        });
        dupBox.appendChild(dupTitle);

        for (const dup of item.duplicates) {
          const dupItem = DOM.create('div', {
            className: 'duplicate-item',
            text: `• From: ${dup.sender} (${dup.time || 'N/A'}) — Line #${dup.lineNum}: "${dup.raw || dup.text}"`
          });
          dupBox.appendChild(dupItem);
        }
        citationBox.appendChild(dupBox);
      }

      card.appendChild(citationBox);
      return card;
    },

    /**
     * Render the dedicated Spam & Scam Shield section
     */
    renderShieldSection(shieldItems) {
      const container = document.getElementById('shieldList');
      const countBadge = document.getElementById('shieldCountBadge');
      if (!container || !countBadge) return;
      DOM.empty(container);

      countBadge.textContent = String(shieldItems.length);

      if (shieldItems.length === 0) {
        const emptyNotice = DOM.create('div', {
          className: 'empty-section-notice',
          text: 'No suspicious patterns, spam broadcasts, or phishing risks detected in this conversation.'
        });
        container.appendChild(emptyNotice);
        return;
      }

      for (const item of shieldItems) {
        let cardModifier = 'risk-neutral';
        let pillClass = 'pill-neutral';
        let fillClass = 'fill-neutral';

        if (item.label === ShieldEngine.CLASSIFICATIONS.HIGH_RISK) {
          cardModifier = 'risk-high';
          pillClass = 'pill-high-risk';
          fillClass = 'fill-high';
        } else if (item.label === ShieldEngine.CLASSIFICATIONS.SUSPICIOUS) {
          cardModifier = 'risk-suspicious';
          pillClass = 'pill-suspicious';
          fillClass = 'fill-suspicious';
        } else if (item.label === ShieldEngine.CLASSIFICATIONS.PROMO) {
          cardModifier = 'risk-promo';
          pillClass = 'pill-promo';
          fillClass = 'fill-promo';
        } else if (item.label === ShieldEngine.CLASSIFICATIONS.LEGIT_ANNOUNCEMENT) {
          cardModifier = 'risk-legit';
          pillClass = 'pill-legit';
          fillClass = 'fill-legit';
        }

        const card = DOM.create('div', {
          className: `item-card shield-card ${cardModifier}`
        });

        // Top Row: Message Summary & Classification Pill
        const topRow = DOM.create('div', { className: 'item-main-row' });
        const textWrap = DOM.create('div', { className: 'item-text' });
        textWrap.appendChild(DOM.createSanitizedTextSpan(item.raw, state.redactEnabled));

        const badge = DOM.create('span', {
          className: `item-tag ${pillClass}`,
          text: item.label
        });
        topRow.appendChild(textWrap);
        topRow.appendChild(badge);
        card.appendChild(topRow);

        // Risk Meter (0–100)
        const meterWrap = DOM.create('div', { className: 'risk-meter-wrap' });
        const scoreTag = DOM.create('span', {
          className: `risk-score-tag ${pillClass}`,
          text: `Risk Score: ${item.score}/100`
        });
        const meter = DOM.create('div', { className: 'risk-meter' });
        const meterFill = DOM.create('div', {
          className: `risk-meter-fill ${fillClass}`
        });
        meterFill.style.width = `${Math.max(5, item.score)}%`;
        meter.appendChild(meterFill);

        meterWrap.appendChild(scoreTag);
        meterWrap.appendChild(meter);
        card.appendChild(meterWrap);

        // Explainable Reasons List
        if (item.reasons && item.reasons.length > 0) {
          const reasonsList = DOM.create('ul', { className: 'risk-reasons-list' });
          for (const reason of item.reasons) {
            reasonsList.appendChild(DOM.create('li', { text: reason }));
          }
          card.appendChild(reasonsList);
        }

        // Sender Identity & Limitation Note
        if (item.senderNote) {
          const senderEl = DOM.create('div', {
            className: 'risk-limitations-note',
            text: `ℹ️ ${item.senderNote}`
          });
          card.appendChild(senderEl);
        }

        // Meta row with citation button
        const metaRow = DOM.create('div', { className: 'item-meta-row' });
        const citationToggleBtn = DOM.create('button', {
          className: 'citation-toggle-btn',
          attrs: {
            'type': 'button',
            'aria-expanded': 'false',
            'title': 'Toggle verbatim original message citation'
          },
          children: [DOM.create('span', { text: '💬 View Source Citation' })]
        });
        metaRow.appendChild(citationToggleBtn);
        card.appendChild(metaRow);

        // Collapsible citation box
        const src = item.source || item;
        const citationBox = DOM.create('div', {
          className: 'citation-box hidden',
          children: [
            DOM.create('div', {
              className: 'citation-header',
              children: [
                DOM.create('strong', { text: `From: ${src.sender || 'Unknown'}` }),
                src.time ? DOM.create('span', { text: ` (${src.time})` }) : null,
                DOM.create('span', { text: ` — Line #${src.lineNum || 1}` })
              ].filter(Boolean)
            }),
            DOM.create('div', {
              className: 'citation-quote',
              text: src.raw || src.text || ''
            })
          ]
        });
        card.appendChild(citationBox);

        container.appendChild(card);
      }
    },

    /**
     * Render a section list or display empty placeholder
     */
    renderSection(containerId, countBadgeId, items, emptyNoticeText) {
      const container = document.getElementById(containerId);
      const countBadge = document.getElementById(countBadgeId);
      DOM.empty(container);

      countBadge.textContent = String(items.length);

      if (items.length === 0) {
        const emptyNotice = DOM.create('div', {
          className: 'empty-section-notice',
          text: emptyNoticeText
        });
        container.appendChild(emptyNotice);
        return;
      }

      for (const item of items) {
        container.appendChild(this.createItemCard(item));
      }
    },

    /**
     * Render the deprioritized / low-relevance section
     */
    renderDeprioritizedSection(items) {
      const section = document.getElementById('deprioritizedSection');
      const container = document.getElementById('deprioritizedList');
      const countBadge = document.getElementById('deprioritizedCountBadge');
      if (!section || !container || !countBadge) return;

      DOM.empty(container);

      if (!state.relevancePreferences.separateLowRelevance || !items || items.length === 0) {
        section.classList.add('hidden');
        countBadge.textContent = '0';
        return;
      }

      section.classList.remove('hidden');
      countBadge.textContent = String(items.length);

      for (const item of items) {
        container.appendChild(this.createItemCard(item));
      }
    },

    /**
     * Render the active participants grid
     */
    renderParticipants(participants) {
      const container = document.getElementById('participantsList');
      const countBadge = document.getElementById('participantsCountBadge');
      DOM.empty(container);

      countBadge.textContent = String(participants.length);

      for (const p of participants) {
        const initials = p.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
        const card = DOM.create('div', {
          className: 'participant-card',
          children: [
            DOM.create('div', { className: 'participant-avatar', text: initials }),
            DOM.create('div', {
              className: 'participant-info',
              children: [
                DOM.create('div', { className: 'participant-name', text: p.name }),
                DOM.create('div', {
                  className: 'participant-count',
                  text: `${p.messageCount} msg${p.messageCount === 1 ? '' : 's'}${p.tasksAssigned > 0 ? ` • ${p.tasksAssigned} task${p.tasksAssigned === 1 ? '' : 's'}` : ''}`
                })
              ]
            })
          ]
        });
        container.appendChild(card);
      }
    },

    /**
     * Full report rendering pass
     */
    renderFullReport(report) {
      const emptyState = document.getElementById('emptyState');
      const reportContainer = document.getElementById('reportContainer');
      const reportStatusBadge = document.getElementById('reportStatusBadge');
      const reportSubtitle = document.getElementById('reportSubtitle');
      const copyBtn = document.getElementById('copySummaryBtn');

      emptyState.classList.add('hidden');
      reportContainer.classList.remove('hidden');

      reportStatusBadge.className = 'badge badge-live';
      reportStatusBadge.textContent = `Analyzed in ${report.stats.processingTimeMs}ms`;

      reportSubtitle.textContent = `Processed ${report.stats.totalMessages} messages across ${report.stats.totalParticipants} participants.`;
      copyBtn.disabled = false;

      // Metrics
      this.renderMetrics(report.stats);

      // Section: Spam & Scam Shield
      this.renderShieldSection(report.shield || []);

      // Sections
      this.renderSection('urgentList', 'urgentCountBadge', report.urgent, 'No urgent alerts or active blockers detected.');
      this.renderSection('decisionsList', 'decisionsCountBadge', report.decisions, 'No explicit decisions identified in this transcript.');
      this.renderSection('tasksList', 'tasksCountBadge', report.tasks, 'No action items or assigned tasks detected.');
      this.renderSection('deadlinesList', 'deadlinesCountBadge', report.deadlines, 'No deadlines or target delivery times specified.');
      this.renderSection('highlightsList', 'highlightsCountBadge', report.highlights, 'No major status highlights detected.');

      // Section: Deprioritized Low-Relevance Items
      this.renderDeprioritizedSection(report.deprioritized || []);

      // Participants
      this.renderParticipants(report.participants);
    }
  };

  /* ==========================================================================
     10. Markdown Summary Formatter (For Copying)
     ========================================================================== */
  const SummaryFormatter = {
    format(report, redactEnabled) {
      if (!report) return '';

      const sanitize = (str) => {
        if (!redactEnabled) return str;
        return RuleEngine.maskPII(str);
      };

      const now = new Date().toLocaleString();
      let md = `# What Did I Miss? — Catch-Up Digest\n`;
      md += `*Generated locally on ${now} via Rule-Based NLP Engine (Zero Data Transmitted)*\n\n`;

      md += `## 📊 Quick Overview\n`;
      md += `- **Total Messages Analyzed:** ${report.stats.totalMessages}\n`;
      md += `- **Active Participants:** ${report.stats.totalParticipants}\n`;
      md += `- **Urgent Items:** ${report.stats.urgentCount}\n`;
      md += `- **Key Decisions:** ${report.stats.decisionsCount}\n`;
      md += `- **Tasks & Action Items:** ${report.stats.tasksCount}\n`;
      md += `- **Deadlines & Milestones:** ${report.stats.deadlinesCount}\n`;
      if (report.stats.shieldCount > 0) {
        md += `- **Shield Alerts / Flags:** ${report.stats.shieldCount}\n`;
      }
      md += `\n`;

      // Spam & Scam Shield findings
      if (report.shield && report.shield.length > 0) {
        const flagged = report.shield.filter(s => s.score >= 40);
        if (flagged.length > 0) {
          md += `## 🛡️ Spam & Scam Shield Alerts\n`;
          flagged.forEach((s, i) => {
            md += `${i + 1}. **[${s.label} — Risk Score: ${s.score}/100]** ${sanitize(s.raw)}\n`;
            if (s.reasons && s.reasons.length > 0) {
              s.reasons.forEach(r => {
                md += `   - *Signal:* ${r}\n`;
              });
            }
            md += `   *Source: ${s.sender} (${s.time || 'N/A'}) — Line #${s.lineNum}*\n`;
          });
          md += `\n`;
        }
      }

      if (report.urgent.length > 0) {
        md += `## 🚨 Urgent Alerts & Blockers\n`;
        report.urgent.forEach((u, i) => {
          md += `${i + 1}. **[${u.tag}]** ${sanitize(u.summary)}\n`;
          md += `   *Source: ${u.source.sender} (${u.source.time || 'N/A'})*\n`;
        });
        md += `\n`;
      }

      if (report.decisions.length > 0) {
        md += `## ⚖️ Decisions Made\n`;
        report.decisions.forEach((d, i) => {
          md += `${i + 1}. ${sanitize(d.summary)}\n`;
          md += `   *Source: ${d.source.sender} (${d.source.time || 'N/A'})*\n`;
        });
        md += `\n`;
      }

      if (report.tasks.length > 0) {
        md += `## ✅ Action Items & Tasks\n`;
        report.tasks.forEach((t, i) => {
          md += `${i + 1}. [ ] **@${t.assignee}:** ${sanitize(t.summary)}\n`;
          md += `   *Source: ${t.source.sender} (${t.source.time || 'N/A'})*\n`;
        });
        md += `\n`;
      }

      if (report.deadlines.length > 0) {
        md += `## ⏰ Deadlines & Target Times\n`;
        report.deadlines.forEach((dl, i) => {
          md += `${i + 1}. **Target: ${dl.targetTime}** — ${sanitize(dl.summary)}\n`;
          md += `   *Source: ${dl.source.sender} (${dl.source.time || 'N/A'})*\n`;
        });
        md += `\n`;
      }

      if (report.highlights.length > 0) {
        md += `## 💡 Discussion Highlights\n`;
        report.highlights.forEach((h, i) => {
          md += `- ${sanitize(h.summary)}\n`;
        });
        md += `\n`;
      }

      if (report.deprioritized && report.deprioritized.length > 0) {
        md += `## 📁 Deprioritized Items (${report.deprioritized.length})\n`;
        report.deprioritized.forEach((item, i) => {
          md += `- ${sanitize(item.summary || item.text)}\n`;
        });
        md += `\n`;
      }

      md += `## 👥 Participants\n`;
      report.participants.forEach(p => {
        md += `- **${p.name}:** ${p.messageCount} messages${p.tasksAssigned > 0 ? `, ${p.tasksAssigned} tasks assigned` : ''}\n`;
      });

      return md;
    }
  };

  /* ==========================================================================
     11. Application Controller & Event Handling
     ========================================================================== */
  const AppController = {
    init() {
      this.bindElements();
      if (!this.chatInput) return; // Exit if DOM elements aren't present (e.g. test runner)
      this.bindEvents();
      this.updateInputCounters();
    },

    bindElements() {
      this.chatInput = document.getElementById('chatInput');
      if (!this.chatInput) return;

      this.charCount = document.getElementById('charCount');
      this.lineCount = document.getElementById('lineCount');
      this.inputNotice = document.getElementById('inputNotice');
      this.redactToggle = document.getElementById('redactToggle');
      this.sensitiveDetectionCount = document.getElementById('sensitiveDetectionCount');
      this.analyzeBtn = document.getElementById('analyzeBtn');
      this.loadDemoBtn = document.getElementById('loadDemoBtn');
      this.emptyStateDemoBtn = document.getElementById('emptyStateDemoBtn');
      this.clearAllBtn = document.getElementById('clearAllBtn');
      this.copySummaryBtn = document.getElementById('copySummaryBtn');
      this.privacyInfoBtn = document.getElementById('privacyInfoBtn');
      this.privacyModal = document.getElementById('privacyModal');
      this.closePrivacyModalBtn = document.getElementById('closePrivacyModalBtn');
      this.dismissModalBtn = document.getElementById('dismissModalBtn');
      this.dismissPrivacyBannerBtn = document.getElementById('dismissPrivacyBannerBtn');
      this.privacyStrip = document.querySelector('.privacy-strip');

      // Relevance & Preferences Controls
      this.separateLowRelevanceToggle = document.getElementById('separateLowRelevanceToggle');
      this.userHandleInput = document.getElementById('userHandleInput');
      this.shieldSection = document.getElementById('shieldSection');
      this.shieldCountBadge = document.getElementById('shieldCountBadge');
      this.shieldList = document.getElementById('shieldList');
      this.deprioritizedSection = document.getElementById('deprioritizedSection');
      this.deprioritizedCountBadge = document.getElementById('deprioritizedCountBadge');
      this.deprioritizedList = document.getElementById('deprioritizedList');
    },

    bindEvents() {
      if (!this.chatInput) return;

      // Input text live counter and PII scan
      this.chatInput.addEventListener('input', () => {
        this.updateInputCounters();
        this.scanInputPII();
      });

      // Analyze Action
      this.analyzeBtn.addEventListener('click', () => this.handleAnalyze());

      // Demo Chat Actions
      this.loadDemoBtn.addEventListener('click', () => this.loadDemo());
      this.emptyStateDemoBtn.addEventListener('click', () => this.loadDemo());

      // Redaction toggle
      this.redactToggle.addEventListener('change', (e) => {
        state.redactEnabled = e.target.checked;
        if (state.analysisReport) {
          UIRenderer.renderFullReport(state.analysisReport);
        }
        this.showToast(state.redactEnabled ? 'PII redaction enabled.' : 'PII redaction disabled.');
      });

      // Clear All Data
      this.clearAllBtn.addEventListener('click', () => this.handleClearAll());

      // Copy Summary
      this.copySummaryBtn.addEventListener('click', () => this.handleCopySummary());

      // Privacy Modal
      this.privacyInfoBtn.addEventListener('click', () => this.openPrivacyModal());
      this.closePrivacyModalBtn.addEventListener('click', () => this.closePrivacyModal());
      this.dismissModalBtn.addEventListener('click', () => this.closePrivacyModal());
      this.privacyModal.addEventListener('click', (e) => {
        if (e.target === this.privacyModal) this.closePrivacyModal();
      });

      // Privacy Banner Dismiss
      if (this.dismissPrivacyBannerBtn) {
        this.dismissPrivacyBannerBtn.addEventListener('click', () => {
          if (this.privacyStrip) this.privacyStrip.style.display = 'none';
        });
      }

      // Keyboard shortcuts: Escape closes modal
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !this.privacyModal.classList.contains('hidden')) {
          this.closePrivacyModal();
        }
      });

      // Topic chips toggle
      const topicChips = document.querySelectorAll('.topic-chip');
      topicChips.forEach(chip => {
        chip.addEventListener('click', () => {
          chip.classList.toggle('active');
          const activeTopics = Array.from(document.querySelectorAll('.topic-chip.active'))
            .map(c => c.getAttribute('data-topic'))
            .filter(Boolean);
          state.relevancePreferences.selectedTopics = activeTopics;
          if (state.analysisReport && state.parsedMessages.length > 0) {
            state.analysisReport = RuleEngine.analyze(state.parsedMessages);
            UIRenderer.renderFullReport(state.analysisReport);
          }
        });
      });

      // User personal handle input
      if (this.userHandleInput) {
        this.userHandleInput.addEventListener('input', (e) => {
          state.relevancePreferences.userHandle = e.target.value.trim();
          if (state.analysisReport && state.parsedMessages.length > 0) {
            state.analysisReport = RuleEngine.analyze(state.parsedMessages);
            UIRenderer.renderFullReport(state.analysisReport);
          }
        });
      }

      // Separate low-relevance items toggle
      if (this.separateLowRelevanceToggle) {
        this.separateLowRelevanceToggle.addEventListener('change', (e) => {
          state.relevancePreferences.separateLowRelevance = e.target.checked;
          if (state.analysisReport && state.parsedMessages.length > 0) {
            state.analysisReport = RuleEngine.analyze(state.parsedMessages);
            UIRenderer.renderFullReport(state.analysisReport);
          }
          this.showToast(e.target.checked ? 'Low-relevance items moved to separate section.' : 'All items restored to main sections.');
        });
      }

      // Delegated event listener for "View Source Citation" buttons across re-renders
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.citation-toggle-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        const card = btn.closest('.item-card') || btn.closest('.shield-card');
        if (!card) return;

        const citationBox = card.querySelector('.citation-box');
        if (!citationBox) return;

        const isHidden = citationBox.classList.contains('hidden') || citationBox.style.display === 'none';
        if (isHidden) {
          citationBox.classList.remove('hidden');
          citationBox.style.display = 'block';
          btn.setAttribute('aria-expanded', 'true');
          btn.textContent = 'Hide Source Citation';
        } else {
          citationBox.classList.add('hidden');
          citationBox.style.display = 'none';
          btn.setAttribute('aria-expanded', 'false');
          btn.textContent = '💬 View Source Citation';
        }
      });

      // Delegated event listener for session relevance feedback buttons (👍 / 👎)
      document.addEventListener('click', (e) => {
        const fbBtn = e.target.closest('.feedback-btn');
        if (!fbBtn) return;
        e.preventDefault();
        e.stopPropagation();

        const action = fbBtn.getAttribute('data-action');
        const itemId = fbBtn.getAttribute('data-id');
        const isUp = action === 'feedback-up';

        const card = fbBtn.closest('.item-card');
        const textEl = card ? card.querySelector('.item-text') : null;
        const itemText = textEl ? textEl.textContent : '';

        RelevanceEngine.recordFeedback(itemId, itemText, isUp);
        this.showToast(isUp ? 'Marked as relevant (active session only).' : 'Marked as low relevance (active session only).');

        if (state.analysisReport && state.parsedMessages.length > 0) {
          state.analysisReport = RuleEngine.analyze(state.parsedMessages);
          UIRenderer.renderFullReport(state.analysisReport);
        }
      });
    },

    updateInputCounters() {
      const val = this.chatInput.value;
      const chars = val.length;
      const lines = val ? val.split(/\r?\n/).length : 0;

      this.charCount.textContent = `${chars.toLocaleString()} characters`;
      this.lineCount.textContent = `${lines.toLocaleString()} lines`;

      if (chars > 200000) {
        this.inputNotice.textContent = '⚠️ Large input: Parsing might take a split-second.';
      } else {
        this.inputNotice.textContent = '';
      }
    },

    scanInputPII() {
      const text = this.chatInput.value;
      const pii = RuleEngine.scanPII(text);
      state.detectedPII = pii;

      const totalPII = pii.emails.length + pii.phones.length;
      if (totalPII === 0) {
        this.sensitiveDetectionCount.textContent = '0 detected';
      } else {
        this.sensitiveDetectionCount.textContent = `${totalPII} detected (${pii.emails.length} email${pii.emails.length === 1 ? '' : 's'}, ${pii.phones.length} phone${pii.phones.length === 1 ? '' : 's'})`;
      }
    },

    loadDemo() {
      this.chatInput.value = DEMO_CHAT;
      this.updateInputCounters();
      this.scanInputPII();
      this.handleAnalyze();
      this.showToast('Sample hackathon chat loaded and analyzed.');
    },

    handleAnalyze() {
      const raw = this.chatInput.value.trim();

      if (!raw) {
        this.showToast('Please paste a chat conversation first.', 'error');
        this.chatInput.focus();
        return;
      }

      state.rawInput = raw;

      // 1. Parse Messages
      const messages = ChatParser.parse(raw);
      state.parsedMessages = messages;

      if (messages.length === 0) {
        this.showToast('Could not extract any messages. Please check your text.', 'error');
        return;
      }

      // 2. Run Rule-Based Analysis
      const report = RuleEngine.analyze(messages);
      state.analysisReport = report;

      // 3. Render Output
      UIRenderer.renderFullReport(report);
      this.showToast(`Briefing generated: ${report.stats.totalMessages} messages analyzed.`);
    },

    handleClearAll() {
      // 1. Wipe DOM input
      this.chatInput.value = '';
      this.updateInputCounters();

      // 2. Reset In-Memory State
      state.rawInput = '';
      state.parsedMessages = [];
      state.analysisReport = null;
      state.detectedPII = { emails: [], phones: [] };
      state.redactEnabled = false;
      this.redactToggle.checked = false;
      this.sensitiveDetectionCount.textContent = '0 detected';

      state.relevancePreferences = {
        selectedTopics: ['assignments', 'college', 'projects', 'internships', 'personal', 'events'],
        userHandle: '',
        separateLowRelevance: false,
        sessionFeedback: {
          itemOverrides: {},
          positiveKeywords: {},
          negativeKeywords: {}
        }
      };

      if (this.userHandleInput) this.userHandleInput.value = '';
      if (this.separateLowRelevanceToggle) this.separateLowRelevanceToggle.checked = false;
      document.querySelectorAll('.topic-chip').forEach(c => c.classList.add('active'));

      // 3. Reset Report View
      document.getElementById('reportContainer').classList.add('hidden');
      document.getElementById('emptyState').classList.remove('hidden');
      document.getElementById('copySummaryBtn').disabled = true;

      const statusBadge = document.getElementById('reportStatusBadge');
      statusBadge.className = 'badge badge-muted';
      statusBadge.textContent = 'Awaiting Input';

      document.getElementById('reportSubtitle').textContent = 'Your prioritized action briefing will appear here.';

      // Clear lists
      DOM.empty(document.getElementById('metricsGrid'));
      DOM.empty(document.getElementById('shieldList'));
      const shieldBadge = document.getElementById('shieldCountBadge');
      if (shieldBadge) shieldBadge.textContent = '0';

      DOM.empty(document.getElementById('urgentList'));
      DOM.empty(document.getElementById('decisionsList'));
      DOM.empty(document.getElementById('tasksList'));
      DOM.empty(document.getElementById('deadlinesList'));
      DOM.empty(document.getElementById('highlightsList'));

      const depSection = document.getElementById('deprioritizedSection');
      if (depSection) depSection.classList.add('hidden');
      DOM.empty(document.getElementById('deprioritizedList'));
      const depBadge = document.getElementById('deprioritizedCountBadge');
      if (depBadge) depBadge.textContent = '0';

      DOM.empty(document.getElementById('participantsList'));

      this.showToast('All chat data and memory have been wiped.');
    },

    async handleCopySummary() {
      if (!state.analysisReport) return;

      const markdown = SummaryFormatter.format(state.analysisReport, state.redactEnabled);

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(markdown);
        } else {
          const tempArea = document.createElement('textarea');
          tempArea.value = markdown;
          tempArea.style.position = 'fixed';
          tempArea.style.opacity = '0';
          document.body.appendChild(tempArea);
          tempArea.select();
          document.execCommand('copy');
          document.body.removeChild(tempArea);
        }
        this.showToast('Catch-up summary copied to clipboard in Markdown format!');
      } catch (err) {
        this.showToast('Failed to copy to clipboard automatically.', 'error');
      }
    },

    openPrivacyModal() {
      this.privacyModal.classList.remove('hidden');
    },

    closePrivacyModal() {
      this.privacyModal.classList.add('hidden');
    },

    showToast(message, type = 'info') {
      const container = document.getElementById('toastContainer');
      const toast = DOM.create('div', {
        className: `toast ${type === 'error' ? 'toast-error' : ''}`,
        children: [
          DOM.create('span', { text: type === 'error' ? '⚠️' : '✨' }),
          DOM.create('span', { text: message })
        ]
      });

      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => {
          if (toast.parentNode === container) {
            container.removeChild(toast);
          }
        }, 250);
      }, 3000);
    }
  };

  // Expose module for testing in automated test environments
  if (typeof window !== 'undefined') {
    window.WhatDidIMissApp = {
      ChatParser,
      RuleEngine,
      ShieldEngine,
      RelevanceEngine,
      DuplicateDetector,
      SummaryFormatter,
      UIRenderer,
      DOM,
      AppController,
      state
    };
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AppController.init());
  } else {
    AppController.init();
  }
})();
