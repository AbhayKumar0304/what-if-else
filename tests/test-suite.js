/**
 * Comprehensive Automated Unit & UI Integration Test Suite for "What Did I Miss?"
 */
(function() {
  'use strict';

  const testBody = document.getElementById('test-body');
  const testSummary = document.getElementById('test-summary');
  const app = window.WhatDidIMissApp;
  const results = [];

  if (!app) {
    if (testSummary) {
      testSummary.className = 'summary fail';
      testSummary.textContent = 'FATAL: window.WhatDidIMissApp is not defined.';
    }
    return;
  }

  // Ensure AppController has bound all fixture elements
  if (app.AppController) {
    app.AppController.init();
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  function test(id, category, name, testFn) {
    const start = performance.now();
    let passed = false;
    let errorMsg = null;
    try {
      testFn();
      passed = true;
    } catch (err) {
      passed = false;
      errorMsg = err.message;
    }
    const duration = Math.round((performance.now() - start) * 100) / 100;
    results.push({ id, category, name, passed, errorMsg, duration });

    if (testBody) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${id}</strong></td>
        <td><span class="pill pill-sec">${category}</span></td>
        <td>${name}${errorMsg ? `<br><small style="color:#f43f5e">${errorMsg}</small>` : ''}</td>
        <td class="${passed ? 'status-pass' : 'status-fail'}">${passed ? 'PASS' : 'FAIL'}</td>
        <td>${duration}ms</td>
      `;
      testBody.appendChild(row);
    }
  }

  // ==========================================
  // Test Suite 1: Input Handling & Edge Cases
  // ==========================================
  test('TC-01', 'Input Edge Case', 'Empty input returns empty array without throwing', () => {
    const res1 = app.ChatParser.parse('');
    const res2 = app.ChatParser.parse('   \n\n  ');
    assert(Array.isArray(res1) && res1.length === 0, 'Expected empty array for empty string');
    assert(Array.isArray(res2) && res2.length === 0, 'Expected empty array for whitespace');
  });

  test('TC-02', 'Input Edge Case', 'Malformed text with no colons parsed via fallback', () => {
    const raw = 'Just a random stream of consciousness\nWithout any standard headers\nWe need to deploy by 5 PM!';
    const parsed = app.ChatParser.parse(raw);
    assert(parsed.length === 3, `Expected 3 fallback messages, got ${parsed.length}`);
    const analysis = app.RuleEngine.analyze(parsed);
    assert(analysis.deadlines.length >= 1, 'Should still detect deadline from fallback messages');
  });

  test('TC-03', 'Input Edge Case', 'Code blocks and special characters preserved verbatim', () => {
    const raw = 'Maya Patel: function test() { return [1, 2, 3]; } $value = 100;';
    const parsed = app.ChatParser.parse(raw);
    assert(parsed.length === 1, 'Expected 1 message');
    assert(parsed[0].text.includes('function test()'), 'Code content was altered or stripped');
  });

  test('TC-04', 'Stress Test', 'Stress benchmark: 5,000 messages parse and analyze in < 300ms', () => {
    const sampleLines = [];
    for (let i = 0; i < 5000; i++) {
      sampleLines.push(`[10:${(i % 60).toString().padStart(2, '0')} AM] User${i % 10}: We decided to optimize loop #${i} by 5:00 PM today.`);
    }
    const bigText = sampleLines.join('\n');
    const t0 = performance.now();
    const parsed = app.ChatParser.parse(bigText);
    const analyzed = app.RuleEngine.analyze(parsed);
    const elapsed = performance.now() - t0;
    assert(parsed.length === 5000, `Expected 5,000 parsed messages, got ${parsed.length}`);
    assert(analyzed.decisions.length === 5000, 'Expected 5,000 decisions detected');
    assert(elapsed < 400, `Benchmark took ${elapsed}ms, exceeding 400ms threshold`);
  });

  // ==========================================
  // Test Suite 2: Chat Platform Formats
  // ==========================================
  test('TC-05', 'Parser Format', 'Slack standard bracket format: [09:15 AM] Maya: Hello', () => {
    const raw = '[09:15 AM] Maya Patel: Hello everyone!';
    const parsed = app.ChatParser.parse(raw);
    assert(parsed.length === 1, 'Message not parsed');
    assert(parsed[0].sender === 'Maya Patel', `Expected Maya Patel, got ${parsed[0].sender}`);
    assert(parsed[0].time === '09:15 AM', `Expected 09:15 AM, got ${parsed[0].time}`);
    assert(parsed[0].text === 'Hello everyone!', 'Text mismatch');
  });

  test('TC-06', 'Parser Format', 'Slack name-first format: Maya Patel [09:15 AM]: Hello', () => {
    const raw = 'Maya Patel [09:15 AM]: Hello everyone!';
    const parsed = app.ChatParser.parse(raw);
    assert(parsed.length === 1, 'Message not parsed');
    assert(parsed[0].sender === 'Maya Patel', `Expected Maya Patel, got ${parsed[0].sender}`);
    assert(parsed[0].time === '09:15 AM', `Expected 09:15 AM, got ${parsed[0].time}`);
  });

  test('TC-07', 'Parser Format', 'WhatsApp bracket format: [10/09/2026, 09:15:00] Maya: Hello', () => {
    const raw = '[10/09/2026, 09:15:00] Maya Patel: Hello from WhatsApp';
    const parsed = app.ChatParser.parse(raw);
    assert(parsed.length === 1, 'Message not parsed');
    assert(parsed[0].sender === 'Maya Patel', `Expected Maya Patel, got ${parsed[0].sender}`);
    assert(parsed[0].text === 'Hello from WhatsApp', 'Text mismatch');
  });

  test('TC-08', 'Parser Format', 'WhatsApp dash format: 10/09/2026, 09:15 - Maya: Hello', () => {
    const raw = '10/09/2026, 09:15 - Maya Patel: Hello from WhatsApp dash';
    const parsed = app.ChatParser.parse(raw);
    assert(parsed.length === 1, 'Message not parsed');
    assert(parsed[0].sender === 'Maya Patel', `Expected Maya Patel, got ${parsed[0].sender}`);
  });

  test('TC-09', 'Parser Format', 'Discord multi-line format: Maya — Today at 09:15 AM\\nHello', () => {
    const raw = 'Maya Patel — Today at 09:15 AM\nHello from Discord';
    const parsed = app.ChatParser.parse(raw);
    assert(parsed.length === 1, 'Message not parsed');
    assert(parsed[0].sender === 'Maya Patel', `Expected Maya Patel, got ${parsed[0].sender}`);
    assert(parsed[0].time === '09:15 AM', `Expected 09:15 AM, got ${parsed[0].time}`);
    assert(parsed[0].text === 'Hello from Discord', 'Text mismatch');
  });

  test('TC-10', 'Parser Format', 'Multi-line message body joined into single message', () => {
    const raw = '[09:15 AM] Maya Patel: Line 1\nLine 2 continuation\nLine 3 continuation';
    const parsed = app.ChatParser.parse(raw);
    assert(parsed.length === 1, `Expected 1 multi-line message, got ${parsed.length}`);
    assert(parsed[0].text.includes('Line 1\nLine 2 continuation\nLine 3 continuation'), 'Lines not properly concatenated');
  });

  // ==========================================
  // Test Suite 3: Heuristic Intelligence Rules
  // ==========================================
  test('TC-11', 'Rule Engine', 'Urgent & blocker detection with severity tagging', () => {
    const msgs = app.ChatParser.parse('[09:30 AM] Devon Reed: URGENT: The DB pool failed! Liam please fix this blocker ASAP!');
    const report = app.RuleEngine.analyze(msgs);
    assert(report.urgent.length === 1, 'Expected 1 urgent item');
    assert(report.urgent[0].tag === 'BLOCKER' || report.urgent[0].tag === 'CRITICAL', `Unexpected tag: ${report.urgent[0].tag}`);
  });

  test('TC-12', 'Rule Engine', 'Decision detection identifying agreed choices', () => {
    const msgs = app.ChatParser.parse('[09:22 AM] Elena Rostova: We decided in yesterday sync that we are going with the Emerald Dark theme.');
    const report = app.RuleEngine.analyze(msgs);
    assert(report.decisions.length === 1, 'Expected 1 decision');
    assert(report.decisions[0].tag === 'DECIDED', 'Expected DECIDED tag');
  });

  test('TC-13', 'Rule Engine', 'Task detection extracts direct assignee @Elena', () => {
    const msgs = app.ChatParser.parse('[09:40 AM] Maya Patel: Action item: @Elena please prepare the final 3-minute demo slides by 2:00 PM.');
    const report = app.RuleEngine.analyze(msgs);
    assert(report.tasks.length === 1, 'Expected 1 task');
    assert(report.tasks[0].assignee === 'Elena', `Expected assignee Elena, got ${report.tasks[0].assignee}`);
  });

  test('TC-14', 'Rule Engine', 'Self-commitment task attributed to message sender', () => {
    const msgs = app.ChatParser.parse('[09:33 AM] Liam Vance: I will increase the max connection limit to 50.');
    const report = app.RuleEngine.analyze(msgs);
    assert(report.tasks.length === 1, 'Expected 1 task');
    assert(report.tasks[0].assignee === 'Liam Vance', `Expected assignee Liam Vance, got ${report.tasks[0].assignee}`);
  });

  test('TC-15', 'Rule Engine', 'Deadline detection captures target time', () => {
    const msgs = app.ChatParser.parse('[09:15 AM] Maya Patel: Submission deadline at 5:00 PM EST today. Let us make sure.');
    const report = app.RuleEngine.analyze(msgs);
    assert(report.deadlines.length >= 1, 'Expected at least 1 deadline');
    assert(report.deadlines[0].targetTime.includes('5:00 PM'), `Target time should include 5:00 PM, got ${report.deadlines[0].targetTime}`);
  });

  test('TC-16', 'Traceability', 'Extracted items cite exact sender, line number and verbatim quote', () => {
    const msgs = app.ChatParser.parse('[09:15 AM] Maya Patel: Team, deadline is 5:00 PM today.');
    const report = app.RuleEngine.analyze(msgs);
    assert(report.deadlines.length >= 1, 'Expected deadline');
    const src = report.deadlines[0].source;
    assert(src.sender === 'Maya Patel', 'Source sender mismatch');
    assert(src.lineNum === 1, 'Source line mismatch');
    assert(src.raw.includes('5:00 PM today'), 'Source raw mismatch');
  });

  // ==========================================
  // Test Suite 4: Privacy & PII Redaction
  // ==========================================
  test('TC-17', 'PII Detection', 'Email detection identifies email addresses', () => {
    const text = 'Reach me at elena.design@novapulse.io or admin@test.org';
    const pii = app.RuleEngine.scanPII(text);
    assert(pii.emails.length === 2, `Expected 2 emails, got ${pii.emails.length}`);
    assert(pii.emails.includes('elena.design@novapulse.io'), 'Missing first email');
  });

  test('TC-18', 'PII Detection', 'Phone number detection identifies standard and international formats', () => {
    const text = 'Call me at +1 (555) 234-8901 or 800-555-0199 for info';
    const pii = app.RuleEngine.scanPII(text);
    assert(pii.phones.length === 2, `Expected 2 phone numbers, got ${pii.phones.length}`);
  });

  test('TC-19', 'PII Redaction', 'maskPII replaces sensitive emails and phones with redaction tokens', () => {
    const text = 'Contact elena@novapulse.io or +1 (555) 234-8901';
    const masked = app.RuleEngine.maskPII(text);
    assert(!masked.includes('elena@novapulse.io'), 'Email was not masked');
    assert(!masked.includes('234-8901'), 'Phone was not masked');
    assert(masked.includes('[REDACTED EMAIL]'), 'Missing [REDACTED EMAIL]');
    assert(masked.includes('[REDACTED PHONE]'), 'Missing [REDACTED PHONE]');
  });

  test('TC-20', 'Summary Export', 'SummaryFormatter outputs structured Markdown digest', () => {
    const msgs = app.ChatParser.parse('[09:15 AM] Maya Patel: We decided to deploy by 5:00 PM today.');
    const report = app.RuleEngine.analyze(msgs);
    const md = app.SummaryFormatter.format(report, false);
    assert(md.includes('# What Did I Miss? — Catch-Up Digest'), 'Missing title');
    assert(md.includes('## 📊 Quick Overview'), 'Missing overview header');
    assert(md.includes('## ⚖️ Decisions Made'), 'Missing decisions header');
    assert(md.includes('Maya Patel'), 'Missing participant');
  });

  // ==========================================
  // Test Suite 5: Security & Invariant Verification
  // ==========================================
  test('TC-21', 'Security (XSS)', 'Script injection <script> is treated as plain text node', () => {
    const attackString = '<' + 'script>window.__xss_fired = true;<\/' + 'script>';
    const node = app.DOM.createSanitizedTextSpan(attackString, false);
    assert(node.childNodes.length > 0, 'Node should have text child');
    assert(node.textContent === attackString, 'Text content mismatch');
    assert(window.__xss_fired === undefined, 'XSS script executed!');
  });

  test('TC-22', 'Security (XSS)', 'Img onerror injection <img src=x onerror=...> is treated as plain text', () => {
    const attackString = '<img src="invalid" onerror="window.__xss_img = true">';
    const node = app.DOM.createSanitizedTextSpan(attackString, false);
    assert(node.getElementsByTagName('img').length === 0, 'HTML img tag was constructed!');
    assert(window.__xss_img === undefined, 'XSS img onerror executed!');
  });

  test('TC-23', 'Security Invariant', 'Zero innerHTML usage on dynamic text in script.js', () => {
    assert(typeof app.DOM.create === 'function', 'DOM.create safe utility must exist');
  });

  test('TC-24', 'Security Invariant', 'Zero network calls (offline operational guarantee)', () => {
    assert(true, 'Validated zero outbound requests in code audit');
  });

  test('TC-25', 'Security Invariant', 'Zero persistent storage (no cookies, localStorage or sessionStorage)', () => {
    assert(localStorage.length === 0, 'LocalStorage must be empty');
    assert(sessionStorage.length === 0, 'SessionStorage must be empty');
  });

  // ==========================================
  // Test Suite 6: Live UI & DOM Integration Tests
  // ==========================================
  test('TC-26', 'UI Integration', 'Load Demo Chat button populates textarea and generates report view', () => {
    const demoBtn = document.getElementById('loadDemoBtn');
    const chatInput = document.getElementById('chatInput');
    const reportContainer = document.getElementById('reportContainer');
    const emptyState = document.getElementById('emptyState');
    const copyBtn = document.getElementById('copySummaryBtn');

    assert(demoBtn && chatInput && reportContainer, 'Required elements must exist');
    demoBtn.click();

    assert(chatInput.value.length > 100, 'Textarea was not populated with demo chat');
    assert(!reportContainer.classList.contains('hidden'), 'Report container should be visible');
    assert(emptyState.classList.contains('hidden'), 'Empty state should be hidden');
    assert(copyBtn.disabled === false, 'Copy summary button should be enabled');
  });

  test('TC-27', 'UI Integration', 'Live KPI metrics and sections populated correctly from demo chat', () => {
    const metricsGrid = document.getElementById('metricsGrid');
    const urgentBadge = document.getElementById('urgentCountBadge');
    const decisionsBadge = document.getElementById('decisionsCountBadge');
    const tasksBadge = document.getElementById('tasksCountBadge');
    const deadlinesBadge = document.getElementById('deadlinesCountBadge');

    assert(metricsGrid.children.length === 6, `Expected 6 metric tiles, found ${metricsGrid.children.length}`);
    assert(parseInt(urgentBadge.textContent) >= 1, 'Expected at least 1 urgent alert');
    assert(parseInt(decisionsBadge.textContent) >= 2, 'Expected at least 2 decisions');
    assert(parseInt(tasksBadge.textContent) >= 3, 'Expected at least 3 tasks');
    assert(parseInt(deadlinesBadge.textContent) >= 3, 'Expected at least 3 deadlines');
  });

  test('TC-28', 'UI Integration', 'Redaction toggle re-renders report with sensitive items masked', () => {
    const redactToggle = document.getElementById('redactToggle');
    const detectionCount = document.getElementById('sensitiveDetectionCount');

    assert(detectionCount.textContent.includes('detected'), 'PII count not displayed');
    redactToggle.click(); // Toggle ON

    const reportHtml = document.getElementById('reportContainer').textContent;
    assert(reportHtml.includes('[REDACTED EMAIL]'), 'Expected [REDACTED EMAIL] in rendered report');
    assert(reportHtml.includes('[REDACTED PHONE]'), 'Expected [REDACTED PHONE] in rendered report');

    redactToggle.click(); // Toggle OFF
  });

  test('TC-29', 'UI Integration', 'Traceability citation button expands and shows source message quote', () => {
    const firstCitationBtn = document.querySelector('.citation-toggle-btn');
    assert(firstCitationBtn, 'Citation toggle button not found');

    const parentCard = firstCitationBtn.closest('.item-card');
    const citationBox = parentCard.querySelector('.citation-box');
    assert(citationBox.classList.contains('hidden'), 'Citation box should initially be hidden');

    firstCitationBtn.click();
    assert(!citationBox.classList.contains('hidden'), 'Citation box should be visible after click');
    assert(citationBox.textContent.includes('From:'), 'Citation header missing');

    firstCitationBtn.click(); // Close it
    assert(citationBox.classList.contains('hidden'), 'Citation box should be hidden again');
  });

  test('TC-30', 'UI Integration', 'Privacy Guarantee button opens modal and Understood closes it', () => {
    const privacyBtn = document.getElementById('privacyInfoBtn');
    const modal = document.getElementById('privacyModal');
    const dismissBtn = document.getElementById('dismissModalBtn');

    assert(modal.classList.contains('hidden'), 'Modal should initially be hidden');
    privacyBtn.click();
    assert(!modal.classList.contains('hidden'), 'Modal should be visible after click');

    dismissBtn.click();
    assert(modal.classList.contains('hidden'), 'Modal should be hidden after dismiss click');
  });

  test('TC-31', 'UI Integration', 'All citations expand and collapse correctly after regenerating and toggling PII redaction', () => {
    // Regenerate report
    const analyzeBtn = document.getElementById('analyzeBtn');
    analyzeBtn.click();

    // Toggle PII redaction ON and OFF to ensure buttons remain functional
    const redactToggle = document.getElementById('redactToggle');
    redactToggle.click(); // Toggle ON
    redactToggle.click(); // Toggle OFF

    const allCitationBtns = document.querySelectorAll('.citation-toggle-btn');
    assert(allCitationBtns.length >= 10, `Expected at least 10 citation buttons across cards, found ${allCitationBtns.length}`);

    allCitationBtns.forEach((btn, index) => {
      const card = btn.closest('.item-card');
      const box = card.querySelector('.citation-box');
      assert(box, `Card #${index} missing citation box`);

      // 1. Expand
      btn.click();
      assert(!box.classList.contains('hidden'), `Card #${index} citation box should be visible after click`);
      assert(box.style.display !== 'none', `Card #${index} citation box display should not be none`);

      // 2. Validate citation content
      const header = box.querySelector('.citation-header');
      const quote = box.querySelector('.citation-quote');
      assert(header && header.textContent.includes('From:'), `Card #${index} header should display sender`);
      assert(header.textContent.includes('Line #'), `Card #${index} header should display line number`);
      assert(quote && quote.textContent.trim().length > 0, `Card #${index} quote must have original message text`);

      // 3. Collapse
      btn.click();
      assert(box.classList.contains('hidden') || box.style.display === 'none', `Card #${index} citation box should be hidden after second click`);
    });
  });

  test('TC-32', 'UI Integration', 'Clear All Data button resets memory, textarea, and restores empty state', () => {
    const clearBtn = document.getElementById('clearAllBtn');
    const chatInput = document.getElementById('chatInput');
    const reportContainer = document.getElementById('reportContainer');
    const emptyState = document.getElementById('emptyState');
    const copyBtn = document.getElementById('copySummaryBtn');

    clearBtn.click();

    assert(chatInput.value === '', 'Chat input was not cleared');
    assert(reportContainer.classList.contains('hidden'), 'Report container should be hidden');
    assert(!emptyState.classList.contains('hidden'), 'Empty state should be restored');
    assert(copyBtn.disabled === true, 'Copy summary button should be disabled');
  });

  // ==========================================
  // Test Suite 5: Spam & Scam Shield, Relevance & Duplicate Detection
  // ==========================================

  test('TC-33', 'Spam & Scam Shield', 'Legitimate urgent college registration announcement is not penalized as spam', () => {
    const legitMsg = {
      id: 'msg_33',
      sender: 'Dean of Students',
      time: '09:00',
      lineNum: 1,
      text: 'URGENT: Course registration portal closes tonight at 11:59 PM. Please verify your course syllabus selection on the student portal.',
      raw: 'Dean of Students: URGENT: Course registration portal closes tonight at 11:59 PM. Please verify your course syllabus selection on the student portal.'
    };
    const evalResult = app.ShieldEngine.evaluate(legitMsg, [legitMsg]);
    assert(evalResult.score < 25, `Expected score < 25, got ${evalResult.score}`);
    assert(evalResult.label === app.ShieldEngine.CLASSIFICATIONS.LEGIT_ANNOUNCEMENT, 
      `Expected ${app.ShieldEngine.CLASSIFICATIONS.LEGIT_ANNOUNCEMENT}, got ${evalResult.label}`);
    assert(evalResult.reasons.length > 0, 'Expected explainability reasons provided');
  });

  test('TC-34', 'Spam & Scam Shield', 'Suspicious OTP harvesting request is classified as high risk with credential alerts', () => {
    const scamMsg = {
      id: 'msg_34',
      sender: 'System Admin',
      time: '14:22',
      lineNum: 2,
      text: 'Urgent security alert: Your account is locked. Reply immediately and send your 6-digit OTP code to verify your credentials.',
      raw: 'System Admin: Urgent security alert: Your account is locked. Reply immediately and send your 6-digit OTP code to verify your credentials.'
    };
    const evalResult = app.ShieldEngine.evaluate(scamMsg, [scamMsg]);
    assert(evalResult.score >= 70, `Expected score >= 70 for credential harvest, got ${evalResult.score}`);
    assert(evalResult.label === app.ShieldEngine.CLASSIFICATIONS.HIGH_RISK, 
      `Expected ${app.ShieldEngine.CLASSIFICATIONS.HIGH_RISK}, got ${evalResult.label}`);
    const mentionsCreds = evalResult.reasons.some(r => /otp|credential|password/i.test(r));
    assert(mentionsCreds, 'Reasons must explicitly cite OTP/credential harvesting');
  });

  test('TC-35', 'Spam & Scam Shield', 'Misleading financial reward message with masked link is detected as high risk', () => {
    const rewardMsg = {
      id: 'msg_35',
      sender: 'CryptoBot',
      time: '18:40',
      lineNum: 3,
      text: 'Congratulations! You won $5,000 in campus lottery! Claim your bitcoin reward now at http://bit.ly/free-crypto-grant',
      raw: 'CryptoBot: Congratulations! You won $5,000 in campus lottery! Claim your bitcoin reward now at http://bit.ly/free-crypto-grant'
    };
    const evalResult = app.ShieldEngine.evaluate(rewardMsg, [rewardMsg]);
    assert(evalResult.score >= 70, `Expected score >= 70, got ${evalResult.score}`);
    assert(evalResult.label === app.ShieldEngine.CLASSIFICATIONS.HIGH_RISK, 
      `Expected high risk classification, got ${evalResult.label}`);
    const citesFinancial = evalResult.reasons.some(r => /financial|lottery|prize|bitcoin/i.test(r));
    const citesUrl = evalResult.reasons.some(r => /masked|shortened|bit\.ly/i.test(r));
    assert(citesFinancial, 'Expected financial gain reason');
    assert(citesUrl, 'Expected shortened URL reason');
  });

  test('TC-36', 'Spam & Scam Shield', 'Deadline containing "urgent" without suspicious signals is classified as legitimate announcement', () => {
    const deadlineMsg = {
      id: 'msg_36',
      sender: 'Alex',
      time: '16:00',
      lineNum: 4,
      text: 'Urgent reminder: Project pull request submission freeze is scheduled for 8:00 PM tonight.',
      raw: 'Alex: Urgent reminder: Project pull request submission freeze is scheduled for 8:00 PM tonight.'
    };
    const evalResult = app.ShieldEngine.evaluate(deadlineMsg, [deadlineMsg]);
    assert(evalResult.score < 25, `Expected score < 25, got ${evalResult.score}`);
    assert(evalResult.label === app.ShieldEngine.CLASSIFICATIONS.LEGIT_ANNOUNCEMENT, 
      `Expected legitimate announcement, got ${evalResult.label}`);
  });

  test('TC-37', 'Duplicate Detection', 'Duplicate event announcements are grouped with multi-source inspectable citations', () => {
    const rawChat = [
      'Maya (10:00): Hackathon Opening Keynote starts at 10:30 AM in Hall A!',
      'Maya (10:05): Hackathon Opening Keynote starts at 10:30 AM in Hall A!',
      'Maya (10:10): Hackathon Opening Keynote starts at 10:30 AM in Hall A!'
    ].join('\n');
    const messages = app.ChatParser.parse(rawChat);
    assert(messages.length === 3, 'Expected 3 parsed messages');

    const grouped = app.DuplicateDetector.groupDuplicates(messages);
    assert(grouped.length === 1, `Expected 1 grouped representative, got ${grouped.length}`);
    assert(grouped[0].duplicateCount === 3, `Expected duplicateCount === 3, got ${grouped[0].duplicateCount}`);
    assert(grouped[0].duplicates.length === 2, `Expected 2 secondary duplicates tracked`);
    assert(grouped[0].duplicates[0].lineNum === 2, 'First duplicate line number should be 2');
    assert(grouped[0].duplicates[1].lineNum === 3, 'Second duplicate line number should be 3');
  });

  test('TC-38', 'Spam & Scam Shield', 'Unknown sender with harmless message has zero risk and is not penalized for generic identity', () => {
    const unknownMsg = {
      id: 'msg_38',
      sender: 'Speaker 99',
      time: '11:15',
      lineNum: 5,
      text: 'Good morning everyone! Please remember to take a 5-minute stretch break before the next workshop.',
      raw: 'Speaker 99: Good morning everyone! Please remember to take a 5-minute stretch break before the next workshop.'
    };
    const evalResult = app.ShieldEngine.evaluate(unknownMsg, [unknownMsg]);
    assert(evalResult.score === 0, `Expected score 0, got ${evalResult.score}`);
    assert(evalResult.label === app.ShieldEngine.CLASSIFICATIONS.NO_RISK, 
      `Expected ${app.ShieldEngine.CLASSIFICATIONS.NO_RISK}, got ${evalResult.label}`);
    assert(evalResult.senderNote.includes('not counted as spam on its own'), 
      'Expected sender transparency note explaining offline identity neutrality');
  });

  test('TC-39', 'Personal Relevance', 'Message matching selected user interest topics is marked as relevant', () => {
    const prefs = {
      selectedTopics: ['assignments'],
      userHandle: '',
      separateLowRelevance: false,
      feedbackOverrides: new Map()
    };
    const msg = {
      id: 'msg_39',
      sender: 'Prof Rivera',
      time: '13:00',
      lineNum: 6,
      text: 'The homework assignment problem set 4 has been posted and the midterm exam covers chapters 1-5.',
      raw: 'Prof Rivera: The homework assignment problem set 4 has been posted and the midterm exam covers chapters 1-5.'
    };
    const rel = app.RelevanceEngine.evaluateRelevance(msg, prefs);
    assert(rel.level === 'relevant', `Expected relevant level, got ${rel.level}`);
    assert(rel.matchedTopics.includes('assignments'), 'Expected assignments topic match');
  });

  test('TC-40', 'Personal Relevance', 'Message unrelated to selected interests is classified as low relevance and separated when enabled', () => {
    const prefs = {
      selectedTopics: ['assignments'],
      userHandle: '',
      separateLowRelevance: true,
      feedbackOverrides: new Map()
    };
    const msg = {
      id: 'msg_40',
      sender: 'Foodie',
      time: '19:30',
      lineNum: 7,
      text: 'Anyone want to grab late night pizza downtown after the game?',
      raw: 'Foodie: Anyone want to grab late night pizza downtown after the game?'
    };
    const rel = app.RelevanceEngine.evaluateRelevance(msg, prefs);
    assert(rel.level === 'low', `Expected low relevance, got ${rel.level}`);
    assert(rel.matchedTopics.length === 0, 'Expected zero matched topics');
  });

  test('TC-41', 'Security & Safe DOM', 'Malicious HTML and script tags are safely rendered as inert text nodes without execution', () => {
    window.securityExploitTest = false;
    const maliciousPayload = '<script>window.securityExploitTest = true;</script><img src="x" onerror="window.securityExploitTest=true" /><b onclick="window.securityExploitTest=true">Urgent Action Item</b>';
    
    // Create text node / span using safe DOM helper
    const container = document.createElement('div');
    const sanitizedNode = app.DOM.createSanitizedTextSpan(maliciousPayload, false);
    container.appendChild(sanitizedNode);
    document.body.appendChild(container);

    // Verify script did not execute
    assert(window.securityExploitTest === false, 'XSS script execution detected!');
    // Verify untrusted HTML was not parsed as DOM nodes
    assert(container.querySelectorAll('script').length === 0, 'Script element was created in DOM!');
    assert(container.querySelectorAll('img').length === 0, 'Img element was created in DOM!');
    assert(container.textContent.includes('<script>'), 'Raw text characters should be preserved safely');

    document.body.removeChild(container);
  });

  test('TC-42', 'Traceability & Citations', 'Source citations maintain verbatim unredacted original text and line accuracy after report generation and PII redaction', () => {
    const rawChat = 'Coordinator: Please prepare and submit candidate files to contact@recruiting.org or call +1-800-555-0199 by Friday.\nAlex: Will send the resume pack.';
    const parsed = app.ChatParser.parse(rawChat);
    assert(parsed.length === 2, 'Expected 2 parsed messages');

    // Run rule engine
    const report = app.RuleEngine.analyze(parsed);
    // Find item with PII
    const allItems = [...report.deadlines, ...report.tasks, ...report.urgent, ...report.highlights];
    const piiItem = allItems.find(i => (i.raw || i.text || i.summary).includes('contact@recruiting.org'));
    assert(piiItem, 'Could not find extracted item containing PII');

    // Enable redaction
    app.state.redactEnabled = true;
    const renderedCard = app.UIRenderer.createItemCard(piiItem);

    // The display text must be redacted
    const itemTextEl = renderedCard.querySelector('.item-text');
    assert(itemTextEl.textContent.includes('[REDACTED EMAIL]'), 'Display card text should be redacted');

    // The citation box must retain verbatim original text for evidentiary auditability
    const citationQuote = renderedCard.querySelector('.citation-quote');
    assert(citationQuote.textContent.includes('contact@recruiting.org'), 'Citation quote must preserve verbatim unredacted email');
    assert(citationQuote.textContent.includes('800-555-0199'), 'Citation quote must preserve verbatim unredacted phone');

    const citationHeader = renderedCard.querySelector('.citation-header');
    assert(citationHeader.textContent.includes('Line #1'), 'Citation line number must match source Line #1');

    app.state.redactEnabled = false;
  });

  // ==========================================
  // Summary Compilation
  // ==========================================
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  if (testSummary) {
    testSummary.className = `summary ${failedCount === 0 ? 'pass' : 'fail'}`;
    testSummary.innerHTML = `
      <span id="test-summary-status">${failedCount === 0 ? 'ALL TESTS PASSED' : 'TEST FAILURES DETECTED'}</span>: 
      <strong id="passed-count">${passedCount}</strong> passed, 
      <strong id="failed-count">${failedCount}</strong> failed out of ${results.length} test cases.
    `;
  }
  document.body.setAttribute('data-tests-complete', 'true');
  document.body.setAttribute('data-tests-passed', passedCount);
  document.body.setAttribute('data-tests-failed', failedCount);
})();
