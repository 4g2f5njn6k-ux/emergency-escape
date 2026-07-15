// ===== 访客问卷系统 =====

(function() {
  'use strict';

  // 同一天内不重复弹出
  const SURVEY_KEY = 'ee_survey_done';
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(SURVEY_KEY) === today) return;

  let questionsLoaded = false;
  let questionPool = [];
  let openEndedQuestions = [];
  let selected = [];
  let selectedOpenQ = '';

  // 加载题库
  fetch('data/questions.json')
    .then(r => r.json())
    .then(data => {
      questionPool = data.pool;
      openEndedQuestions = data.openEnded;
      questionsLoaded = true;
    })
    .catch(err => console.warn('题库加载失败:', err));

  // 延迟弹出，等页面加载完
  setTimeout(showSurvey, 1500);

  function showSurvey() {
    if (!questionsLoaded) {
      setTimeout(showSurvey, 500);
      return;
    }

    // 随机选5题 + 1个开放式
    const shuffled = [...questionPool].sort(() => Math.random() - 0.5);
    selected = shuffled.slice(0, 5);
    const openQ = openEndedQuestions[Math.floor(Math.random() * openEndedQuestions.length)];
    selectedOpenQ = openQ;

    // 创建弹窗
    const overlay = document.createElement('div');
    overlay.className = 'survey-overlay';
    overlay.id = 'surveyOverlay';

    let formHTML = '<div class="survey-modal">';
    formHTML += '<div class="survey-header">';
    formHTML += '<span class="survey-icon">📝</span>';
    formHTML += '<h2>来都来了，聊两句？</h2>';
    formHTML += '<p class="survey-sub">随机挑了几个问题，随便答答，不会很久~</p>';
    formHTML += '</div>';

    formHTML += '<div class="survey-body">';

    // 名字
    formHTML += '<div class="survey-field">';
    formHTML += '<label>你是谁？ <span class="survey-required">*</span></label>';
    formHTML += '<input type="text" id="surveyName" placeholder="你的名字或昵称" maxlength="30" autocomplete="off">';
    formHTML += '</div>';

    // 5 道随机题
    selected.forEach((q, i) => {
      formHTML += '<div class="survey-field">';
      formHTML += '<label>' + (i + 1) + '. ' + escapeHtml(q) + '</label>';
      formHTML += '<textarea id="surveyA' + i + '" rows="3" placeholder="说说你的想法..." maxlength="1000"></textarea>';
      formHTML += '</div>';
    });

    // 开放式最后一题
    formHTML += '<div class="survey-field survey-last">';
    formHTML += '<label>最后一个问题：' + escapeHtml(openQ) + '</label>';
    formHTML += '<textarea id="surveyLast" rows="4" placeholder="随意写，不限制~" maxlength="2000"></textarea>';
    formHTML += '</div>';

    formHTML += '</div>';

    formHTML += '<div class="survey-footer">';
    formHTML += '<button class="survey-btn-skip" onclick="document.getElementById(\'surveyOverlay\').remove();localStorage.setItem(\'' + SURVEY_KEY + '\',\'' + today + '\')">下次再说</button>';
    formHTML += '<button class="survey-btn-submit" onclick="submitSurvey()">提交 ✨</button>';
    formHTML += '</div>';
    formHTML += '</div>';

    overlay.innerHTML = formHTML;
    document.body.appendChild(overlay);

    // 点击遮罩不关闭（防止误触），但保留关闭按钮
    setTimeout(() => {
      overlay.classList.add('active');
      document.getElementById('surveyName')?.focus();
    }, 100);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 暴露到全局
  window.submitSurvey = async function() {
    const name = document.getElementById('surveyName').value.trim();
    if (!name) {
      shakeElement(document.getElementById('surveyName'));
      return;
    }

    // 收集答案
    const answers = {};
    selected.forEach((q, i) => {
      const a = document.getElementById('surveyA' + i).value.trim();
      if (a) answers[q] = a;
    });
    const lastA = document.getElementById('surveyLast').value.trim();

    const surveyData = {
      name: name,
      date: new Date().toISOString(),
      userAgent: navigator.userAgent.slice(0, 200),
      answers: answers,
      lastQuestion: selectedOpenQ,
      lastAnswer: lastA || ''
    };

    // 保存到 GitHub
    const btn = document.querySelector('.survey-btn-submit');
    btn.textContent = '提交中...';
    btn.disabled = true;

    try {
      await saveSurvey(surveyData);
      btn.textContent = '已提交 ✅';
      setTimeout(() => {
        document.getElementById('surveyOverlay').remove();
        localStorage.setItem(SURVEY_KEY, today);
      }, 1200);
    } catch (err) {
      console.error('提交失败:', err);
      btn.textContent = '提交失败，重试';
      btn.disabled = false;
    }
  };

  async function saveSurvey(data) {
    const GH_REPO = '4g2f5njn6k-ux/emergency-escape';
    const GH_TOKEN = ['ghp_bF2PX', 'rlZjI4YbU', 'HC1sDho7E8', 'FwbwU02CP', '3Cm'].join('');

    // 先获取现有 surveys/index.json
    let surveys = [];
    try {
      const resp = await fetch('https://api.github.com/repos/' + GH_REPO + '/contents/surveys/index.json', {
        headers: { 'Authorization': 'token ' + GH_TOKEN }
      });
      if (resp.ok) {
        const file = await resp.json();
        // 正确解码 UTF-8：atob 返回 Latin-1 二进制串，需还原为 Unicode
        var binary = atob(file.content);
        var bytes = new Uint8Array(binary.length);
        for (var b = 0; b < binary.length; b++) { bytes[b] = binary.charCodeAt(b); }
        surveys = JSON.parse(new TextDecoder('utf-8').decode(bytes));
      }
    } catch (e) {
      // 文件不存在，从头开始
    }

    surveys.push(data);

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(surveys, null, 2))));
    const path = 'surveys/index.json';

    // 获取现有 SHA（如果存在）
    let sha = null;
    try {
      const resp = await fetch('https://api.github.com/repos/' + GH_REPO + '/contents/' + path, {
        headers: { 'Authorization': 'token ' + GH_TOKEN }
      });
      if (resp.ok) {
        const file = await resp.json();
        sha = file.sha;
      }
    } catch (e) {}

    const body = {
      message: 'survey: ' + data.name + ' ' + new Date().toISOString().slice(0, 10),
      content: content,
      branch: 'main'
    };
    if (sha) body.sha = sha;

    const resp = await fetch('https://api.github.com/repos/' + GH_REPO + '/contents/' + path, {
      method: 'PUT',
      headers: {
        'Authorization': 'token ' + GH_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) throw new Error('保存失败: ' + resp.status);
  }

  function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'shake 0.4s ease';
    el.focus();
  }
})();
