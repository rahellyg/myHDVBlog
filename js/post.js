/* ===== חיים בקצב שלי — דף פוסט יחיד (כתובת ייעודית לכל פוסט, לשיתוף וקידום) ===== */
(function () {
  "use strict";

  const SUPABASE_URL = "https://epuxbcusjqcrjldjerzy.supabase.co";
  const SUPABASE_KEY = "sb_publishable_YN6haaSpC8uAwLk52sApSQ_4tNags9i";
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /* לייקים נשמרים מקומית אצל כל גולש — אותו מפתח כמו בעמוד הראשי */
  const LIKED_KEY = "haimBektzavSheli.liked.v1";
  const likedPosts = new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]"));
  function saveLiked() {
    localStorage.setItem(LIKED_KEY, JSON.stringify([...likedPosts]));
  }

  const container = document.getElementById("post-container");
  const loadingState = document.getElementById("loading-state");
  const notFound = document.getElementById("not-found");
  const toast = document.getElementById("toast");

  const TYPE_LABELS = {
    blog: "✍️ בלוג",
    vlog: "🎬 וולוג",
    photo: "📸 תמונה",
    tips: "💡 בקשת טיפ",
  };

  /* ----- עזרים (זהים לעמוד הראשי) ----- */
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

  function youtubeEmbed(url) {
    const m = String(url).match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/
    );
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  }

  function isImageUrl(url) {
    return /^data:image\//i.test(url) || /\.(png|jpe?g|gif|webp|avif|svg)(\?[^\s]*)?$/i.test(url);
  }

  function buildMediaHtml(post) {
    if (!post.media) return "";
    const url = post.media.trim();
    const title = escapeHtml(post.title);

    if (isImageUrl(url)) {
      return `<div class="post-media"><img src="${url}" alt="${title}" /></div>`;
    }

    const yt = youtubeEmbed(url);
    if (yt) {
      return `<div class="post-media"><iframe src="${yt}" title="${title}" allowfullscreen></iframe></div>`;
    }

    if (/\.(mp4|webm|ogg|mov)(\?[^\s]*)?$/i.test(url)) {
      return `<div class="post-media"><video src="${url}" controls preload="metadata"></video></div>`;
    }

    if (/(facebook\.com|fb\.watch|fb\.com)/i.test(url)) {
      const isVideo = /(\/videos\/|\/reel\/|\/watch|fb\.watch)/i.test(url);
      const isPost = /(\/posts\/|\/permalink|story\.php|\/photos?\/|story_fbid)/i.test(url);
      let fb;
      if (isVideo) {
        fb = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=true`;
      } else if (isPost) {
        fb = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true`;
      } else {
        fb = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(url)}&tabs=timeline&hide_cover=false&show_facepile=true&small_header=false&adapt_container_width=true`;
      }
      return `<div class="post-media post-media-tall"><iframe src="${fb}" title="${title}" scrolling="no" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe></div>`;
    }

    return `<a class="post-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">🔗 לצפייה בקישור המצורף</a>`;
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function postUrl(id) {
    return new URL(`post.html?id=${encodeURIComponent(id)}`, location.href).href;
  }

  /* ----- עדכון מטא-תגיות ל-SEO ושיתוף — גוגל מרנדר JavaScript וקולט אותן ----- */
  function setMeta(post) {
    const url = postUrl(post.id);
    const desc = post.content.slice(0, 150) + (post.content.length > 150 ? "…" : "");
    const title = `${post.title} | חיים בקצב שלי`;
    const image = /^https?:\/\//i.test(post.media) && isImageUrl(post.media)
      ? post.media
      : "https://rahellyg.github.io/myHDVBlog/banner.png";

    document.title = title;
    document.querySelector('meta[name="description"]').setAttribute("content", desc);
    document.getElementById("canonical-link").setAttribute("href", url);
    document.getElementById("og-title").setAttribute("content", title);
    document.getElementById("og-description").setAttribute("content", desc);
    document.getElementById("og-url").setAttribute("content", url);
    document.getElementById("og-image").setAttribute("content", image);
    document.getElementById("twitter-title").setAttribute("content", title);
    document.getElementById("twitter-description").setAttribute("content", desc);
    document.getElementById("twitter-image").setAttribute("content", image);

    const ld = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: desc,
      datePublished: post.date,
      inLanguage: "he",
      url: url,
      mainEntityOfPage: url,
      image: image,
      isPartOf: {
        "@type": "Blog",
        name: "חיים בקצב שלי",
        url: "https://rahellyg.github.io/myHDVBlog/",
      },
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
  }

  /* ----- רינדור הפוסט ----- */
  function renderPost(post) {
    const card = document.createElement("article");
    card.className = "post-card";
    card.id = `post-${post.id}`;

    const likedClass = post.liked ? " liked" : "";

    card.innerHTML = `
      ${buildMediaHtml(post)}
      <div class="post-body">
        <div class="post-meta">
          <span class="badge badge-${post.type}">${TYPE_LABELS[post.type] || post.type}</span>
          <time datetime="${post.date}">${formatDate(post.date)}</time>
        </div>
        <h1 class="post-title">${escapeHtml(post.title)}</h1>
        <p class="post-content">${escapeHtml(post.content)}</p>
        <div class="post-actions">
          <button class="action-btn like-btn${likedClass}" type="button">
            ❤️ <span class="like-count">${post.likes}</span>
          </button>
          <button class="action-btn share-btn" type="button" title="שיתוף הפוסט">📤 שיתוף</button>
        </div>
        <div class="comments">
          <div class="comments-list"></div>
          <form class="comment-form">
            <input type="text" class="comment-name" placeholder="השם שלך" required />
            <input type="text" class="comment-text" placeholder="כתבי תגובה…" required />
            <button type="submit">שליחה</button>
          </form>
        </div>
      </div>
    `;

    card.querySelector(".like-btn").addEventListener("click", async () => {
      post.liked = !post.liked;
      post.likes += post.liked ? 1 : -1;
      if (post.liked) likedPosts.add(post.id);
      else likedPosts.delete(post.id);
      saveLiked();
      const btn = card.querySelector(".like-btn");
      btn.classList.toggle("liked", post.liked);
      btn.querySelector(".like-count").textContent = post.likes;
      await db.from("posts").update({ likes: post.likes }).eq("id", post.id);
    });

    card.querySelector(".share-btn").addEventListener("click", async () => {
      const shareUrl = postUrl(post.id);
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

    const commentsList = card.querySelector(".comments-list");
    renderComments(post, commentsList);

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
      showToast("התגובה פורסמה 💬");
    });

    container.appendChild(card);
  }

  function renderComments(post, listEl) {
    listEl.innerHTML = post.comments.length
      ? post.comments
          .map(
            (c) =>
              `<div class="comment"><strong>${escapeHtml(c.name)}</strong>${escapeHtml(c.text)}</div>`
          )
          .join("")
      : `<div class="comment">היי הראשונה להגיב! ✨</div>`;
  }

  /* ----- מעקב כניסות (כמו בעמוד הראשי) ----- */
  async function trackPageView() {
    try {
      await db.from("page_views").insert({ path: location.pathname + location.search });
    } catch (_e) { /* טבלת page_views עוד לא קיימת */ }
  }

  /* ----- אתחול ----- */
  async function init() {
    document.getElementById("year").textContent = new Date().getFullYear();
    trackPageView();

    const id = new URLSearchParams(location.search).get("id");
    if (!id) {
      loadingState.hidden = true;
      notFound.hidden = false;
      return;
    }

    const [p, c] = await Promise.all([
      db.from("posts").select("*").eq("id", id).maybeSingle(),
      db.from("comments").select("*").eq("post_id", id).order("created_at", { ascending: true }),
    ]);

    loadingState.hidden = true;

    if (p.error || !p.data) {
      notFound.hidden = false;
      return;
    }

    const post = {
      id: p.data.id,
      type: p.data.type,
      title: p.data.title,
      content: p.data.content,
      media: p.data.media || "",
      likes: p.data.likes || 0,
      date: p.data.created_at,
      liked: likedPosts.has(p.data.id),
      comments: (c.data || []).map((cm) => ({ name: cm.name, text: cm.text })),
    };

    setMeta(post);
    renderPost(post);
  }

  init();
})();
