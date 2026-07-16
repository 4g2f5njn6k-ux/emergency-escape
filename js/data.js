/* ========================================
   Emergency Escape · Data Layer v2
   数据源：data/content.json（GitHub 仓库文件）
   本地 localStorage 仅作为编辑缓存 & 离线兜底
   ======================================== */

const DATA_URL = 'data/content.json';
const STORAGE_KEY = 'emergency_escape_data';
const STORAGE_VERSION_KEY = 'emergency_escape_data_version';
const DATA_VERSION = '20260716'; // 更新内容后递增此版本号，强制刷新所有访客的缓存
const PINNED_SONG_KEY = 'ee_pinned_song';

// 内存缓存
var _siteData = null;
var _dataReady = false;
var _dataCallbacks = [];

// 注册加载完成回调（用于 app.js 等待数据就绪）
function onDataReady(fn) {
  if (_dataReady) { fn(_siteData); return; }
  _dataCallbacks.push(fn);
}

function _notifyReady() {
  _dataReady = true;
  _dataCallbacks.forEach(function(fn) { fn(_siteData); });
  _dataCallbacks = [];
}

// 异步初始化：优先使用 localStorage（管理面板编辑后的最新数据），
// content.json 仅作为初始种子（首次访问或 localStorage 被清空时使用）
function initData() {
  // 1. 先检查 localStorage 是否有数据（管理面板可能已经编辑过）
  //    同时检查版本号，版本不匹配则清除旧缓存
  var cachedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
  if (cachedVersion !== DATA_VERSION) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_VERSION_KEY, DATA_VERSION);
  }
  var cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      _siteData = JSON.parse(cached);
      if (_siteData && ((_siteData.essays && _siteData.essays.length > 0) ||
                        (_siteData.articles && _siteData.articles.length > 0) ||
                        (_siteData.photos && _siteData.photos.length > 0))) {
        // localStorage 有有效内容，直接使用
        _notifyReady();
        // 后台静默获取 content.json，如果远端数据更多则自动更新
        fetch(DATA_URL + '?v=' + Date.now())
          .then(function(res) { return res.ok ? res.json() : null; })
          .then(function(json) {
            if (json) {
              localStorage.setItem(STORAGE_KEY + '_fallback', JSON.stringify(json));
              // 如果远端数据条数更多，自动更新本地缓存并刷新
              var remoteCount = (json.essays||[]).length + (json.photos||[]).length + (json.articles||[]).length;
              var localCount = (_siteData.essays||[]).length + (_siteData.photos||[]).length + (_siteData.articles||[]).length;
              if (remoteCount > localCount) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
                location.reload();
              }
            }
          })
          .catch(function() {});
        return;
      }
    } catch(e) {}
  }

  // 2. localStorage 为空，从 content.json 加载
  fetch(DATA_URL + '?v=' + Date.now())
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(json) {
      _siteData = json;
      // 同步到 localStorage 作为初始缓存
      localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
      _notifyReady();
    })
    .catch(function(err) {
      console.warn('content.json 加载失败，尝试备用源:', err.message);
      // 兜底：尝试 fallback 缓存
      var fallback = localStorage.getItem(STORAGE_KEY + '_fallback');
      if (fallback) {
        try { _siteData = JSON.parse(fallback); } catch(e) {}
      }
      // 再兜底：内嵌微博数据
      if (!_siteData && typeof WEIBO_IMPORT !== 'undefined' && WEIBO_IMPORT.essays) {
        _siteData = {
          essays: WEIBO_IMPORT.essays || [],
          articles: WEIBO_IMPORT.articles || [],
          photos: WEIBO_IMPORT.photos || [],
          guides: [],
          guestbook: [],
          musicshares: []
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_siteData));
      }
      _notifyReady();
    });
}

// 同步读取（需要先等 onDataReady 回调）
function loadData() {
  if (_siteData) return _siteData;
  var cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }
  return { essays:[], articles:[], photos:[], guides:[], guestbook:[], musicshares:[] };
}

// 保存到内存 + localStorage（管理员编辑后的暂存）
function saveData(data) {
  _siteData = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 导出为 content.json 格式的 JSON 字符串（供发布用）
function exportContentJSON() {
  return JSON.stringify(_siteData || loadData(), null, 2);
}

// 生成唯一 ID
function genId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

// 添加内容（只影响内存 + localStorage，不发布）
function addItem(type, item) {
  const data = loadData();
  item.id = genId(type[0]);
  item.date = item.date || new Date().toISOString();
  if (!data[type]) data[type] = [];
  data[type].unshift(item);
  saveData(data);
  return item;
}

// 删除内容（只影响内存 + localStorage，不发布）
function deleteItem(type, id) {
  const data = loadData();
  data[type] = data[type].filter(function(item) { return item.id !== id; });
  saveData(data);
}

// 格式化日期
function formatDate(iso) {
  var d = new Date(iso);
  var now = new Date();
  var diff = now - d;
  var minutes = Math.floor(diff / 60000);
  var hours = Math.floor(diff / 3600000);
  var days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return minutes + ' 分钟前';
  if (hours < 24) return hours + ' 小时前';
  if (days < 7) return days + ' 天前';

  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return y + '.' + m + '.' + dd;
}

function fullDate(iso) {
  var d = new Date(iso);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  var h = String(d.getHours()).padStart(2, '0');
  var mi = String(d.getMinutes()).padStart(2, '0');
  return y + '.' + m + '.' + dd + ' ' + h + ':' + mi;
}

// 启动
initData();
