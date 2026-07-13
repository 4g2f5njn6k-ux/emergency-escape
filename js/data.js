/* ========================================
   Emergency Escape · Data Layer
   数据存储 & 默认示例数据
   ======================================== */

const STORAGE_KEY = 'emergency_escape_data';
const PINNED_SONG_KEY = 'ee_pinned_song';

// 初始化数据
function initData() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    const defaultData = {
      essays: [
        { id: 'e1', text: '今天下午阳光穿过树叶打在桌上，突然觉得这个时刻值得被记住。', date: '2026-07-08T15:22:00' },
        { id: 'e2', text: '做了一个很长的梦，醒来只记得一条通向海边的公路，路两边是比人还高的芦苇。', date: '2026-07-06T08:10:00' },
        { id: 'e3', text: '有时候觉得城市像一个巨大的机器，每个人都是齿轮。但齿轮也会在某个午后的缝隙里，偷偷停下来喘口气。', date: '2026-07-03T19:45:00', photo: '' },
        { id: 'e4', text: '读完了《看不见的城市》，卡尔维诺说：\"记忆中的形象一旦被词语固定住，就被抹掉了。\"也许我不该试图描述那些地方。', date: '2026-07-01T22:30:00' },
        { id: 'e5', text: '窗外的树又绿了一层。每年这个时候都觉得，春天其实是从叶子的背面开始的。', date: '2026-06-28T12:05:00' },
      ],
      articles: [
        {
          id: 'a1',
          title: '为什么我们需要一个"自留地"',
          date: '2026-07-08T16:00:00',
          body: '我建这个网站的想法其实很简单：在互联网越来越吵闹的今天，我想有一个安静的地方。\n\n不是社交媒体那种被算法推着走的信息流，不是聊天软件里永远回不完的消息。就是一个属于自己的角落，想写什么写什么，想放什么放什么。\n\n我给它取名"Emergency Escape"——紧急出口。这不是消极的逃离，而是一种主动的选择。当外面的世界让人喘不过气的时候，你知道有一个地方可以回去。\n\n另一个名字是"自留地"。小时候在农村，每家都有一小块自留地，种点自己喜欢的东西，不必管别人怎么看、收成好不好。这个网站就是我的数字自留地。\n\n我会在这里放一些随手写的东西、拍的照片、旅行计划，也许还有一些乱七八糟的想法。不追求频率，不追求阅读量，就是记录。\n\n如果你偶然来到这里，欢迎随便逛逛。'
        },
        {
          id: 'a2',
          title: '关于墨绿色',
          date: '2026-07-05T10:30:00',
          body: '做这个网站的时候，选了很久的主色调。\n\n后来想明白了，我喜欢的其实是墨绿色——那种阳光穿过树冠之后落下来的颜色。不是刺眼的绿，而是被叶子过滤过的、柔和又沉静的光。\n\n小时候夏天最喜欢做的事就是躺在树下看天。树叶们像一面面小小的筛子，把阳光筛成细碎的光斑，洒在地上、洒在手上、洒在眼皮上。闭上眼，世界变成暖橙色的，偶尔有风吹过，光斑就跳起舞来。\n\n那种感觉很难描述——安全、安静，但又充满生命力。\n\n所以这个网站的颜色，就是那个午后的颜色。'
        },
        {
          id: 'a3',
          title: '碎片化时代的完整叙述',
          date: '2026-06-30T21:15:00',
          body: '最近在想一个问题：在这个什么都碎片化的时代，还有没有必要写长文章？\n\n朋友圈、微博、小红书……所有的平台都在鼓励我们写短一点、再短一点。一个观点最好压缩到140个字，一张照片加三行文字就是一条完整的内容。\n\n我承认短内容有短内容的好——轻松、即时、不费力。但有些事情真的需要长一点的空间才能说清楚。\n\n比如一段旅行的感受，不只是\"好美\"两个字能概括的。比如读一本书之后的思绪，需要慢慢展开才能捕捉到那些细微的转折。\n\n所以这个网站有\"随笔\"——那些短小的碎片，也有\"文章\"——那些需要耐心读完的东西。\n\n两种都留着，挺好的。'
        }
      ],
      photos: [
        { id: 'p1', src: '', caption: '午后窗台的光', date: '2026-07-07' },
      ],
      guides: [
        {
          id: 'g1',
          title: '京都三日漫步计划',
          date: '2026-07-04T14:00:00',
          body: 'Day 1：伏见稻荷大社 → 千本鸟居 → 祇园花见小路（傍晚最佳）\n\nDay 2：岚山竹林 → 天龙寺 → 渡月桥 → 岚山小火车\n\nDay 3：清水寺 → 二年坂三年坂 → 锦市场 → 回程\n\nTips：\n- 京都公交一日券很划算\n- 早起是避开人潮的唯一办法\n- 花见小路傍晚5-7点最容易遇到艺伎\n- 岚山小火车一定要提前订票'
        },
        {
          id: 'g2',
          title: '周末短途：杭州徒步路线',
          date: '2026-06-25T09:00:00',
          body: '路线：龙井村 → 十里琅珰 → 五云山 → 云栖竹径\n\n全程约12公里，4-5小时，难度适中。\n\n建议早上9点前从龙井村出发，上午走十里琅珰最舒服，树荫多不晒。中午在五云山附近找个地方休息吃饭。下午走云栖竹径，竹林的绿和光线的层次是整条路线的高光时刻。\n\nTips：\n- 带够水，路上补给点不多\n- 穿防滑的鞋，部分路段有青苔\n- 云栖竹径出口有公交回市区'
        }
      ],
      guestbook: [
        { id: 'gb1', name: 'Nemo', text: '来串门啦！网站做得好看，墨绿色选得好~', date: '2026-07-08T17:30:00' }
      ],
      musicshares: []
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
  }
}

function loadData() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY));
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 生成唯一 ID
function genId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

// 添加内容
function addItem(type, item) {
  const data = loadData();
  item.id = genId(type[0]);
  item.date = item.date || new Date().toISOString();
  data[type].unshift(item);
  saveData(data);
  return item;
}

// 删除内容
function deleteItem(type, id) {
  const data = loadData();
  data[type] = data[type].filter(item => item.id !== id);
  saveData(data);
}

// 格式化日期
function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return minutes + ' 分钟前';
  if (hours < 24) return hours + ' 小时前';
  if (days < 7) return days + ' 天前';

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${dd}`;
}

function fullDate(iso) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${dd} ${h}:${mi}`;
}

// 初始化
initData();
