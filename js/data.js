/* ========================================
   Emergency Escape · Data Layer v2
   数据源：data/content.json（GitHub 仓库文件）
   本地 localStorage 仅作为编辑缓存 & 离线兜底
   ======================================== */

const DATA_URL = 'data/content.json';
const STORAGE_KEY = 'emergency_escape_data';
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

// 异步初始化：优先从 content.json 加载，失败则用 localStorage 兜底
function initData() {
  fetch(DATA_URL + '?v=' + Date.now())
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(json) {
      _siteData = json;
      // 同步更新 localStorage 作为本地缓存
      localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
      _notifyReady();
    })
    .catch(function(err) {
      console.warn('content.json 加载失败，尝试本地缓存:', err.message);
      // 兜底：读 localStorage
      var cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try { _siteData = JSON.parse(cached); } catch(e) {}
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
