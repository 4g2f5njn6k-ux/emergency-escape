/**
 * Emergency Escape — 音乐播放器
 * 网易云歌单 | 随机播放 | 浮动面板
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
  var wantToPlay = false; // 用户是否期望播放（用于处理切歌后续播）
  var pinnedSong = null;   // { id, until } — 置顶歌曲

  // ========== 置顶歌曲检查 ==========

  function loadPinnedSong() {
    try {
      var raw = localStorage.getItem('ee_pinned_song');
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p.id || !p.until) return null;
      if (Date.now() > new Date(p.until).getTime()) {
        // 过期
        localStorage.removeItem('ee_pinned_song');
        return null;
      }
      return p;
    } catch (e) {
      return null;
    }
  }

  // ========== DOM 构建 ==========

  function buildPlayer() {
    // 浮动按钮
    playerBtn = document.createElement('button');
    playerBtn.className = 'music-btn';
    playerBtn.innerHTML = '<span class="music-btn-icon">&#9835;</span>';
    playerBtn.title = '播放音乐';
    playerBtn.addEventListener('click', togglePanel);
    document.body.appendChild(playerBtn);

    // 播放面板
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

    // 加载好就能播
    audio.addEventListener('canplay', function () {
      if (wantToPlay) {
        var p = audio.play();
        if (p) p.catch(function () {});
      }
    });

    // 播完：如果置顶歌曲有效则单曲循环，否则随机切歌
    audio.addEventListener('ended', function () {
      if (pinnedSong && pinnedSong.id) {
        // 再次确认置顶未过期
        pinnedSong = loadPinnedSong();
        if (pinnedSong && pinnedSong.id === shuffled[currentIndex].id) {
          // 单曲循环
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

    // 播放出错，标记并跳过
    audio.addEventListener('error', function () {
      // 标记无法播放的歌曲，不再反复重试
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
    });

    audio.addEventListener('pause', function () {
      isPlaying = false;
      refreshPlayBtn();
      refreshCoverAnim();
    });
  }

  // ========== 缓存 ==========

  var audioUrlCache = {};
  var deadSongs = {}; // 记录无法播放的歌曲 ID，避免反复重试

  function getAudioUrl(songId) {
    if (audioUrlCache[songId]) return audioUrlCache[songId];
    // 网易云官方外链播放地址，比第三方代理稳定得多
    var url = 'https://music.163.com/song/media/outer/url?id=' + songId + '.mp3';
    audioUrlCache[songId] = url;
    return url;
  }

  // ========== 加载歌曲 ==========

  function loadSong(index) {
    if (!shuffled.length) return;
    var song = shuffled[index];

    // 这首歌之前就没放出来，直接跳过
    if (deadSongs[song.id]) {
      skipSong(1);
      return;
    }

    var audioUrl = getAudioUrl(song.id);

    ensureAudio();
    audio.src = audioUrl;
    audio.load();

    // 更新 UI
    var cover = playerPanel.querySelector('.music-cover');
    cover.src = song.pic || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%232D5A3F" width="100" height="100"/><text x="50" y="58" text-anchor="middle" fill="%23F0E4C8" font-size="40">&#9835;</text></svg>';
    playerPanel.querySelector('.music-name').textContent = song.name;
    playerPanel.querySelector('.music-artist').textContent = song.artist;
    playerPanel.querySelector('.music-progress-bar').style.width = '0%';
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
      if (!audio.src || audio.src === window.location.href || audio.readyState === 0) {
        loadSong(currentIndex);
      } else {
        var p = audio.play();
        if (p) p.catch(function () {});
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

  var seeking = false;

  function formatTime(sec) {
    if (!sec || isNaN(sec)) return '00:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  function updateProgress() {
    if (!audio || !audio.duration || isNaN(audio.duration)) return;
    if (seeking) return; // 拖动中不更新，让用户控制
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
    var pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct;
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

    // click 直接跳转
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

    // 拖动
    prog.addEventListener('mousedown', seekStart);
    prog.addEventListener('touchstart', seekStart, { passive: false });

    document.addEventListener('mousemove', function (e) { if (seeking) { e.preventDefault(); seekMove(e); } });
    document.addEventListener('touchmove', function (e) { if (seeking) { e.preventDefault(); seekMove(e); } }, { passive: false });

    document.addEventListener('mouseup', function (e) { if (seeking) seekEnd(e); });
    document.addEventListener('touchend', function (e) { if (seeking) seekEnd(e); });
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

        // 检查置顶歌曲
        pinnedSong = loadPinnedSong();
        if (pinnedSong && pinnedSong.id) {
          // 找到置顶歌曲在歌单中的索引
          var found = -1;
          for (var i = 0; i < shuffled.length; i++) {
            if (shuffled[i].id === pinnedSong.id) { found = i; break; }
          }
          if (found >= 0) {
            currentIndex = found;
            // 把置顶歌曲放到队列最前面，方便单曲循环
            var pinned = shuffled.splice(found, 1)[0];
            shuffled.unshift(pinned);
            currentIndex = 0;
          }
        }

        loadSong(currentIndex);

        // 有置顶歌曲时自动播放
        if (pinnedSong && pinnedSong.id) {
          wantToPlay = true;
          // 面板自动展开，让访客看到当前在放什么
          setTimeout(function () {
            if (!panelVisible) {
              panelVisible = true;
              playerPanel.classList.add('visible');
              playerBtn.classList.add('active');
              refreshCoverAnim();
            }
          }, 300);

          // 尝试立即播放（可能被浏览器拦截）
          setTimeout(function () {
            if (!isPlaying && wantToPlay) {
              ensureAudio();
              var p = audio.play();
              if (p) {
                p.catch(function () {
                  // 浏览器拦截了自动播放，等用户第一次交互后重试
                  var onInteraction = function () {
                    if (wantToPlay && !isPlaying && audio.src) {
                      var p2 = audio.play();
                      if (p2) p2.catch(function () {});
                    }
                    document.removeEventListener('click', onInteraction);
                    document.removeEventListener('touchstart', onInteraction);
                  };
                  document.addEventListener('click', onInteraction, { once: true });
                  document.addEventListener('touchstart', onInteraction, { once: true });
                });
              }
            }
          }, 600);
        }
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
