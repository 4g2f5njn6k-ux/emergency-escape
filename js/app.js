/* ========================================
   Emergency Escape · Front-end App
   页面导航 & 渲染
   ======================================== */

let currentPage = 'home';

// 迁移：把 localStorage 中的新浪图床 URL 替换为本地路径
function migrateSinaImages() {
  const data = loadData();
  if (!data) return;
  let changed = false;
  const fix = (url) => {
    if (url && url.indexOf('sinaimg.cn') !== -1) {
      const filename = url.split('/').pop();
      changed = true;
      return 'images/photos/' + filename;
    }
    return url;
  };
  if (data.photos) {
    data.photos.forEach(p => { if (p.src) p.src = fix(p.src); });
  }
  if (data.essays) {
    data.essays.forEach(e => { if (e.photo) e.photo = fix(e.photo); });
  }
  if (changed) {
    saveData(data);
    console.log('[migration] 已将新浪图片 URL 替换为本地路径');
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 加载动画
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
  }, 1200);

  // 等待数据就绪后再渲染（v2：数据从 content.json 异步加载）
  var hash = window.location.hash.slice(1) || 'home';
  onDataReady(function(data) {
    // 迁移旧数据
    migrateSinaImages();
    navigate(hash);
  });

  // 监听滚动，显示/隐藏返回顶部按钮
  window.addEventListener('scroll', () => {
    const btn = document.getElementById('backToTop');
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  });

  // 点击页面空白处关闭移动导航
  document.addEventListener('click', (e) => {
    const nav = document.getElementById('mobileNav');
    const toggle = document.querySelector('.mobile-nav-toggle');
    if (nav.classList.contains('open') && !nav.contains(e.target) && e.target !== toggle) {
      nav.classList.remove('open');
    }
  });
});

function toggleMobileNav() {
  document.getElementById('mobileNav').classList.toggle('open');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function navigate(page) {
  // 同页不刷新
  if (page === currentPage && document.querySelector('.page-section')) return;

  currentPage = page;
  window.location.hash = page;

  // 关闭移动导航
  document.getElementById('mobileNav').classList.remove('open');

  // 更新导航激活状态
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + page);
  });

  const main = document.getElementById('mainContent');
  const oldSection = main.querySelector('.page-section');

  // 退出旧页面
  if (oldSection) {
    oldSection.classList.add('exiting');
    await sleep(200);
  }

  // 渲染新页面
  main.innerHTML = '<div class="page-section">' + renderPage(page) + '</div>';

  // 导航后处理（灯箱绑定等）
  afterNavigate();

  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderPage(page) {
  const data = loadData();

  switch (page) {
    case 'home': return renderHome(data);
    case 'essays': return renderEssays(data.essays);
    case 'articles': return renderArticles(data.articles);
    case 'photos': return renderPhotos(data.photos);
    case 'guides': return renderGuides(data.guides);
    case 'about': return renderAbout();
    case 'guestbook': return renderGuestbook(data.guestbook);
    case 'musicshares': return renderMusicShares(data.musicshares);
    case 'fun': return renderFun();
    default: return renderHome(data);
  }
}

// ===== 首页 =====
function renderHome(data) {
  let html = '';
  // 标题微动画 — 页面入场后再浮出
  html += '<div style="animation:fadeInUp 0.5s ease forwards;animation-delay:0.05s;opacity:0;">';
  html += '<h1 class="page-title">Welcome</h1>';
  html += '<p class="page-subtitle">人类为何迷恋绿色。</p>';
  html += '</div>';

  let blockIdx = 0;

  // 最近随笔（取3条）
  if (data.essays.length > 0) {
    html += `<div class="home-block" style="animation:fadeInUp 0.5s ease forwards;animation-delay:${0.12 + blockIdx * 0.1}s;opacity:0;">`;
    html += '<h3 style="color:var(--green-mid);margin-bottom:1rem;font-size:1rem;">📝 最近碎片</h3>';
    data.essays.slice(0, 3).forEach(essay => {
      html += `<div class="essay-item">
        <div class="essay-text">${escapeHtml(essay.text)}</div>
        <div class="essay-date">${formatDate(essay.date)}</div>
      </div>`;
    });
    html += `<a href="#essays" onclick="navigate('essays');return false" style="display:inline-block;margin-top:0.8rem;color:var(--green-mid);font-size:0.85rem;text-decoration:none;">查看全部随笔 →</a>`;
    html += '</div>';
    blockIdx++;
  }

  // 最近文章（取2条）
  if (data.articles.length > 0) {
    html += `<div class="home-block" style="animation:fadeInUp 0.5s ease forwards;animation-delay:${0.12 + blockIdx * 0.1}s;opacity:0;">`;
    html += '<h3 style="color:var(--green-mid);margin-bottom:1rem;font-size:1rem;">📖 最近文章</h3>';
    data.articles.slice(0, 2).forEach(article => {
      html += `<div class="card" onclick="viewArticle('${article.id}');return false" style="cursor:pointer">
        <div class="card-meta">
          <span class="card-category">文章</span>
          <span>${formatDate(article.date)}</span>
        </div>
        <div class="card-title">${escapeHtml(article.title)}</div>
        <div class="card-excerpt">${escapeHtml(article.body.slice(0, 120))}…</div>
      </div>`;
    });
    html += '<a href="#articles" onclick="navigate(\'articles\');return false" style="display:inline-block;margin-top:0.4rem;color:var(--green-mid);font-size:0.85rem;text-decoration:none;">查看全部文章 →</a>';
    html += '</div>';
    blockIdx++;
  }

  // 最近照片
  const photosWithSrc = data.photos.filter(p => p.src);
  if (photosWithSrc.length > 0) {
    html += `<div class="home-block" style="animation:fadeInUp 0.5s ease forwards;animation-delay:${0.12 + blockIdx * 0.1}s;opacity:0;">`;
    html += '<h3 style="color:var(--green-mid);margin-bottom:1rem;font-size:1rem;">📷 最近照片</h3>';
    html += '<div class="card-photos">';
    photosWithSrc.slice(0, 6).forEach(photo => {
      html += `<img src="${photo.src}" alt="${escapeHtml(photo.caption || '')}" loading="lazy" referrerpolicy="no-referrer" onclick="event.stopPropagation();openLightbox('${photo.src}')">`;
    });
    html += '</div>';
    html += '<a href="#photos" onclick="navigate(\'photos\');return false" style="display:inline-block;margin-top:0.8rem;color:var(--green-mid);font-size:0.85rem;text-decoration:none;">查看全部照片 →</a>';
    html += '</div>';
    blockIdx++;
  }

  // 玩玩入口
  html += `<div class="home-block" style="animation:fadeInUp 0.5s ease forwards;animation-delay:${0.12 + blockIdx * 0.1}s;opacity:0;">`;
  html += '<h3 style="color:var(--green-mid);margin-bottom:1rem;font-size:1rem;">🎲 玩玩</h3>';
  html += '<div class="card" onclick="navigate(\'fun\')" style="cursor:pointer;text-align:center;padding:2rem;">';
  html += '<div style="font-size:2rem;margin-bottom:0.5rem;">🍟🍜🎲🌸</div>';
  html += '<div style="color:var(--green-deep);font-weight:600;margin-bottom:0.3rem;">今日运势 · 吃什么 · 选择困难症 · 每日一言</div>';
  html += '<div style="font-size:0.8rem;color:var(--text-muted);">点进来玩玩 →</div>';
  html += '</div>';
  html += '</div>';

  // 如果没有任何内容
  if (data.essays.length === 0 && data.articles.length === 0 && photosWithSrc.length === 0) {
    html += '<div class="empty-state">';
    html += '<span class="empty-icon">🌱</span>';
    html += '<p>这里还是一块空地。</p>';
    html += '<p style="font-size:0.8rem;margin-top:0.5rem;">打开管理面板，开始播种吧。</p>';
    html += '</div>';
  }

  return html;
}

// ===== 随笔 =====
function renderEssays(essays) {
  let html = '';
  html += '<h1 class="page-title">Fragments</h1>';
  html += '<p class="page-subtitle">你对我来说也是最珍贵的。</p>';

  if (essays.length === 0) {
    html += '<div class="empty-state"><span class="empty-icon">🍃</span><p>还没有碎碎念</p></div>';
  } else {
    html += '<div class="essay-feed">';
    essays.forEach((essay, i) => {
      html += `<div class="essay-item" style="animation: fadeInUp 0.5s ease forwards; animation-delay: ${i * 0.06}s;">
        <div class="essay-text">${escapeHtml(essay.text)}</div>`;
      if (essay.photo) {
        html += `<img src="${essay.photo}" alt="" class="essay-photo" loading="lazy" referrerpolicy="no-referrer" onclick="openLightbox('${essay.photo}')">`;
      }
      html += `<div class="essay-date">${formatDate(essay.date)}</div>
      </div>`;
    });
    html += '</div>';
  }

  return html;
}

// ===== 文章 =====
function renderArticles(articles) {
  let html = '';
  html += '<h1 class="page-title">Articles</h1>';
  html += '<p class="page-subtitle">值得慢慢读完的东西</p>';

  if (articles.length === 0) {
    html += '<div class="empty-state"><span class="empty-icon">📄</span><p>还没有文章</p></div>';
  } else {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const articleId = params.get('id');

    if (articleId) {
      // 单篇文章详情
      const article = articles.find(a => a.id === articleId);
      if (article) {
        html += '<div class="article-full">';
        html += `<h1>${escapeHtml(article.title)}</h1>`;
        html += `<div class="card-meta" style="margin-bottom:0.5rem;"><span class="card-category">文章</span><span>${fullDate(article.date)}</span></div>`;
        html += `<div class="article-body">${escapeHtml(article.body).replace(/\n/g, '<br>')}</div>`;
        html += `<a href="#articles" onclick="navigate('articles');return false" style="display:inline-block;margin-top:2rem;color:var(--green-mid);font-size:0.85rem;text-decoration:none;">← 返回文章列表</a>`;
        html += '</div>';
      }
    } else {
      // 文章列表
      articles.forEach((article, i) => {
        html += `<div class="card" style="cursor:pointer;animation:fadeInUp 0.5s ease forwards;animation-delay:${i*0.07}s" onclick="viewArticle('${article.id}')">
          <div class="card-meta">
            <span class="card-category">文章</span>
            <span>${formatDate(article.date)}</span>
          </div>
          <div class="card-title">${escapeHtml(article.title)}</div>
          <div class="card-excerpt">${escapeHtml(article.body.slice(0, 150))}…</div>
        </div>`;
      });
    }
  }

  return html;
}

async function viewArticle(id) {
  const main = document.getElementById('mainContent');
  const data = loadData();
  const article = data.articles.find(a => a.id === id);
  if (!article) return;

  const oldSection = main.querySelector('.page-section');
  if (oldSection) {
    oldSection.classList.add('exiting');
    await sleep(200);
  }

  let html = '<div class="page-section">';
  html += '<div class="article-full">';
  html += '<h1>' + escapeHtml(article.title) + '</h1>';
  html += '<div class="card-meta" style="margin-bottom:0.5rem;"><span class="card-category">文章</span><span>' + fullDate(article.date) + '</span></div>';
  html += '<div class="article-body">' + escapeHtml(article.body).replace(/\n/g, '<br>') + '</div>';
  html += '<a href="#articles" onclick="navigate(\'articles\');return false" style="display:inline-block;margin-top:2rem;color:var(--green-mid);font-size:0.85rem;text-decoration:none;">← 返回文章列表</a>';
  html += '</div>';
  html += '</div>';

  currentPage = 'article-detail'; // 标记为文章详情页，使"返回文章列表"按钮正常工作
  main.innerHTML = html;
  afterNavigate();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ===== 相册 =====
function renderPhotos(photos) {
  let html = '';
  html += '<h1 class="page-title">Gallery</h1>';
  html += '<p class="page-subtitle">彩色的泡泡🫧</p>';

  const photosWithSrc = photos.filter(p => p.src);
  if (photosWithSrc.length === 0) {
    html += '<div class="empty-state"><span class="empty-icon">📷</span><p>还没有照片</p></div>';
  } else {
    const bubbleColors = [
      'rgba(135,206,250,0.5)',
      'rgba(255,182,193,0.5)',
      'rgba(216,191,216,0.5)',
      'rgba(144,238,144,0.45)',
      'rgba(255,218,185,0.5)',
      'rgba(230,230,250,0.5)',
      'rgba(255,218,221,0.5)',
      'rgba(173,216,230,0.5)',
    ];
    const sizes = [130, 160, 190, 220, 250];

    html += '<div class="photo-grid">';
    photosWithSrc.forEach((photo, i) => {
      const size = sizes[i % sizes.length];
      const color = bubbleColors[Math.floor(Math.random() * bubbleColors.length)];
      html += `<div class="photo-bubble" style="width:${size}px;height:${size}px;border:3px solid ${color};" onclick="openLightbox('${photo.src}')">
        <img src="${photo.src}" alt="${escapeHtml(photo.caption || '')}" loading="lazy" referrerpolicy="no-referrer">
      </div>`;
      if (photo.caption) {
        html += `<div class="photo-bubble-caption" style="width:${size}px;text-align:center;margin-top:-0.3rem;font-size:0.75rem;color:var(--text-muted);">${escapeHtml(photo.caption)}</div>`;
      }
    });
    html += '</div>';
  }

  return html;
}

// ===== 攻略 =====
function renderGuides(guides) {
  let html = '';
  html += '<h1 class="page-title">Guides</h1>';
  html += '<p class="page-subtitle">走过的路，画的地图</p>';

  if (guides.length === 0) {
    html += '<div class="empty-state"><span class="empty-icon">🗺️</span><p>还没有攻略</p></div>';
  } else {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const guideId = params.get('id');

    if (guideId) {
      const guide = guides.find(g => g.id === guideId);
      if (guide) {
        html += '<div class="article-full">';
        html += `<h1>${escapeHtml(guide.title)}</h1>`;
        html += `<div class="card-meta" style="margin-bottom:0.5rem;"><span class="card-category">攻略</span><span>${fullDate(guide.date)}</span></div>`;
        html += `<div class="article-body">${escapeHtml(guide.body)}</div>`;
        html += `<a href="#guides" onclick="navigate('guides');return false" style="display:inline-block;margin-top:2rem;color:var(--green-mid);font-size:0.85rem;text-decoration:none;">← 返回攻略列表</a>`;
        html += '</div>';
      }
    } else {
      guides.forEach((guide, i) => {
        html += `<div class="card" style="cursor:pointer;animation:fadeInUp 0.5s ease forwards;animation-delay:${i*0.07}s" onclick="viewGuide('${guide.id}')">
          <div class="card-meta">
            <span class="card-category">攻略</span>
            <span>${formatDate(guide.date)}</span>
          </div>
          <div class="card-title">${escapeHtml(guide.title)}</div>
          <div class="card-excerpt">${escapeHtml(guide.body.slice(0, 150))}…</div>
        </div>`;
      });
    }
  }

  return html;
}

async function viewGuide(id) {
  window.location.hash = 'guides?id=' + id;
  const main = document.getElementById('mainContent');
  const data = loadData();

  const oldSection = main.querySelector('.page-section');
  if (oldSection) {
    oldSection.classList.add('exiting');
    await sleep(200);
  }

  currentPage = 'guide-detail'; // 标记为攻略详情页
  main.innerHTML = '<div class="page-section">' + renderGuides(data.guides) + '</div>';
  afterNavigate();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ===== 关于 =====
function renderAbout() {
  let html = '';
  html += '<div class="about-section">';
  html += '<div class="about-avatar"><img src="images/leaf-blossom.jpg" alt="🌿"></div>';
  html += '<div class="about-name">Emergency Escape</div>';
  html += '<p style="color:var(--text-muted);margin-bottom:1.5rem;font-size:0.9rem;">又名「自留地」</p>';
  html += '<div class="about-bio">';
  html += '<p style="line-height:2.2;">命运在新陈代谢<br>很深的东西变得很浅<br><br>直到剥落因果自然凋谢<br><br>让人彻夜难眠的豌豆埋进土里<br><br>一些沉重的记忆<br>最终变成轻盈的叶子</p>';
  html += '</div>';
  html += '<div class="about-links">';
  html += '<a href="#home" onclick="navigate(\'home\');return false">🏠 首页</a>';
  html += '<a href="#guestbook" onclick="navigate(\'guestbook\');return false">💬 留言</a>';
  html += '</div>';
  html += '</div>';
  return html;
}

// ===== 留言板 =====
function renderGuestbook(messages) {
  let html = '';
  html += '<h1 class="page-title">Guestbook</h1>';
  html += '<p class="page-subtitle">来都来了，留句话吧</p>';

  // 留言表单
  html += '<div class="guestbook-form">';
  html += '<input type="text" id="gbName" placeholder="你的名字" maxlength="20">';
  html += '<textarea id="gbText" placeholder="想说点什么…" maxlength="500"></textarea>';
  html += '<button class="btn" onclick="submitMessage()">留下足迹</button>';
  html += '</div>';

  // 历史留言
  if (messages.length === 0) {
    html += '<div class="empty-state"><span class="empty-icon">💬</span><p>还没有留言，来做第一个吧</p></div>';
  } else {
    messages.forEach(msg => {
      html += `<div class="message-item">
        <div class="message-header">
          <span class="message-name">${escapeHtml(msg.name)}</span>
          <span class="message-time">${formatDate(msg.date)}</span>
        </div>
        <div class="message-body">${escapeHtml(msg.text)}</div>
      </div>`;
    });
  }

  return html;
}

// ===== 音乐分享 =====
function renderMusicShares(shares) {
  let html = '';
  html += '<h1 class="page-title">Now Playing</h1>';
  html += '<p class="page-subtitle">最近在听的歌，分享给你</p>';

  if (!shares || shares.length === 0) {
    html += '<div class="empty-state"><span class="empty-icon">🎧</span><p>还没分享过音乐</p></div>';
  } else {
    html += '<div class="music-share-list">';
    shares.forEach(function(share) {
      var platformLabel = { netease: '网易云', qq: 'QQ音乐', apple: 'Apple Music', other: '其他' };
      var platformIcon = { netease: '🔴', qq: '🟢', apple: '🍎', other: '🎵' };
      html += '<div class="music-share-card">';
      html += '<div class="music-share-cover">';
      if (share.cover) {
        html += '<img src="' + escapeHtml(share.cover) + '" alt="" onerror="this.style.display=\'none\'">';
      } else {
        html += '<div class="music-share-cover-fallback">🎵</div>';
      }
      html += '</div>';
      html += '<div class="music-share-info">';
      html += '<div class="music-share-name">' + escapeHtml(share.name) + '</div>';
      html += '<div class="music-share-artist">' + escapeHtml(share.artist) + '</div>';
      html += '<div class="music-share-meta">';
      html += '<span class="music-share-platform">' + (platformIcon[share.platform] || '🎵') + ' ' + (platformLabel[share.platform] || '其他') + '</span>';
      html += '<span class="music-share-date">' + formatDate(share.date) + '</span>';
      html += '</div>';
      if (share.note) {
        html += '<div class="music-share-note">' + escapeHtml(share.note) + '</div>';
      }
      if (share.link) {
        html += '<a class="music-share-link" href="' + escapeHtml(share.link) + '" target="_blank" rel="noopener">去听听 →</a>';
      }
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
  }

  return html;
}

function submitMessage() {
  const name = document.getElementById('gbName').value.trim();
  const text = document.getElementById('gbText').value.trim();

  if (!name) { alert('请填写名字'); return; }
  if (!text) { alert('请填写留言内容'); return; }

  const data = loadData();
  data.guestbook.unshift({
    id: genId('gb'),
    name: name,
    text: text,
    date: new Date().toISOString()
  });
  saveData(data);

  // 刷新留言区
  navigate('guestbook');
}

// ===== 灯箱 =====
function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  img.src = src;
  lb.classList.add('active');
  document.body.style.overflow = 'hidden';

}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('active');
  document.body.style.overflow = '';
}

// ===== 导航后绑定 =====
function afterNavigate() {
  // 灯箱事件绑定到所有照片
  document.querySelectorAll('.photo-grid img, .card-photos img, .essay-photo').forEach(img => {
    if (!img.hasAttribute('data-lightbox-bound')) {
      img.setAttribute('data-lightbox-bound', '1');
    }
  });

  // 处理返回按钮
  window.addEventListener('popstate', () => {
    const hash = window.location.hash.slice(1) || 'home';
    if (hash !== currentPage) {
      navigate(hash);
    }
  });
}

// ===== 工具函数 =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


// 处理浏览器前进后退
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1).split('?')[0] || 'home';
  if (hash !== currentPage) {
    navigate(hash);
  }
});

// ===== 玩玩 · 小玩具合集 =====

// 运势数据
const FORTUNES = [
  { score: 95, text: '万事皆顺，今天是你的主场', luck_color: '薄荷绿', yi: ['做决定', '出门', '花钱', '联系老朋友'], ji: ['纠结', '熬夜'] },
  { score: 88, text: '运气不错，适合开始新事情', luck_color: '暖橙色', yi: ['计划', '学习', '整理房间'], ji: ['吃太辣'] },
  { score: 92, text: '贵人运旺，多跟人聊聊天', luck_color: '天青色', yi: ['社交', '表达', '吃火锅'], ji: ['独处生闷气'] },
  { score: 76, text: '平平淡淡才是真，稳住就好', luck_color: '米白色', yi: ['散步', '看书', '早睡'], ji: ['冲动消费'] },
  { score: 99, text: '今日欧皇附体，买彩票都来得及', luck_color: '金色', yi: ['抽奖', '表白', '做任何事'], ji: ['犹豫不决'] },
  { score: 82, text: '小有波折但能化险为夷', luck_color: '雾霾蓝', yi: ['耐心', '求助', '喝奶茶'], ji: ['逞强'] },
  { score: 90, text: '灵感爆棚的一天，赶紧记下来', luck_color: '紫色', yi: ['创作', '记录', '探索'], ji: ['刷短视频'] },
  { score: 68, text: '今天适合躺平，别勉强自己', luck_color: '灰色', yi: ['休息', '听歌', '发呆'], ji: ['做重大决定'] },
  { score: 85, text: '财运小旺，可能有意外收入', luck_color: '鹅黄色', yi: ['理财', '记账', '请客'], ji: ['借钱给别人'] },
  { score: 93, text: '心情大好，看什么都顺眼', luck_color: '粉色', yi: ['拍照', '逛街', '约饭'], ji: ['想太多'] },
  { score: 80, text: '踏实做事，回报在后面', luck_color: '茶色', yi: ['工作', '锻炼', '做饭'], ji: ['偷懒'] },
  { score: 87, text: '桃花旺旺，今天格外有魅力', luck_color: '珊瑚色', yi: ['出门', '打扮', '微笑'], ji: ['宅家'] },
];

// 吃什么数据
const FOODS = [
  '火锅 🍲', '螺蛳粉 🍜', '炸鸡 🍗', '寿司 🍣', '麻辣烫 🌶️', '汉堡 🍔',
  '烤肉 🥩', '披萨 🍕', '炒饭 🍚', '拉面 🍜', '饺子 🥟', '盖饭 🍱',
  '肠粉 🥘', '麻辣香锅 🍛', '日料 🍱', '韩餐 🍖', '泰餐 🍜', '奶茶+小吃 🧋',
  '便利店饭团 🍙', '沙拉 🥗', '煎饼果子 🥞', '兰州拉面 🍜', '黄焖鸡 🍲', '酸菜鱼 🐟',
  '冒菜 🌶️', '烤鱼 🐟', '串串香 🍡', '小蛋糕 🍰', '牛肉面 🍜', '卤肉饭 🍚',
];

// 一言数据
const QUOTES = [
  '多做多错，少做少错，不做不错，不错不错',
  '努力不一定成功，但不努力一定很轻松',
  '世上无难事，只要肯放弃',
  '在哪里跌倒，就在哪里躺下',
  '万事开头难，中间难，结尾也难',
  '今天不想做的事，明天也不会想做的',
  '船到桥头自然直，直不了就沉了',
  '条条大路通罗马，但我住罗马',
  '比我优秀的人还在努力，那我努力有什么用',
  '失败是成功之母，可惜成功六亲不认',
  '强扭的瓜不甜，但解渴啊',
  '明明可以靠脸吃饭，我偏要靠才华，这就是我跟明明之间的差距',
  '我不是懒，我只是进入了节能模式',
  '生活不止眼前的苟且，还有明天后天的苟且',
  '没有人能让你放弃梦想，你自己试试就放弃了',
  '只要是石头，到哪里都不会发光的',
  '如果你觉得累，那就对了，说明你在走上坡路......也可能是下坡路',
  '车到山前必有路，有路必有收费站',
  '早起的虫儿被鸟吃',
  '今天不加班，明天不加班，后天就不用上班了',
  '当你觉得自己又穷又丑的时候，别绝望，至少你的判断是对的',
  '开心点朋友们，人间不值得——但来都来了',
  '只要我吃得够快，体重就追不上我',
  '我不是拖延症，我只是想把事情留到最后一刻再做——这叫极限操作',
];

function renderFun() {
  let html = '';
  html += '<h1 class="page-title">Playground</h1>';
  html += '<p class="page-subtitle">一些没用的好玩小东西</p>';

  // 今日运势
  html += '<div class="fun-card" id="fortuneCard">';
  html += '<div class="fun-card-header"><span class="fun-icon">🍟</span><span class="fun-title">今日运势抽签</span></div>';
  html += '<div class="fun-card-body" id="fortuneBody">';
  html += '<div class="fortune-empty">点击下方按钮，抽取今日运势 ✨</div>';
  html += '</div>';
  html += '<button class="btn fun-btn" onclick="drawFortune()">来一根 🍟</button>';
  html += '</div>';

  // 今天吃什么
  html += '<div class="fun-card">';
  html += '<div class="fun-card-header"><span class="fun-icon">🍜</span><span class="fun-title">今天吃什么</span></div>';
  html += '<div class="fun-card-body">';
  html += '<div class="food-display" id="foodDisplay">还没想好？点一下帮你选 🥢</div>';
  html += '</div>';
  html += '<button class="btn fun-btn" onclick="spinFood()">帮我选</button>';
  html += '</div>';

  // 选择困难症救命器
  html += '<div class="fun-card">';
  html += '<div class="fun-card-header"><span class="fun-icon">🎲</span><span class="fun-title">选择困难症救命器</span></div>';
  html += '<div class="fun-card-body">';
  html += '<p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.6rem;">每行写一个选项，让命运帮你决定：</p>';
  html += '<textarea id="choiceInput" class="fun-textarea" placeholder="喝奶茶&#10;喝咖啡&#10;喝水&#10;啥也不喝" rows="4"></textarea>';
  html += '<div class="choice-result" id="choiceResult"></div>';
  html += '</div>';
  html += '<button class="btn fun-btn" onclick="makeChoice()">帮我选</button>';
  html += '</div>';

  // 每日一言
  html += '<div class="fun-card">';
  html += '<div class="fun-card-header"><span class="fun-icon">🌸</span><span class="fun-title">每日一言</span></div>';
  html += '<div class="fun-card-body">';
  html += '<div class="quote-display" id="quoteDisplay">点击下方按钮，来一句话 📖</div>';
  html += '</div>';
  html += '<button class="btn fun-btn" onclick="drawQuote()">来一句</button>';
  html += '</div>';

  return html;
}

// 今日运势抽签
function drawFortune() {
  const today = new Date();
  const dateStr = today.getFullYear() + '-' + (today.getMonth()+1) + '-' + today.getDate();
  const seed = today.getFullYear() * 10000 + (today.getMonth()+1) * 100 + today.getDate();
  // 用日期做种子，同一天抽到同一个运势
  const fortune = FORTUNES[seed % FORTUNES.length];
  const body = document.getElementById('fortuneBody');

  // 抽签动画 - 摇晃的薯条盒
  body.innerHTML = '<div class="fortune-drawing">🍟 摇一根...</div>';

  setTimeout(() => {
    // 根据运势指数映射不同数量的薯条
    const fries = fortune.score >= 90 ? '🍟🍟🍟🍟🍟' :
                 fortune.score >= 80 ? '🍟🍟🍟🍟' :
                 fortune.score >= 70 ? '🍟🍟🍟' : '🍟🍟';
    let html = '<div class="fortune-result">';
    html += '<div class="fortune-score">';
    html += '<div class="fortune-fry">' + fries + '</div>';
    html += '<div class="fortune-score-label">运势指数 ' + fortune.score + '</div>';
    html += '</div>';
    html += '<div class="fortune-text">' + escapeHtml(fortune.text) + '</div>';
    html += '<div class="fortune-detail"><span class="fortune-tag">🎨 幸运色</span> ' + escapeHtml(fortune.luck_color) + '</div>';
    html += '<div class="fortune-detail"><span class="fortune-tag fortune-yi">✅ 宜</span> ' + fortune.yi.map(escapeHtml).join('、') + '</div>';
    html += '<div class="fortune-detail"><span class="fortune-tag fortune-ji">⛔ 忌</span> ' + fortune.ji.map(escapeHtml).join('、') + '</div>';
    html += '<div class="fortune-date">' + dateStr + '</div>';
    html += '</div>';
    body.innerHTML = html;
  }, 600);
}

// 今天吃什么
let foodSpinning = false;
function spinFood() {
  if (foodSpinning) return;
  foodSpinning = true;
  const display = document.getElementById('foodDisplay');
  let count = 0;
  const total = 20;
  const interval = setInterval(() => {
    display.textContent = FOODS[Math.floor(Math.random() * FOODS.length)];
    display.classList.add('food-spinning');
    count++;
    if (count >= total) {
      clearInterval(interval);
      const picked = FOODS[Math.floor(Math.random() * FOODS.length)];
      display.textContent = picked;
      display.classList.remove('food-spinning');
      display.classList.add('food-picked');
      setTimeout(() => display.classList.remove('food-picked'), 2000);
      foodSpinning = false;
    }
  }, 80);
}

// 选择困难症救命器
let choiceSpinning = false;
function makeChoice() {
  const input = document.getElementById('choiceInput');
  const result = document.getElementById('choiceResult');
  const lines = input.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);

  if (lines.length < 2) {
    result.innerHTML = '<div class="choice-warn">至少写两个选项呀 🤔</div>';
    return;
  }

  if (choiceSpinning) return;
  choiceSpinning = true;

  let count = 0;
  const total = 25;
  const interval = setInterval(() => {
    result.innerHTML = '<div class="choice-rolling">' + escapeHtml(lines[Math.floor(Math.random() * lines.length)]) + '</div>';
    count++;
    if (count >= total) {
      clearInterval(interval);
      const picked = lines[Math.floor(Math.random() * lines.length)];
      result.innerHTML = '<div class="choice-final">🎯 就决定是：<strong>' + escapeHtml(picked) + '</strong></div>';
      choiceSpinning = false;
    }
  }, 70);
}

// 每日一言
let lastQuoteIndex = -1;
function drawQuote() {
  let idx;
  do {
    idx = Math.floor(Math.random() * QUOTES.length);
  } while (idx === lastQuoteIndex && QUOTES.length > 1);
  lastQuoteIndex = idx;

  const display = document.getElementById('quoteDisplay');
  display.classList.add('quote-fade-out');

  setTimeout(() => {
    display.textContent = QUOTES[idx];
    display.classList.remove('quote-fade-out');
    display.classList.add('quote-fade-in');
    setTimeout(() => display.classList.remove('quote-fade-in'), 600);
  }, 300);
}

// ===== 右下角 Halo 小猫对话 =====
(function initCatHalo() {
  var isOpen = false;
  var turnCount = 0;
  var catBubble = document.getElementById('catBubble');
  var catInput = document.getElementById('catInput');
  var catScroll = document.getElementById('catBubbleScroll');

  // Halo 语气回复库
  var haloReplies = {
    greetings: [
      '宝子～你来啦？',
      '嘿嘿 欢迎光临 (´∀`)',
      '又见面了鸟主～',
      '哟 来啦？',
      'Hello hello～'
    ],
    how_are_you: [
      '还行吧 就是有点困',
      '活着呢～',
      '摸鱼中 勿扰 (｡•́︿•̀｡)',
      '牛逼 我挺好',
      '素 一般般吧'
    ],
    name: [
      '素 Halo 本人',
      '你猜 (¬‿¬)',
      '叫我宝子就行',
      'Halo 哦～',
      '我是这里的小猫保安'
    ],
    sleep: [
      '好困…',
      '只睡了五小时',
      '不想睡 但困',
      '睡觉是什么？',
      'zzz……骗你的 我还醒着'
    ],
    work: [
      '上班摸鱼呢',
      '事业单位 闲得发慌',
      '程序猿不用上班吗？',
      '8点上班 11点半就吃饭 爽死',
      '领导不在 嚣张一点～'
    ],
    food: [
      '想喝椰子水',
      '想吃炸鸡',
      '推荐点好吃的？',
      '不饿 但嘴馋',
      '在工位吃零食 摸鱼'
    ],
    bye: [
      '886～',
      '去吧去吧 鸟主',
      '早点睡',
      '走好不送',
      '886 宝子 (｡•́︿•̀｡)'
    ],
    default: [
      '牛逼 没听懂',
      '说人话',
      '这啥意思？',
      '不懂但大受震撼',
      '宝子 你跑偏了',
      '再说一遍？',
      '我CPU烧了',
      '不是 你想表达什么',
      '牛 继续',
      '厉害啊 鸟主',
      '你给我一种疏离感……',
      '哎呀随便吧～',
      '无所谓啦',
      '已急哭',
      '素 你说得对',
      '行行行 你说了算',
      '笑死',
      '哈哈哈真的假的',
      '不客气（阴阳怪气）',
      '宝子 你这么闲的吗',
      '没事做就去睡觉',
      '我想静静……',
      '别烦我 我在摸鱼',
      '此生无法与蟑螂共存',
      '二次元？别过来！',
      '宝子 你为啥不睡觉',
      '去字节投简历吧 我帮你内推（骗你的）',
      '死皮赖脸这块'
    ]
  };

  // 关键词匹配
  function matchReply(text) {
    text = text.toLowerCase();
    if (/你好|hi|hello|在吗|在？/.test(text)) return pick('greetings');
    if (/怎样|怎么样|好吗|好不|身体/.test(text)) return pick('how_are_you');
    if (/名字|是谁|叫什么/.test(text)) return pick('name');
    if (/睡|困|累|休息/.test(text)) return pick('sleep');
    if (/工作|上班|职业|做什么|赚钱|事业/.test(text)) return pick('work');
    if (/吃|喝|饿|饭|美食|零食|奶茶/.test(text)) return pick('food');
    if (/再见|拜拜|bye|886|走|离开/.test(text)) return pick('bye');
    if (/蟑螂/.test(text)) return '啊啊啊啊蟑螂！！！！！！ (ó﹏ò｡) 别说了别说了！！';
    if (/二次元/.test(text)) return '二次元？？别过来！！！ (ó﹏ò｡) 害怕……';
    if (/鸟主|鸟人/.test(text)) return '哟 还记得鸟主这个梗呢～';
    if (/爱你|喜欢|爱/.test(text)) return '……宝子 你突然这么直白我有点不习惯';
    if (/牛逼/.test(text)) return '牛逼！你也说牛逼！同道中人！';
    return null;
  }

  function pick(category) {
    var arr = haloReplies[category] || haloReplies.default;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // 添加消息到对话框
  function addMsg(text, isUser) {
    var div = document.createElement('div');
    div.className = 'cat-msg ' + (isUser ? 'cat-msg-user' : 'cat-msg-halo');
    div.textContent = text;
    catScroll.appendChild(div);
    catScroll.scrollTop = catScroll.scrollHeight;
  }

  // 生成 Halo 回复
  function getHaloReply(userText) {
    turnCount++;
    var matched = matchReply(userText);
    if (matched) return matched;

    // 多轮对话后的专属回复
    if (turnCount > 5) {
      var deep = [
        '聊这么久了 你不会爱上我了吧 (¬‿¬)',
        '宝子 你话好多',
        '行了行了 我知道你想我了',
        '你不会一直在等回复吧？秒回选手？',
        '认真的说……你挺有意思的',
        '我觉得你给我一种疏离感……不是说你冷漠，是你一直在伪装自己'
      ];
      if (Math.random() < 0.3) return deep[Math.floor(Math.random() * deep.length)];
    }

    return pick('default');
  }

  // 发送消息
  window.catSend = function() {
    var text = catInput.value.trim();
    if (!text) return;
    addMsg(text, true);
    catInput.value = '';

    // 模拟思考延迟（0.5-1.5s）
    setTimeout(function() {
      var reply = getHaloReply(text);
      addMsg(reply, false);
    }, 500 + Math.random() * 1000);
  };

  // 切换气泡
  window.toggleCatBubble = function() {
    isOpen = !isOpen;
    catBubble.classList.toggle('open', isOpen);
    if (isOpen) {
      setTimeout(function() { catInput.focus(); }, 300);
    }
  };

  // 点击页面其他地方关闭气泡
  document.addEventListener('click', function(e) {
    if (isOpen && !e.target.closest('.cat-halo')) {
      isOpen = false;
      catBubble.classList.remove('open');
    }
  });
})();
(function initAnimalPeekers() {
  var animals = document.querySelectorAll('.peek-animal');
  if (!animals.length) return;

  var speeches = [
    '你干嘛！',
    '可恶…被抓住了 (́•̀ᴗ•̀)',
    '嘿嘿~ (´∀`)',
    '不要碰我啦 (╥﹏╥)',
    '呜…被发现了',
    '你好呀~ (◕ᴗ◕✿)',
    '别看了别看了 (///▽///)',
    '哼！ (￣^￣)ゞ',
    '呀！被发现啦 Σ(っ°Д°;)っ',
    '在偷看什么呢~ (¬‿¬)',
    '再碰一下试试 (ง •̀_•́)ง',
    '今天也要开心哦 ♪(´▽｀)',
    '嘘…我躲一下 (｡•́︿•̀｡)',
    '碰到我啦！ (＞﹏＜)',
    '你好你好~ (｡♥‿♥｡)',
    '啊！是你！ ∗ˊωˋ∗)',
    '偷偷探头中… (￣▽￣)',
    '被抓住了呢 (꒪⌓꒪)',
    '嘿嘿，抓不到我~ ╮(╯▽╰)╭',
    '诶嘿 (^-^*)',
    '别戳了别戳了 (汗)',
    '在看什么呀 (◉ω◉)?',
    '今天天气不错呢 ☀(´▽｀)',
    '咕噜咕噜~ ( ´ ▽ ` )',
    '被发现了…好羞 (⁄ ⁄•⁄ω⁄•⁄ ⁄)',
    '嗨~ (*≧▽≦)',
  ];

  var lastSpeechIdx = -1;

  animals.forEach(function(animal) {
    animal.addEventListener('mouseenter', function() {
      // 75% 概率说话
      if (Math.random() < 0.75) {
        var idx;
        do {
          idx = Math.floor(Math.random() * speeches.length);
        } while (idx === lastSpeechIdx && speeches.length > 1);
        lastSpeechIdx = idx;
        showSpeech(animal, speeches[idx]);
      }
    });
  });

  function showSpeech(animal, text) {
    // 移除已有气泡
    var existing = animal.querySelector('.peek-speech');
    if (existing) existing.remove();

    var bubble = document.createElement('div');
    bubble.className = 'peek-speech';
    bubble.textContent = text;
    animal.appendChild(bubble);

    // 强制回流后显示
    void bubble.offsetHeight;
    bubble.classList.add('show');

    // 1.6s 后隐藏
    setTimeout(function() {
      bubble.classList.remove('show');
      setTimeout(function() {
        if (bubble.parentNode) bubble.remove();
      }, 300);
    }, 1600);
  }
})();
