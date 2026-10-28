/* ===== חיים בקצב שלי — לוגיקת הבלוג ===== */
(function () {
  "use strict";

  /* ===== חיבור ל-Supabase — התוכן נשמר בענן, גלוי לכולם ולא נמחק ===== */
  const SUPABASE_URL = "https://epuxbcusjqcrjldjerzy.supabase.co";
  const SUPABASE_KEY = "sb_publishable_YN6haaSpC8uAwLk52sApSQ_4tNags9i";
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /* לייקים נשמרים מקומית אצל כל גולש (העדפה אישית, לא תוכן) */
  const LIKED_KEY = "haimBektzavSheli.liked.v1";
  const likedPosts = new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]"));
  function saveLiked() {
    localStorage.setItem(LIKED_KEY, JSON.stringify([...likedPosts]));
  }

  /* התוכן נטען מהענן — ראי loadAll() */

  /* ----- אלמנטים ----- */
  const grid = document.getElementById("posts-grid");
  const emptyState = document.getElementById("empty-state");
  const backdrop = document.getElementById("modal-backdrop");
  const form = document.getElementById("post-form");
  const toast = document.getElementById("toast");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const loginBackdrop = document.getElementById("login-backdrop");
  const loginForm = document.getElementById("login-form");
  const loginBtn = document.getElementById("owner-login");
  const loginError = document.getElementById("login-error");
  const wellnessGrid = document.getElementById("wellness-grid");
  const articleBackdrop = document.getElementById("article-backdrop");
  const articleForm = document.getElementById("article-form");
  const recsGrid = document.getElementById("recs-grid");
  const recsEmpty = document.getElementById("recs-empty");
  const recBackdrop = document.getElementById("rec-backdrop");
  const recForm = document.getElementById("rec-form");
  const shareLink = document.getElementById("share-link");
  const shareLinkBackdrop = document.getElementById("share-link-backdrop");
  const shareLinkForm = document.getElementById("share-link-form");
  const qaList = document.getElementById("qa-list");
  const qaEmpty = document.getElementById("qa-empty");
  const qaForm = document.getElementById("qa-form");

  let posts = [];
  let currentFilter = "all";
  let ownerMode = false;
  let articles = [];
  let recs = [];
  let questions = [];

  /* ----- טעינת כל התוכן מהענן ----- */
  async function loadAll() {
    const [p, c, a, r, q, featuredShare] = await Promise.all([
      db.from("posts").select("*").order("created_at", { ascending: false }),
      db.from("comments").select("*").order("created_at", { ascending: true }),
      db.from("articles").select("*").order("created_at", { ascending: false }),
      db.from("recs").select("*").order("created_at", { ascending: false }),
      db.from("questions").select("*").order("created_at", { ascending: false }),
      db.from("featured_share").select("url").eq("id", "main").maybeSingle(),
    ]);
    const err = p.error || c.error || a.error || r.error || q.error || featuredShare.error;
    if (err) {
      console.error("Supabase:", err);
      showToast("בעיה בחיבור לענן — ודאי שהרצת את קובץ ה-SQL 🙏");
    }
    const byPost = {};
    (c.data || []).forEach((cm) => {
      (byPost[cm.post_id] = byPost[cm.post_id] || []).push({ name: cm.name, text: cm.text });
    });
    posts = (p.data || []).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      media: row.media || "",
      likes: row.likes || 0,
      date: row.created_at,
      liked: likedPosts.has(row.id),
      comments: byPost[row.id] || [],
    }));
    articles = (a.data || []).map((row) => ({
      id: row.id,
      icon: row.icon,
      title: row.title,
      content: row.content,
      media: row.media || "",
      date: row.created_at,
    }));
    recs = (r.data || []).map((row) => ({ id: row.id, icon: row.icon, title: row.title, text: row.text, url: row.url, date: row.created_at }));
    questions = (q.data || []).map((row) => ({ id: row.id, name: row.name, email: row.email, text: row.text, answer: row.answer || "", date: row.created_at }));
    if (featuredShare.data) shareLink.href = featuredShare.data.url;
  }

  /* ----- עזרים ----- */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(iso) {
    return new Intl.DateTimeFormat("he-IL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  }

  const TYPE_LABELS = {
    blog: "✍️ בלוג",
    vlog: "🎬 וולוג",
    photo: "📸 תמונה",
    tips: "💡 בקשת טיפ",
  };

  function youtubeEmbed(url) {
    const m = String(url).match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/
    );
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  }

  /* בניית הטמל למדיה — מזהה את סוג הקישור אוטומטית */
  function buildMediaHtml(post) {
    if (!post.media) return "";
    const url = post.media.trim();
    const title = escapeHtml(post.title);

    /* תמונה (קישור או העלאה מהמכשיר) */
    if (/^data:image\//i.test(url) || /\.(png|jpe?g|gif|webp|avif|svg)(\?[^\s]*)?$/i.test(url)) {
      return `<div class="post-media"><img src="${url}" alt="${title}" loading="lazy" /></div>`;
    }

    /* סרטון YouTube */
    const yt = youtubeEmbed(url);
    if (yt) {
      return `<div class="post-media"><iframe src="${yt}" title="${title}" allowfullscreen loading="lazy"></iframe></div>`;
    }

    /* קובץ וידאו ישיר */
    if (/\.(mp4|webm|ogg|mov)(\?[^\s]*)?$/i.test(url)) {
      return `<div class="post-media"><video src="${url}" controls preload="metadata"></video></div>`;
    }

    /* פייסבוק — מוטמע בתוך הפוסט */
    if (/(facebook\.com|fb\.watch|fb\.com)/i.test(url)) {
      const isVideo = /(\/videos\/|\/reel\/|\/watch|fb\.watch)/i.test(url);
      const isPost = /(\/posts\/|\/permalink|story\.php|\/photos?\/|story_fbid)/i.test(url);
      let fb;
      if (isVideo) {
        /* סרטון / ריל */
        fb = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=true`;
      } else if (isPost) {
        /* פוסט ספציפי — מוצג כמו שהוא */
        fb = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true`;
      } else {
        /* דף פייסבוק — מוצג עם הפיד שלו */
        fb = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(url)}&tabs=timeline&hide_cover=false&show_facepile=true&small_header=false&adapt_container_width=true`;
      }
      return `<div class="post-media post-media-tall"><iframe src="${fb}" title="${title}" loading="lazy" scrolling="no" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe></div>`;
    }

    /* כל קישור אחר — כפתור קישור */
    return `<a class="post-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">🔗 לצפייה בקישור המצורף</a>`;
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2600);
  }

  /* ----- רינדור ----- */
  function render() {
    const visible = posts
      .filter((p) => currentFilter === "all" || p.type === currentFilter)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    grid.innerHTML = "";
    emptyState.hidden = visible.length > 0;

    visible.forEach((post) => grid.appendChild(buildCard(post)));
  }

  function buildCard(post) {
    const card = document.createElement("article");
    card.className = "post-card";
    card.id = `post-${post.id}`;

    /* מדיה — זיהוי אוטומטי של סוג הקישור */
    const mediaHtml = buildMediaHtml(post);

    const likedClass = post.liked ? " liked" : "";
    const commentsCount = post.comments.length;

    card.innerHTML = `
      ${mediaHtml}
      <div class="post-body">
        <div class="post-meta">
          <span class="badge badge-${post.type}">${TYPE_LABELS[post.type]}</span>
          <time datetime="${post.date}">${formatDate(post.date)}</time>
        </div>
        <h3 class="post-title"><a class="post-title-link" href="post.html?id=${post.id}">${escapeHtml(post.title)}</a></h3>
        <p class="post-content">${escapeHtml(post.content)}</p>
        <div class="post-actions">
          <button class="action-btn like-btn${likedClass}" type="button">
            ❤️ <span class="like-count">${post.likes}</span>
          </button>
          <button class="action-btn comments-toggle" type="button">
            💬 <span class="comments-count">${commentsCount}</span> תגובות
          </button>
          <button class="action-btn share-btn" type="button" title="שיתוף הפוסט">📤 שיתוף</button>
          <button class="action-btn edit-btn owner-only" type="button" title="עריכת פוסט">✏️</button>
          <button class="action-btn delete-btn owner-only" type="button" title="מחיקת פוסט">🗑️</button>
        </div>
        <div class="comments" hidden>
          <div class="comments-list"></div>
          <form class="comment-form">
            <input type="text" class="comment-name" placeholder="השם שלך" required />
            <input type="text" class="comment-text" placeholder="כתבי תגובה…" required />
            <button type="submit">שליחה</button>
          </form>
        </div>
      </div>
    `;

    /* אירועים */
    card.querySelector(".like-btn").addEventListener("click", async () => {
      post.liked = !post.liked;
      post.likes += post.liked ? 1 : -1;
      if (post.liked) likedPosts.add(post.id);
      else likedPosts.delete(post.id);
      saveLiked();
      render();
      await db.from("posts").update({ likes: post.likes }).eq("id", post.id);
    });

    const commentsBox = card.querySelector(".comments");
    const commentsList = card.querySelector(".comments-list");

    card.querySelector(".share-btn").addEventListener("click", async () => {
      const shareUrl = new URL(`post.html?id=${post.id}`, location.href).href;
      const shareData = {
        title: `${post.title} | חיים בקצב שלי`,
        text: post.content.slice(0, 120) + (post.content.length > 120 ? "…" : ""),
        url: shareUrl,
      };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (_e) { /* המשתמשת ביטלה */ }
      } else {
        try {
          await navigator.clipboard.writeText(`${shareData.text}\n${shareUrl}`);
          showToast("הקישור לפוסט הועתק — שתפי איפה שבא לך 📋");
        } catch (_e) {
          showToast("לא הצלחתי להעתיק — נסי שוב 🙏");
        }
      }
    });

    card.querySelector(".comments-toggle").addEventListener("click", () => {
      commentsBox.hidden = !commentsBox.hidden;
      if (!commentsBox.hidden) renderComments(post, commentsList);
    });

    card.querySelector(".comment-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const nameInput = e.target.querySelector(".comment-name");
      const textInput = e.target.querySelector(".comment-text");
      const name = nameInput.value.trim();
      const text = textInput.value.trim();
      if (!name || !text) return;
      const { error } = await db.from("comments").insert({ post_id: post.id, name, text });
      if (error) {
        showToast("שגיאה בשליחה — נסי שוב 🙏");
        return;
      }
      post.comments.push({ name, text });
      textInput.value = "";
      renderComments(post, commentsList);
      card.querySelector(".comments-count").textContent = post.comments.length;
      showToast("התגובה פורסמה 💬");
    });

    card.querySelector(".edit-btn").addEventListener("click", () => openEditModal(post));

    card.querySelector(".delete-btn").addEventListener("click", async () => {
      if (confirm("למחוק את הפוסט?")) {
        const { error } = await db.from("posts").delete().eq("id", post.id);
        if (error) {
          showToast("רק בעלת הבלוג יכולה למחוק 🔒");
          return;
        }
        posts = posts.filter((p) => p.id !== post.id);
        render();
        showToast("הפוסט נמחק");
      }
    });

    return card;
  }

  function renderComments(post, listEl) {
    listEl.innerHTML = post.comments.length
      ? post.comments
          .map(
            (c) =>
              `<div class="comment"><strong>${escapeHtml(c.name)}</strong>${escapeHtml(
                c.text
              )}</div>`
          )
          .join("")
      : `<div class="comment">היי הראשונה להגיב! ✨</div>`;
  }

  /* ----- פילטרים ----- */
  filterBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      render();
    })
  );

  /* ----- חלונית פוסט חדש ----- */
  const mediaUrlLabel = document.getElementById("media-url-label");
  const typeSelect = document.getElementById("post-type");
  let editingId = null;

  function openModal(presetType) {
    editingId = null;
    document.getElementById("modal-title").textContent = "פוסט חדש";
    if (presetType) typeSelect.value = presetType;
    syncMediaLabel();
    backdrop.hidden = false;
    document.getElementById("post-title").focus();
  }

  /* פתיחת החלונית במצב עריכה של פוסט קיים */
  function openEditModal(post) {
    editingId = post.id;
    document.getElementById("modal-title").textContent = "עריכת פוסט ✏️";
    typeSelect.value = post.type;
    document.getElementById("post-title").value = post.title;
    document.getElementById("post-content").value = post.content;
    document.getElementById("post-media-url").value =
      post.media && !String(post.media).startsWith("data:") ? post.media : "";
    syncMediaLabel();
    backdrop.hidden = false;
    document.getElementById("post-title").focus();
  }

  function closeModal() {
    editingId = null;
    document.getElementById("modal-title").textContent = "פוסט חדש";
    backdrop.hidden = true;
    form.reset();
  }

  function syncMediaLabel() {
    const t = typeSelect.value;
    if (t === "vlog") {
      mediaUrlLabel.firstChild.textContent = "קישור לסרטון — YouTube, פייסבוק או קובץ וידאו ";
    } else if (t === "photo") {
      mediaUrlLabel.firstChild.textContent = "קישור לתמונה — או העלי קובץ למטה ";
    } else {
      mediaUrlLabel.firstChild.textContent =
        "קישור לסרטון, תמונה או דף פייסבוק — לא חובה ";
    }
  }

  typeSelect.addEventListener("change", syncMediaLabel);

  document.getElementById("open-post-form").addEventListener("click", () => openModal());
  document.getElementById("close-modal").addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !backdrop.hidden) closeModal();
  });

  /* ----- מצב בעלת הבלוג (כניסה אמיתית דרך Supabase) ----- */
  function applyOwnerMode() {
    document.body.classList.toggle("owner-mode", ownerMode);
    loginBtn.textContent = ownerMode ? "🚪 יציאה ממצב עריכה" : "🔒 כניסת בעלת הבלוג";
  }

  loginBtn.addEventListener("click", async () => {
    if (ownerMode) {
      await db.auth.signOut();
      showToast("יצאת ממצב עריכה");
    } else {
      loginError.hidden = true;
      loginBackdrop.hidden = false;
      document.getElementById("owner-email").focus();
    }
  });

  document.getElementById("close-login").addEventListener("click", () => {
    loginBackdrop.hidden = true;
    loginForm.reset();
  });
  loginBackdrop.addEventListener("click", (e) => {
    if (e.target === loginBackdrop) loginBackdrop.hidden = true;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !loginBackdrop.hidden) loginBackdrop.hidden = true;
  });

  /* ----- עריכת הקישור המומלץ (נשמר בענן, רק בעלת הבלוג יכולה לערוך) ----- */
  function closeShareLinkModal() {
    shareLinkBackdrop.hidden = true;
    shareLinkForm.reset();
  }

  document.getElementById("edit-share-link").addEventListener("click", () => {
    document.getElementById("share-link-url").value = shareLink.href;
    shareLinkBackdrop.hidden = false;
    document.getElementById("share-link-url").focus();
  });
  document.getElementById("close-share-link-modal").addEventListener("click", closeShareLinkModal);
  shareLinkBackdrop.addEventListener("click", (e) => {
    if (e.target === shareLinkBackdrop) closeShareLinkModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !shareLinkBackdrop.hidden) closeShareLinkModal();
  });
  shareLinkForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = document.getElementById("share-link-url").value.trim();
    const { error } = await db.from("featured_share").upsert({ id: "main", url });
    if (error) {
      console.error("Supabase:", error);
      showToast("לא ניתן לשמור את הקישור — ודאי שאת מחוברת ושהרצת את קובץ ה-SQL 🙏");
      return;
    }
    shareLink.href = url;
    closeShareLinkModal();
    showToast("הקישור המומלץ נשמר ✨");
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("owner-email").value.trim();
    const password = document.getElementById("owner-password").value;
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      loginError.hidden = false;
    } else {
      loginBackdrop.hidden = true;
      loginForm.reset();
      showToast("שלום! נכנסת למצב עריכה ✏️");
    }
  });

  /* ----- יצירת פוסט ----- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("post-media-file");
    const url = document.getElementById("post-media-url").value.trim();

    const finish = async (media) => {
      const title = document.getElementById("post-title").value.trim();
      const content = document.getElementById("post-content").value.trim();
      if (editingId) {
        /* מצב עריכה — עדכון פוסט קיים בענן (לייקים ותגובות נשמרים) */
        const post = posts.find((p) => p.id === editingId);
        const updates = { type: typeSelect.value, title, content };
        if (post && (media || !String(post.media).startsWith("data:"))) updates.media = media;
        const { error } = await db.from("posts").update(updates).eq("id", editingId);
        if (error) {
          showToast("שגיאה בעדכון — נסי שוב 🙏");
          return;
        }
        if (post) Object.assign(post, updates);
        showToast("הפוסט עודכן ✏️");
      } else {
        const row = { id: "p" + Date.now(), type: typeSelect.value, title, content, media };
        const { error } = await db.from("posts").insert(row);
        if (error) {
          showToast("רק בעלת הבלוג יכולה לפרסם 🔒");
          return;
        }
        posts.unshift({ ...row, date: new Date().toISOString(), likes: 0, liked: false, comments: [] });
        showToast("הפוסט פורסם! 🎉");
      }
      closeModal();
      currentFilter = "all";
      filterBtns.forEach((b) => b.classList.toggle("active", b.dataset.filter === "all"));
      render();
      document.getElementById("feed").scrollIntoView({ behavior: "smooth" });
    };

    if (fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = () => finish(reader.result);
      reader.onerror = () => finish(url);
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      finish(url);
    }
  });

  /* ----- כתבות חיים בריאים (בענן) ----- */

  function renderWellness() {
    wellnessGrid.innerHTML = "";
    articles
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((a) => {
        const card = document.createElement("div");
        card.className = "wellness-card";
        const mediaHtml = a.media ? buildMediaHtml({ media: a.media, title: a.title }) : "";
        card.innerHTML = `
          ${mediaHtml}
          <div class="wellness-icon" aria-hidden="true">${escapeHtml(a.icon || "🌱")}</div>
          <h3>${escapeHtml(a.title)}</h3>
          <p>${escapeHtml(a.content)}</p>
          <div class="wellness-actions">
            <button class="action-btn wellness-edit owner-only" type="button" title="עריכת כתבה">✏️ עריכה</button>
            <button class="action-btn wellness-delete owner-only" type="button" title="מחיקת כתבה">🗑️ מחיקה</button>
          </div>
        `;
        card.querySelector(".wellness-edit").addEventListener("click", () => openEditArticleModal(a));
        card.querySelector(".wellness-delete").addEventListener("click", async () => {
          if (confirm("למחוק את הכתבה?")) {
            const { error } = await db.from("articles").delete().eq("id", a.id);
            if (error) {
              showToast("רק בעלת הבלוג יכולה למחוק 🔒");
              return;
            }
            articles = articles.filter((x) => x.id !== a.id);
            renderWellness();
            showToast("הכתבה נמחקה");
          }
        });
        wellnessGrid.appendChild(card);
      });
  }

  /* ----- חלונית כתבה: הוספה ועריכה ----- */
  let editingArticleId = null;

  function openArticleModal() {
    editingArticleId = null;
    document.getElementById("article-modal-title").textContent = "🌱 כתבה חדשה — חיים בריאים";
    articleBackdrop.hidden = false;
    document.getElementById("article-title").focus();
  }

  function openEditArticleModal(a) {
    editingArticleId = a.id;
    document.getElementById("article-modal-title").textContent = "עריכת כתבה ✏️";
    document.getElementById("article-icon").value = a.icon || "";
    document.getElementById("article-title").value = a.title;
    document.getElementById("article-content").value = a.content;
    document.getElementById("article-media").value = a.media || "";
    articleBackdrop.hidden = false;
    document.getElementById("article-title").focus();
  }

  function closeArticleModal() {
    editingArticleId = null;
    document.getElementById("article-modal-title").textContent = "🌱 כתבה חדשה — חיים בריאים";
    articleBackdrop.hidden = true;
    articleForm.reset();
  }

  document.getElementById("open-article-form").addEventListener("click", openArticleModal);
  document.getElementById("close-article-modal").addEventListener("click", closeArticleModal);
  articleBackdrop.addEventListener("click", (e) => {
    if (e.target === articleBackdrop) closeArticleModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !articleBackdrop.hidden) closeArticleModal();
  });

  articleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const media = document.getElementById("article-media").value.trim();
    const icon = document.getElementById("article-icon").value.trim() || "🌱";
    const title = document.getElementById("article-title").value.trim();
    const content = document.getElementById("article-content").value.trim();
    if (editingArticleId) {
      const { error } = await db.from("articles").update({ icon, title, content, media }).eq("id", editingArticleId);
      if (error) {
        showToast("שגיאה בעדכון — נסי שוב 🙏");
        return;
      }
      const a = articles.find((x) => x.id === editingArticleId);
      if (a) Object.assign(a, { icon, title, content, media });
      showToast("הכתבה עודכנה ✏️");
    } else {
      const row = { id: "w" + Date.now(), icon, title, content, media };
      const { error } = await db.from("articles").insert(row);
      if (error) {
        showToast("רק בעלת הבלוג יכולה לפרסם 🔒");
        return;
      }
      articles.unshift({ ...row, date: new Date().toISOString() });
      showToast("הכתבה פורסמה 🌿");
    }
    closeArticleModal();
    renderWellness();
  });

  /* ----- המלצות (בענן) ----- */

  function renderRecs() {
    recsGrid.innerHTML = "";
    recsEmpty.hidden = recs.length > 0;
    recs.forEach((r) => {
      const card = document.createElement("div");
      card.className = "rec-card";
      card.innerHTML = `
        <div class="rec-icon" aria-hidden="true">${escapeHtml(r.icon || "💛")}</div>
        <h4>${escapeHtml(r.title)}</h4>
        <p>${escapeHtml(r.text)}</p>
        <a class="rec-link" href="${escapeHtml(r.url)}" target="_blank" rel="noopener">לביקור ↗</a>
        <button class="action-btn wellness-delete owner-only" type="button" title="מחיקת המלצה">🗑️ מחיקה</button>
      `;
      card.querySelector(".rec-delete, .wellness-delete").addEventListener("click", async () => {
        if (confirm("למחוק את ההמלצה?")) {
          const { error } = await db.from("recs").delete().eq("id", r.id);
          if (error) {
            showToast("רק בעלת הבלוג יכולה למחוק 🔒");
            return;
          }
          recs = recs.filter((x) => x.id !== r.id);
          renderRecs();
          showToast("ההמלצה נמחקה");
        }
      });
      recsGrid.appendChild(card);
    });
  }

  document.getElementById("open-rec-form").addEventListener("click", () => {
    recBackdrop.hidden = false;
    document.getElementById("rec-title").focus();
  });
  document.getElementById("close-rec-modal").addEventListener("click", () => {
    recBackdrop.hidden = true;
    recForm.reset();
  });
  recBackdrop.addEventListener("click", (e) => {
    if (e.target === recBackdrop) recBackdrop.hidden = true;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !recBackdrop.hidden) recBackdrop.hidden = true;
  });

  recForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    let url = document.getElementById("rec-url").value.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const row = {
      id: "r" + Date.now(),
      icon: document.getElementById("rec-icon").value.trim() || "💛",
      title: document.getElementById("rec-title").value.trim(),
      text: document.getElementById("rec-text").value.trim(),
      url,
    };
    const { error } = await db.from("recs").insert(row);
    if (error) {
      showToast("רק בעלת הבלוג יכולה להוסיף 🔒");
      return;
    }
    recs.unshift({ ...row, date: new Date().toISOString() });
    recBackdrop.hidden = true;
    recForm.reset();
    renderRecs();
    showToast("ההמלצה נוספה 💛");
  });

  /* ----- שאלות ותשובות (בענן) ----- */

  function renderQA() {
    qaList.innerHTML = "";
    qaEmpty.hidden = questions.length > 0;
    questions
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((q) => {
        const card = document.createElement("div");
        card.className = "qa-card";
        card.innerHTML = `
          <div class="qa-question">
            <div class="qa-meta"><strong>${escapeHtml(q.name)}</strong> · <time>${formatDate(q.date)}</time></div>
            <p>${escapeHtml(q.text)}</p>
          </div>
          ${q.answer ? `<div class="qa-answer"><strong>התשובה שלי 💛</strong><p>${escapeHtml(q.answer)}</p></div>` : ""}
          <div class="qa-answer-form owner-only">
            <textarea rows="2" placeholder="כתבי תשובה…">${escapeHtml(q.answer || "")}</textarea>
            <button class="btn btn-primary" type="button">${q.answer ? "עדכון תשובה" : "פרסום תשובה"}</button>
          </div>
          <button class="action-btn qa-delete owner-only" type="button" title="מחיקת שאלה">🗑️ מחיקה</button>
        `;
        card.querySelector(".qa-answer-form button").addEventListener("click", async () => {
          const val = card.querySelector(".qa-answer-form textarea").value.trim();
          if (!val) return;
          const { error } = await db.from("questions").update({ answer: val }).eq("id", q.id);
          if (error) {
            showToast("רק בעלת הבלוג יכולה לענות 🔒");
            return;
          }
          q.answer = val;
          renderQA();
          showToast("התשובה פורסמה 💬");
        });
        card.querySelector(".qa-delete").addEventListener("click", async () => {
          if (confirm("למחוק את השאלה?")) {
            const { error } = await db.from("questions").delete().eq("id", q.id);
            if (error) {
              showToast("רק בעלת הבלוג יכולה למחוק 🔒");
              return;
            }
            questions = questions.filter((x) => x.id !== q.id);
            renderQA();
            showToast("השאלה נמחקה");
          }
        });
        qaList.appendChild(card);
      });
  }

  qaForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("qa-name").value.trim();
    const email = document.getElementById("qa-email").value.trim();
    const text = document.getElementById("qa-text").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("נא להזין כתובת אימייל תקינה 📧");
      return;
    }
    const row = { id: "q" + Date.now(), name, email, text, answer: "" };
    const { error } = await db.from("questions").insert(row);
    if (error) {
      showToast("שגיאה בשליחה — נסי שוב 🙏");
      return;
    }
    questions.unshift({ ...row, date: new Date().toISOString() });
    qaForm.reset();
    renderQA();
    showToast("השאלה נשלחה! 📮");
  });

  /* ----- יבוא תוכן ישן מהדפדפן לענן (פעם אחת, אחרי כניסה) ----- */
  async function importLocalIfWanted() {
    if (localStorage.getItem("haimBektzavSheli.imported.v1") === "1") return;
    const oldPosts = JSON.parse(localStorage.getItem("haimBektzavSheli.posts.v1") || "[]");
    const oldArticles = JSON.parse(localStorage.getItem("haimBektzavSheli.wellness.v1") || "[]");
    const oldRecs = JSON.parse(localStorage.getItem("haimBektzavSheli.recs.v1") || "[]");
    const oldQA = JSON.parse(localStorage.getItem("haimBektzavSheli.qa.v1") || "[]");
    const total = oldPosts.length + oldArticles.length + oldRecs.length + oldQA.length;
    if (!total) return;
    if (!confirm(`נמצאו ${total} פריטים שמורים בדפדפן.\nלייבא אותם לענן כדי שיישמרו לתמיד וכולם יראו? 🎉`)) return;
    for (const p of oldPosts) {
      await db.from("posts").upsert({ id: p.id, type: p.type, title: p.title, content: p.content, media: p.media || "", likes: p.likes || 0, created_at: p.date });
      for (const cm of p.comments || []) {
        await db.from("comments").insert({ post_id: p.id, name: cm.name, text: cm.text });
      }
    }
    for (const a of oldArticles) {
      await db.from("articles").upsert({ id: a.id, icon: a.icon, title: a.title, content: a.content, media: a.media || "", created_at: a.date });
    }
    for (const r of oldRecs) {
      await db.from("recs").upsert({ id: r.id, icon: r.icon, title: r.title, text: r.text, url: r.url, created_at: r.date });
    }
    for (const q of oldQA) {
      await db.from("questions").upsert({ id: q.id, name: q.name, email: q.email, text: q.text, answer: q.answer || "", created_at: q.date });
    }
    localStorage.setItem("haimBektzavSheli.imported.v1", "1");
    await loadAll();
    render();
    renderWellness();
    renderRecs();
    renderQA();
    showToast("הייבוא הסתיים — התוכן בענן! 🎉");
  }

  /* ----- מעקב כניסות לאתר (נשמר ב-Supabase, גלוי רק לבעלת הבלוג) ----- */
  async function trackPageView() {
    try {
      await db.from("page_views").insert({ path: location.pathname });
    } catch (_e) { /* טבלת page_views עוד לא קיימת — ראי supabase-setup.sql */ }
  }

  async function showViewsCount() {
    const counter = document.getElementById("views-counter");
    if (!counter) return;
    const { count, error } = await db.from("page_views").select("*", { count: "exact", head: true });
    if (error) return;
    document.getElementById("views-count").textContent = count.toLocaleString("he-IL");
    counter.hidden = false;
  }

  /* ----- אתחול ----- */
  let importAsked = false;
  db.auth.onAuthStateChange(async (_event, session) => {
    ownerMode = !!session;
    applyOwnerMode();
    if (ownerMode) {
      showViewsCount();
      if (!importAsked) {
        importAsked = true;
        await importLocalIfWanted();
      }
    }
  });

  /* קישורי שיתוף ישנים (#post-<id>) — גלילה לפוסט והדגשתו */
  function scrollToHashPost() {
    const m = location.hash.match(/^#post-(.+)$/);
    if (!m) return;
    const el = document.getElementById(`post-${m[1]}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlight");
  }

  async function init() {
    document.getElementById("year").textContent = new Date().getFullYear();
    trackPageView();
    const { data } = await db.auth.getSession();
    ownerMode = !!data.session;
    applyOwnerMode();
    if (ownerMode) showViewsCount();
    await loadAll();
    render();
    renderWellness();
    renderRecs();
    renderQA();
    scrollToHashPost();
  }
  init();
})();
