/* ================================================
   ai-chat-history.js
   채팅 세션 히스토리 관리 (Supabase + localStorage fallback)
   ================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'gm_ai_sessions';
  var MAX_LOCAL = 30;
  var TABLE = 'ai_chat_sessions';

  var _sessions = [];
  var _activeSessionId = null;
  var _isLoggedIn = false;
  var _userId = null;
  var _supabase = null;
  var _initialized = false;

  function _jsBase() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      if (src.indexOf('ai-chat-history.js') !== -1) {
        return src.replace(/ai-chat-history\.js.*$/, '');
      }
    }
    return document.body.classList.contains('m-shell') ? '../js/' : 'js/';
  }

  function _logoSrc() {
    return 'assets/gmlogo.png';
  }

  async function _initAuth() {
    try {
      var mod = await import(_jsBase() + 'supabase_client.js');
      _supabase = mod.supabase;
      var res = await _supabase.auth.getSession();
      var user = res.data && res.data.session && res.data.session.user;
      _isLoggedIn = !!user;
      _userId = user ? user.id : null;
      if (user) window.currentUser = user;
    } catch (e) {
      _isLoggedIn = false;
      _userId = null;
    }
  }

  function _renderPanel() {
    var panel = document.getElementById('aiHistPanel');
    if (!panel) return;

    if (!document.getElementById('aiHistOverlay')) {
      var overlay = document.createElement('div');
      overlay.className = 'ai-hist-overlay';
      overlay.id = 'aiHistOverlay';
      var wrap = document.querySelector('.ai-page-wrap');
      if (wrap) wrap.appendChild(overlay);
      overlay.addEventListener('click', _closeMobilePanel);
    }
  }

  function _bindEvents() {
    var newBtn = document.getElementById('aiHistNewBtn');
    if (newBtn) newBtn.addEventListener('click', function () { window.newAIChat(); });

    var toggle = document.getElementById('aiHistToggle');
    if (toggle) toggle.addEventListener('click', _toggleMobilePanel);
  }

  function _wrapFunctions() {
    if (window.__gmAiHistWrapped) return;
    window.__gmAiHistWrapped = true;

    var _origNew = window.newAIChat;
    window._origNewAIChat = _origNew;
    window.newAIChat = function () {
      _saveCurrentSession();
      _activeSessionId = null;
      if (typeof _origNew === 'function') _origNew();
      _highlightActiveSession();
    };

    var _origSend = window.sendAIMessage;
    window.sendAIMessage = async function () {
      if (typeof _origSend === 'function') await _origSend.apply(this, arguments);
      _saveCurrentSession();
    };
  }

  function _toggleMobilePanel() {
    var panel = document.getElementById('aiHistPanel');
    var overlay = document.getElementById('aiHistOverlay');
    if (!panel) return;
    var isOpen = panel.classList.contains('open');
    panel.classList.toggle('open', !isOpen);
    if (overlay) overlay.classList.toggle('open', !isOpen);
  }

  function _closeMobilePanel() {
    var panel = document.getElementById('aiHistPanel');
    var overlay = document.getElementById('aiHistOverlay');
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  async function _loadSessions() {
    if (_isLoggedIn && _supabase && _userId) {
      await _loadFromSupabase();
    } else {
      _loadFromLocal();
    }
  }

  function _loadFromLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      _sessions = raw ? JSON.parse(raw) : [];
    } catch (e) {
      _sessions = [];
    }
    _renderSessionList();
  }

  async function _loadFromSupabase() {
    if (!_userId || !_supabase) { _loadFromLocal(); return; }
    try {
      var res = await _supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', _userId)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (res.error) { _loadFromLocal(); return; }
      _sessions = (res.data || []).map(function (row) {
        return {
          id: row.id,
          title: row.title || '새 채팅',
          messages: row.messages || [],
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      });
      _renderSessionList();
    } catch (e) {
      _loadFromLocal();
    }
  }

  function _collectMessages() {
    var msgs = [];
    var container = document.getElementById('ai-messages');
    if (!container) return msgs;

    container.querySelectorAll('.msg-user, .msg-ai').forEach(function (el) {
      if (el.id === 'welcome-msg') return;
      var isUser = el.classList.contains('msg-user');
      var textEl = isUser
        ? el.querySelector('.msg-user-bubble')
        : el.querySelector('.msg-ai-bubble');
      if (!textEl) return;
      var text = (textEl.innerText || textEl.textContent || '').trim();
      if (!text) return;
      msgs.push({ role: isUser ? 'user' : 'assistant', content: text });
    });
    return msgs;
  }

  function _saveCurrentSession() {
    var messages = _collectMessages();
    if (!messages.length) return;

    var firstUser = messages.find(function (m) { return m.role === 'user'; });
    var title = firstUser
      ? firstUser.content.slice(0, 20) + (firstUser.content.length > 20 ? '…' : '')
      : '새 채팅';

    var now = new Date().toISOString();

    if (_activeSessionId) {
      var idx = _sessions.findIndex(function (s) { return s.id === _activeSessionId; });
      if (idx !== -1) {
        _sessions[idx].messages = messages;
        _sessions[idx].title = title;
        _sessions[idx].updatedAt = now;
      }
    } else {
      var newId = 'sess_' + Date.now();
      _activeSessionId = newId;
      _sessions.unshift({
        id: newId,
        title: title,
        messages: messages,
        createdAt: now,
        updatedAt: now
      });
      if (!_isLoggedIn && _sessions.length > MAX_LOCAL) {
        _sessions = _sessions.slice(0, MAX_LOCAL);
      }
    }

    _persistSessions();
    _renderSessionList();
    _highlightActiveSession();
  }

  function _resetChatView() {
    var container = document.getElementById('ai-messages');
    if (container) {
      container.querySelectorAll('.msg-user, .msg-ai:not(#welcome-msg)').forEach(function (el) {
        el.remove();
      });
      var welcome = document.getElementById('welcome-msg');
      if (welcome) welcome.style.display = '';
    }
    var examples = document.getElementById('ai-examples');
    if (examples) examples.style.display = '';
    var input = document.getElementById('ai-input');
    if (input && typeof window.handleInputChange === 'function') {
      input.value = '';
      window.handleInputChange(input);
    }
    try {
      var url = new URL(window.location.href);
      url.searchParams.delete('q');
      window.history.replaceState({}, '', url.pathname + url.search);
    } catch (e) { /* ignore */ }
  }

  function _loadSession(sessionId) {
    var session = _sessions.find(function (s) { return s.id === sessionId; });
    if (!session) return;

    _activeSessionId = sessionId;
    _closeMobilePanel();
    _resetChatView();

    var welcome = document.getElementById('welcome-msg');
    if (welcome) welcome.style.display = 'none';
    var examples = document.getElementById('ai-examples');
    if (examples) examples.style.display = 'none';

    session.messages.forEach(function (msg) {
      _appendRestoredMessage(msg.role, msg.content);
    });

    _highlightActiveSession();
  }

  function _appendRestoredMessage(role, content) {
    var container = document.getElementById('ai-messages');
    if (!container) return;

    var div = document.createElement('div');
    if (role === 'user') {
      div.className = 'msg-user';
      div.innerHTML = '<div class="msg-user-bubble">' + _escapeHtml(content) + '</div>';
    } else {
      div.className = 'msg-ai';
      div.innerHTML =
        '<div class="msg-ai-av"><img src="' + _logoSrc() + '" alt="골목대장" class="ai-av-img" width="34" height="34"></div>' +
        '<div class="msg-ai-body">' +
          '<div class="msg-ai-name">골목대장 AI</div>' +
          '<div class="msg-ai-bubble">' + _escapeHtml(content).replace(/\n/g, '<br>') + '</div>' +
        '</div>';
    }
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function _deleteSession(sessionId, e) {
    if (e) e.stopPropagation();
    if (!confirm('이 채팅을 삭제할까요?')) return;

    _sessions = _sessions.filter(function (s) { return s.id !== sessionId; });

    if (_activeSessionId === sessionId) {
      _activeSessionId = null;
      _resetChatView();
    }

    _persistSessions();
    _renderSessionList();

    if (_isLoggedIn && _supabase) {
      _supabase.from(TABLE).delete().eq('id', sessionId).then(function () {});
    }
  }

  function _persistSessions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_sessions));
    } catch (e) { /* ignore */ }

    if (!_isLoggedIn || !_supabase || !_userId) return;

    _sessions.forEach(function (sess) {
      _supabase.from(TABLE).upsert({
        id: sess.id,
        user_id: _userId,
        title: sess.title,
        messages: sess.messages,
        created_at: sess.createdAt,
        updated_at: sess.updatedAt
      }, { onConflict: 'id' }).then(function () {});
    });
  }

  function _renderSessionList() {
    var list = document.getElementById('aiHistList');
    var empty = document.getElementById('aiHistEmpty');
    if (!list) return;

    if (!_isLoggedIn) {
      var ctaId = 'aiHistLoginCta';
      if (!document.getElementById(ctaId)) {
        var cta = document.createElement('div');
        cta.className = 'ai-hist-login-cta';
        cta.id = ctaId;
        cta.innerHTML =
          '<p>로그인하면 채팅 기록이<br>영구 저장됩니다</p>' +
          '<button type="button" class="ai-hist-login-btn" id="aiHistLoginBtn">' +
          '<i class="ti ti-login"></i> 로그인</button>';
        list.insertBefore(cta, list.firstChild);
        cta.querySelector('#aiHistLoginBtn').addEventListener('click', function () {
          if (typeof window.openLoginModal === 'function') window.openLoginModal();
        });
      }
    } else {
      var oldCta = document.getElementById('aiHistLoginCta');
      if (oldCta) oldCta.remove();
    }

    list.querySelectorAll('.ai-hist-group-label, .ai-hist-item').forEach(function (el) {
      el.remove();
    });

    if (!_sessions.length) {
      if (empty) empty.style.display = 'flex';
      return;
    }

    if (empty) empty.style.display = 'none';

    var groups = _groupByDate(_sessions);
    Object.keys(groups).forEach(function (label) {
      var lbl = document.createElement('div');
      lbl.className = 'ai-hist-group-label';
      lbl.textContent = label;
      list.appendChild(lbl);

      groups[label].forEach(function (sess) {
        var item = document.createElement('div');
        item.className = 'ai-hist-item' + (sess.id === _activeSessionId ? ' active' : '');
        item.dataset.sessionId = sess.id;
        item.innerHTML =
          '<div class="ai-hist-item-icon"><i class="ti ti-message" aria-hidden="true"></i></div>' +
          '<div class="ai-hist-item-body">' +
            '<div class="ai-hist-item-title">' + _escapeHtml(sess.title) + '</div>' +
            '<div class="ai-hist-item-time">' + _relativeTime(sess.updatedAt) + '</div>' +
          '</div>' +
          '<button type="button" class="ai-hist-item-del" data-id="' + sess.id + '" aria-label="삭제">' +
          '<i class="ti ti-trash" aria-hidden="true"></i></button>';

        item.addEventListener('click', function () { _loadSession(sess.id); });
        item.querySelector('.ai-hist-item-del').addEventListener('click', function (ev) {
          _deleteSession(sess.id, ev);
        });
        list.appendChild(item);
      });
    });
  }

  function _highlightActiveSession() {
    document.querySelectorAll('.ai-hist-item').forEach(function (el) {
      el.classList.toggle('active', el.dataset.sessionId === _activeSessionId);
    });
  }

  function _groupByDate(sessions) {
    var now = new Date();
    var today = _dayStart(now);
    var yest = _dayStart(new Date(now - 86400000));
    var week = _dayStart(new Date(now - 6 * 86400000));
    var month = _dayStart(new Date(now - 29 * 86400000));
    var groups = {};

    sessions.forEach(function (sess) {
      var d = new Date(sess.updatedAt || sess.createdAt);
      var label;
      if (d >= today) label = '오늘';
      else if (d >= yest) label = '어제';
      else if (d >= week) label = '이번 주';
      else if (d >= month) label = '이번 달';
      else label = '오래된 채팅';

      if (!groups[label]) groups[label] = [];
      groups[label].push(sess);
    });
    return groups;
  }

  function _dayStart(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function _relativeTime(isoStr) {
    if (!isoStr) return '';
    var diff = Math.floor((Date.now() - new Date(isoStr)) / 1000);
    if (diff < 60) return '방금 전';
    if (diff < 3600) return Math.floor(diff / 60) + '분 전';
    if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
    if (diff < 2592000) return Math.floor(diff / 86400) + '일 전';
    return new Date(isoStr).toLocaleDateString('ko-KR');
  }

  function _escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async function init() {
    if (_initialized) return;
    if (!document.getElementById('aiHistPanel')) return;
    if (typeof window.sendAIMessage !== 'function') return;
    _initialized = true;

    _renderPanel();
    await _initAuth();
    _bindEvents();
    _wrapFunctions();
    await _loadSessions();
  }

  function tryInit() {
    init().catch(function (e) { console.warn('[ai-chat-history]', e); });
  }

  document.addEventListener('gm-shell-ready', tryInit);
  if (document.body.dataset.gmShellDone === '1') tryInit();
  else setTimeout(tryInit, 600);
})();
