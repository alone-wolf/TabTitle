(function () {
  let titleObserver = null;
  let suppressObserver = false; // 防止 observer 自触发

  function initTabTitleModifier() {
    if (window.__TAB_TITLE_MODIFIER__) return;
    window.__TAB_TITLE_MODIFIER__ = true;

    const panel = document.createElement("div");
    panel.id = "tab-title-panel";

    panel.innerHTML = `
      <div class="header">Tab Title</div>
      <input type="text" placeholder="Enter new title" />
      <button>Apply</button>
    `;

    document.body.appendChild(panel);

    const input = panel.querySelector("input");
    const button = panel.querySelector("button");

    input.value = computeExpectedTitle(document.title);

    button.addEventListener("click", () => {
      const v = input.value.trim();
      if (v) applyTitle(v);
    });

    // 拖拽
    let dragging = false, offsetX = 0, offsetY = 0;
    const header = panel.querySelector(".header");

    header.addEventListener("mousedown", (e) => {
      dragging = true;
      offsetX = e.clientX - panel.offsetLeft;
      offsetY = e.clientY - panel.offsetTop;
    });

    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      panel.style.left = e.clientX - offsetX + "px";
      panel.style.top = e.clientY - offsetY + "px";
    });

    document.addEventListener("mouseup", () => {
      dragging = false;
    });

    startTitleObserver();
  }

  /** 每次都基于“当前 title”计算期望值 */
  function computeExpectedTitle(currentTitle) {
    const isChatGPT = location.host === "chatgpt.com";
    const isConversation = location.pathname.startsWith("/g/");
    if (!isChatGPT || !isConversation) return currentTitle;

    const prefix = "ChatGPT - ";
    if (currentTitle.startsWith(prefix)) {
      return currentTitle.slice(prefix.length);
    }
    return currentTitle;
  }

  function applyTitle(title) {
    suppressObserver = true;
    document.title = title;

    const input = document.querySelector("#tab-title-panel input");
    if (input && input.value !== title) {
      input.value = title;
    }

    // 下一轮微任务后恢复监听
    queueMicrotask(() => {
      suppressObserver = false;
    });
  }

  function startTitleObserver() {
    const titleEl = document.querySelector("title");
    if (!titleEl || titleObserver) return;

    titleObserver = new MutationObserver(() => {
      if (suppressObserver) return;

      const current = document.title;
      const expected = computeExpectedTitle(current);

      if (expected !== current) {
        applyTitle(expected);
      } else {
        // 同步 UI（例如 ChatGPT 切换会话）
        const input = document.querySelector("#tab-title-panel input");
        if (input && input.value !== current) {
          input.value = current;
        }
      }
    });

    titleObserver.observe(titleEl, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const current = document.title;
    const expected = computeExpectedTitle(current);
    if (expected !== current) {
      applyTitle(expected);
    }
  }

  function startAfterLoad() {
    const isChatGPT = location.host === "chatgpt.com";

    if (isChatGPT) {
      // 仅 ChatGPT 页面等待 5s
      setTimeout(initTabTitleModifier, 5000);
    } else {
      // 非 ChatGPT 页面直接执行
      initTabTitleModifier();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startAfterLoad);
  } else {
    startAfterLoad();
  }
})();
