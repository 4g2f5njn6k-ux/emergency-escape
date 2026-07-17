/**
 * Emergency Escape — 音乐播放器 v2
 * 网易云歌单 | 随机播放 | 浮动面板 | 自动播放
 *
 * 修复:
 * - 使用 /api/audio/ 代理解决 HTTP→HTTPS 混合内容拦截
 * - 简化 togglePlay 去掉有 bug 的 readyState 检查
 * - 置顶歌曲从 deployed 文件 (EE_PINNED_SONG) 读取，不再是 localStorage
 * - 打开页面自动尝试播放（符合现代浏览器交互策略）
 */
(function () {
  'use strict';

  var playlist = [];
  var shuffled = [];
  var currentIndex = 0;
  var isPlaying = false;
  var audio = null;
  var playerBtn = null;
  var playerPanel = null;
  var panelVisible = false;
  var wantToPlay = false;
  var pinnedSong = null;   // 从 EE_PINNED_SONG 全局变量读取
  var interactionRetryInstalled = false;

  // ========== 置顶歌曲 ==========

  function loadPinnedSong() {
    // 优先从部署文件读取（所有访客都能拿到）
    if (typeof EE_PINNED_SONG !== 'undefined' && EE_PINNED_SONG && EE_PINNED_SONG.id) {
      var p = EE_PINNED_SONG;
      if (!p.until) return p;
      if (Date.now() > new Date(p.until).getTime()) return null; // 过期
      return p;
    }
    // 回退：管理员自己的 localStorage（兼容旧逻辑）
    try {
      var raw = localStorage.getItem('ee_pinned_song');
      if (!raw) return null;
      var lp = JSON.parse(raw);
      if (!lp.id || !lp.until) return null;
      if (Date.now() > new Date(lp.until).getTime()) {
        localStorage.removeItem('ee_pinned_song');
        return null;
      }
      return lp;
    } catch (e) {
      return null;
    }
  }

  // ========== DOM 构建 ==========

  function buildPlayer() {
    playerBtn = document.createElement('button');
    playerBtn.className = 'music-btn';
    playerBtn.innerHTML = '<span class="music-btn-icon">&#9835;</span>';
    playerBtn.title = '播放音乐';
    playerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      togglePanel();
    });
    document.body.appendChild(playerBtn);

    playerPanel = document.createElement('div');
    playerPanel.className = 'music-panel';
    playerPanel.innerHTML =
      '<div class="music-panel-inner">' +
        '<div class="music-cover-wrap">' +
          '<img class="music-cover" src="" alt="" />' +
          '<div class="music-disc"></div>' +
        '</div>' +
        '<div class="music-info">' +
          '<div class="music-name">随机播放中...</div>' +
          '<div class="music-artist">Tomamato_喜欢的音乐</div>' +
        '</div>' +
        '<div class="music-controls">' +
          '<button class="music-ctrl music-prev" title="上一首">&#9664;&#9664;</button>' +
          '<button class="music-ctrl music-play" title="播放">&#9654;</button>' +
          '<button class="music-ctrl music-next" title="下一首">&#9654;&#9654;</button>' +
        '</div>' +
      '</div>' +
      '<div class="music-progress-wrap">' +
        '<span class="music-time music-time-current">00:00</span>' +
        '<div class="music-progress"><div class="music-progress-bar"><div class="music-progress-thumb"></div></div></div>' +
        '<span class="music-time music-time-duration">00:00</span>' +
      '</div>';

    document.body.appendChild(playerPanel);

    playerPanel.querySelector('.music-play').addEventListener('click', togglePlay);
    playerPanel.querySelector('.music-next').addEventListener('click', function () { wantToPlay = isPlaying; skipSong(1); });
    playerPanel.querySelector('.music-prev').addEventListener('click', function () { wantToPlay = isPlaying; skipSong(-1); });

    bindProgressEvents();
    setInterval(updateProgress, 500);
  }

  // ========== 面板显隐 ==========

  function togglePanel() {
    panelVisible = !panelVisible;
    if (panelVisible) {
      playerPanel.classList.add('visible');
      playerBtn.classList.add('active');
      refreshCoverAnim();
    } else {
      playerPanel.classList.remove('visible');
      playerBtn.classList.remove('active');
    }
  }

  // ========== Audio 初始化 ==========

  function ensureAudio() {
    if (audio) return;
    audio = new Audio();
    audio.volume = 0.8;
    audio.preload = 'auto';

    audio.addEventListener('canplay', function () {
      if (wantToPlay) {
        var p = audio.play();
        if (p) p.catch(function () {});
      }
    });

    audio.addEventListener('ended', function () {
      // 置顶有效 → 单曲循环
      if (pinnedSong && pinnedSong.id) {
        pinnedSong = loadPinnedSong();
        if (pinnedSong && pinnedSong.id === shuffled[currentIndex].id) {
          wantToPlay = true;
          audio.currentTime = 0;
          var p = audio.play();
          if (p) p.catch(function () {});
          return;
        }
      }
      wantToPlay = true;
      skipSong(1);
    });

    audio.addEventListener('error', function () {
      if (shuffled.length && shuffled[currentIndex]) {
        deadSongs[shuffled[currentIndex].id] = true;
      }
      if (wantToPlay) {
        setTimeout(function () { skipSong(1); }, 400);
      }
    });

    audio.addEventListener('play', function () {
      isPlaying = true;
      refreshPlayBtn();
      refreshCoverAnim();
      // 正在播放时，让浮动按钮也亮起来
      if (playerBtn) playerBtn.classList.add('playing');
    });

    audio.addEventListener('pause', function () {
      isPlaying = false;
      refreshPlayBtn();
      refreshCoverAnim();
      if (playerBtn) playerBtn.classList.remove('playing');
    });
  }

  // ========== 缓存 ==========

  var audioUrlCache = {};
  var deadSongs = {};

  function getAudioUrl(songId) {
    if (audioUrlCache[songId]) return audioUrlCache[songId];
    // 使用 Cloudflare Pages Function 代理，自动升级 HTTP→HTTPS
    var url = '/api/audio/' + songId;
    audioUrlCache[songId] = url;
    return url;
  }

  // ========== 加载歌曲 ==========

  function loadSong(index) {
    if (!shuffled.length) return;
    var song = shuffled[index];

    if (deadSongs[song.id]) {
      skipSong(1);
      return;
    }

    ensureAudio();
    audio.src = getAudioUrl(song.id);
    audio.load();

    // 更新 UI
    var cover = playerPanel.querySelector('.music-cover');
    cover.src = song.pic || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#2D5A3F" width="100" height="100"/><text x="50" y="58" text-anchor="middle" fill="#F0E4C8" font-size="40">&#9835;</text></svg>');
    playerPanel.querySelector('.music-name').textContent = song.name;
    playerPanel.querySelector('.music-artist').textContent = song.artist;
    playerPanel.querySelector('.music-progress-bar').style.width = '0%';
    playerPanel.querySelector('.music-time-current').textContent = '00:00';
    playerPanel.querySelector('.music-time-duration').textContent = '00:00';
  }

  // ========== 控制 ==========

  function skipSong(delta) {
    if (!shuffled.length) return;
    currentIndex = (currentIndex + delta + shuffled.length) % shuffled.length;
    loadSong(currentIndex);
  }

  function togglePlay() {
    if (!shuffled.length) return;
    ensureAudio();

    if (isPlaying) {
      wantToPlay = false;
      audio.pause();
    } else {
      wantToPlay = true;
      // 如果还没加载过任何歌曲，先加载
      if (!audio.src || audio.currentSrc === window.location.href) {
        loadSong(currentIndex);
        // canplay 事件会自动播放
      } else {
        var p = audio.play();
        if (p) p.catch(function () {
          // 播放被浏览器拦截，等交互后重试
          installInteractionRetry();
        });
      }
    }
  }

  function refreshPlayBtn() {
    var btn = playerPanel.querySelector('.music-play');
    if (!btn) return;
    btn.innerHTML = isPlaying ? '&#9646;&#9646;' : '&#9654;';
  }

  function refreshCoverAnim() {
    var cover = playerPanel.querySelector('.music-cover');
    if (!cover) return;
    cover.style.animation = 'none';
    cover.offsetHeight;
    if (isPlaying) {
      cover.style.animation = 'musicSpin 12s linear infinite';
    }
  }

  // ========== 进度条 ==========

  var seeking = false;

  function formatTime(sec) {
    if (!sec || isNaN(sec)) return '00:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  function updateProgress() {
    if (!audio || !audio.duration || isNaN(audio.duration)) return;
    if (seeking) return;
    var pct = Math.min((audio.currentTime / audio.duration) * 100, 100);
    var bar = playerPanel.querySelector('.music-progress-bar');
    if (bar) bar.style.width = pct + '%';
    var curEl = playerPanel.querySelector('.music-time-current');
    var durEl = playerPanel.querySelector('.music-time-duration');
    if (curEl) curEl.textContent = formatTime(audio.currentTime);
    if (durEl) durEl.textContent = formatTime(audio.duration);
  }

  function getProgressFromEvent(e) {
    var rect = playerPanel.querySelector('.music-progress').getBoundingClientRect();
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function seekStart(e) {
    e.preventDefault();
    seeking = true;
    var bar = playerPanel.querySelector('.music-progress-bar');
    if (bar) bar.style.transition = 'none';
    seekMove(e);
  }

  function seekMove(e) {
    if (!seeking) return;
    var pct = getProgressFromEvent(e);
    var bar = playerPanel.querySelector('.music-progress-bar');
    if (bar) bar.style.width = (pct * 100) + '%';
    var curEl = playerPanel.querySelector('.music-time-current');
    if (curEl && audio && audio.duration) {
      curEl.textContent = formatTime(pct * audio.duration);
    }
  }

  function seekEnd(e) {
    if (!seeking) return;
    seeking = false;
    var pct = getProgressFromEvent(e);
    var bar = playerPanel.querySelector('.music-progress-bar');
    if (bar) {
      bar.style.width = (pct * 100) + '%';
      bar.style.transition = 'width 0.3s linear';
    }
    if (audio && audio.duration) {
      audio.currentTime = pct * audio.duration;
      if (wantToPlay) {
        var p = audio.play();
        if (p) p.catch(function () {});
      }
    }
  }

  function bindProgressEvents() {
    var prog = playerPanel.querySelector('.music-progress');
    if (!prog) return;

    prog.addEventListener('click', function (e) {
      if (!audio || !audio.duration || isNaN(audio.duration)) return;
      var pct = getProgressFromEvent(e);
      audio.currentTime = pct * audio.duration;
      var bar = playerPanel.querySelector('.music-progress-bar');
      if (bar) bar.style.width = (pct * 100) + '%';
      if (wantToPlay) {
        var p = audio.play();
        if (p) p.catch(function () {});
      }
    });

    prog.addEventListener('mousedown', seekStart);
    prog.addEventListener('touchstart', seekStart, { passive: false });

    document.addEventListener('mousemove', function (e) { if (seeking) { e.preventDefault(); seekMove(e); } });
    document.addEventListener('touchmove', function (e) { if (seeking) { e.preventDefault(); seekMove(e); } }, { passive: false });
    document.addEventListener('mouseup', function (e) { if (seeking) seekEnd(e); });
    document.addEventListener('touchend', function (e) { if (seeking) seekEnd(e); });
  }

  // ========== 自动播放 + 浏览器交互策略 ==========

  function installInteractionRetry() {
    if (interactionRetryInstalled) return;
    interactionRetryInstalled = true;

    function retryPlay(e) {
      if (!wantToPlay || isPlaying) return;
      if (!audio || !audio.src) return;
      var p = audio.play();
      if (p) p.catch(function () {}); // 静默失败
      if (isPlaying) {
        document.removeEventListener('click', retryPlay);
        document.removeEventListener('touchstart', retryPlay);
        document.removeEventListener('keydown', retryPlay);
      }
    }

    document.addEventListener('click', retryPlay);
    document.addEventListener('touchstart', retryPlay);
    document.addEventListener('keydown', retryPlay);
  }

  function tryAutoPlay() {
    wantToPlay = true;
    ensureAudio();

    // 如果没有 src，等 canplay
    if (!audio.src || audio.currentSrc === window.location.href) {
      return; // canplay 事件会自动播放
    }

    var p = audio.play();
    if (p) {
      p.catch(function () {
        // 浏览器拦截了自动播放，等用户第一次交互后重试
        installInteractionRetry();
      });
    }
  }

  // ========== 初始化 ==========

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function init() {
    buildPlayer();
    try {
      if (typeof MUSIC_PLAYLIST !== 'undefined' && MUSIC_PLAYLIST.length) {
        playlist = MUSIC_PLAYLIST;
        shuffled = shuffle(playlist);

        // 检查置顶歌曲（从部署文件读取）
        pinnedSong = loadPinnedSong();
        if (pinnedSong && pinnedSong.id) {
          var found = -1;
          for (var i = 0; i < shuffled.length; i++) {
            if (shuffled[i].id === pinnedSong.id) { found = i; break; }
          }
          if (found >= 0) {
            currentIndex = found;
            var pinned = shuffled.splice(found, 1)[0];
            shuffled.unshift(pinned);
            currentIndex = 0;
          }
        }

        // 先加载歌曲
        loadSong(currentIndex);

        // 自动播放（不管是置顶还是随机）
        // 延迟一下让 loader 动画先展示完
        setTimeout(function () {
          tryAutoPlay();
        }, 1200);

      } else {
        throw new Error('Empty playlist');
      }
    } catch (e) {
      playerPanel.querySelector('.music-name').textContent = '歌单加载失败';
      playerPanel.querySelector('.music-artist').textContent = '请检查网络连接';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
