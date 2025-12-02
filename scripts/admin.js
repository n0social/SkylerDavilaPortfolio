/* global ADMIN_CONFIG, marked */

const state = {
  posts: [],
  projects: [],
  editingPostId: null,
  editingProjectId: null
};

const selectors = {
  loginOverlay: document.querySelector("#login-overlay"),
  loginForm: document.querySelector("#login-form"),
  loginError: document.querySelector("#login-error"),
  adminWrapper: document.querySelector(".admin-wrapper"),
  postForm: document.querySelector("#post-form"),
  postPreview: document.querySelector("#post-preview"),
  postsTableBody: document.querySelector("#posts-table-body"),
  downloadPostsButton: document.querySelector("#download-posts"),
  importPostsInput: document.querySelector("#import-posts"),
  githubPostsButton: document.querySelector("#commit-posts"),
  githubToken: document.querySelector("#github-token"),
  githubMessage: document.querySelector("#github-message"),
  projectForm: document.querySelector("#project-form"),
  projectsTableBody: document.querySelector("#projects-table-body"),
  downloadProjectsButton: document.querySelector("#download-projects"),
  importProjectsInput: document.querySelector("#import-projects"),
  githubProjectsButton: document.querySelector("#commit-projects"),
  statusText: document.querySelector("#status-text")
};

const publishState = {
  posts: false,
  projects: false
};

async function sha256(value) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function setStatus(message, tone = "muted") {
  if (!selectors.statusText) return;
  selectors.statusText.textContent = message;
  selectors.statusText.dataset.tone = tone;
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(selectors.loginForm);
  const password = formData.get("password")?.toString() ?? "";
  const hashed = await sha256(password);

  if (hashed === ADMIN_CONFIG.passwordHash) {
    selectors.loginOverlay.classList.add("hidden");
    selectors.adminWrapper.classList.remove("hidden");
    localStorage.setItem("skyler-admin-session", "true");
    await loadInitialData();
  } else {
    selectors.loginError.textContent = "Incorrect password.";
  }
}

async function loadInitialData() {
  setStatus("Loading data...");
  try {
    const [posts, projects] = await Promise.all([
      fetch("data/posts.json", { cache: "no-store" }).then((res) => res.json()),
      fetch("data/projects.json", { cache: "no-store" }).then((res) => res.json())
    ]);
    state.posts = Array.isArray(posts) ? posts : [];
    state.projects = Array.isArray(projects) ? projects : [];

    renderPosts();
    renderProjects();
    setStatus("Data loaded.", "success");
  } catch (error) {
    console.error(error);
    setStatus(`Failed to load data: ${error.message}`, "error");
  }
}

function renderPosts() {
  if (!selectors.postsTableBody) return;
  const sorted = state.posts
    .slice()
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  selectors.postsTableBody.innerHTML = sorted
    .map((post) => {
      return `
        <tr data-id="${post.id}">
          <td>${post.title}</td>
          <td>${new Date(post.publishedAt).toLocaleString()}</td>
          <td>${Array.isArray(post.tags) ? post.tags.join(", ") : ""}</td>
          <td>
            <button class="button" data-action="edit-post">Edit</button>
            <button class="button" data-action="delete-post">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderProjects() {
  if (!selectors.projectsTableBody) return;
  const sorted = state.projects.slice();

  selectors.projectsTableBody.innerHTML = sorted
    .map((project) => {
      return `
        <tr data-id="${project.id}">
          <td>${project.title}</td>
          <td>${project.url || ""}</td>
          <td>${project.featured ? "Yes" : "No"}</td>
          <td>
            <button class="button" data-action="edit-project">Edit</button>
            <button class="button" data-action="delete-project">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function resetPostForm() {
  state.editingPostId = null;
  selectors.postForm.reset();
  syncMarkdownPreview();
  selectors.postForm.querySelector("button[type='submit']").textContent = "Create Post";
}

function resetProjectForm() {
  state.editingProjectId = null;
  selectors.projectForm.reset();
  selectors.projectForm.querySelector("button[type='submit']").textContent = "Create Project";
}

function syncMarkdownPreview() {
  const content = selectors.postForm.querySelector("textarea[name='content']").value;
  selectors.postPreview.innerHTML = marked.parse(content || "");
}

async function handlePostSubmit(event) {
  event.preventDefault();
  const formData = new FormData(selectors.postForm);

  const rawTitle = formData.get("title")?.toString() ?? "Untitled";
  const tags = formData
    .get("tags")
    ?.toString()
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean) ?? [];
  const content = formData.get("content")?.toString() ?? "";

  const isEditing = Boolean(state.editingPostId);
  const baseId = slugify(rawTitle || "post");
  let targetId = state.editingPostId ?? baseId;
  const existing = isEditing ? state.posts.find((post) => post.id === targetId) : null;

  if (!isEditing && state.posts.some((post) => post.id === targetId)) {
    targetId = `${baseId}-${Date.now()}`;
  }

  const payload = {
    id: targetId,
    title: rawTitle,
    publishedAt: existing?.publishedAt ?? new Date().toISOString(),
    tags,
    content
  };

  if (isEditing) {
    state.posts = state.posts.map((post) => (post.id === targetId ? payload : post));
  } else {
    state.posts.push(payload);
  }

  renderPosts();
  resetPostForm();

  const verb = isEditing ? "Updated" : "Created";
  await publishAfterChange("posts", `${verb} post ${payload.title}.`);
}

async function handleProjectSubmit(event) {
  event.preventDefault();
  const formData = new FormData(selectors.projectForm);

  const rawTitle = formData.get("title")?.toString() ?? "Untitled Project";
  const description = formData.get("description")?.toString() ?? "";
  const url = formData.get("url")?.toString() ?? "";
  const featured = formData.get("featured") === "on";

  const isEditing = Boolean(state.editingProjectId);
  const baseId = slugify(rawTitle || "project");
  let targetId = state.editingProjectId ?? baseId;

  if (!isEditing && state.projects.some((project) => project.id === targetId)) {
    targetId = `${baseId}-${Date.now()}`;
  }

  const payload = {
    id: targetId,
    title: rawTitle,
    description,
    url,
    featured
  };

  if (isEditing) {
    state.projects = state.projects.map((project) => (project.id === targetId ? payload : project));
  } else {
    state.projects.push(payload);
  }

  renderProjects();
  resetProjectForm();

  const verb = isEditing ? "Updated" : "Created";
  await publishAfterChange("projects", `${verb} project ${payload.title}.`);
}

async function handlePostsTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest("tr[data-id]");
  const id = row?.dataset.id;
  if (!id) return;

  if (button.dataset.action === "edit-post") {
    const post = state.posts.find((item) => item.id === id);
    if (!post) return;
    state.editingPostId = id;
    selectors.postForm.querySelector("input[name='title']").value = post.title;
    selectors.postForm.querySelector("input[name='tags']").value = (post.tags || []).join(", ");
    selectors.postForm.querySelector("textarea[name='content']").value = post.content;
    selectors.postForm.querySelector("button[type='submit']").textContent = "Update Post";
    syncMarkdownPreview();
  }

  if (button.dataset.action === "delete-post") {
    const confirmed = window.confirm("Delete this post? This cannot be undone.");
    if (!confirmed) return;
    const removed = state.posts.find((post) => post.id === id);
    state.posts = state.posts.filter((post) => post.id !== id);
    renderPosts();
    await publishAfterChange("posts", `Deleted post ${removed?.title ?? id}.`);
  }
}

async function handleProjectsTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest("tr[data-id]");
  const id = row?.dataset.id;
  if (!id) return;

  if (button.dataset.action === "edit-project") {
    const project = state.projects.find((item) => item.id === id);
    if (!project) return;
    state.editingProjectId = id;
    selectors.projectForm.querySelector("input[name='title']").value = project.title;
    selectors.projectForm.querySelector("textarea[name='description']").value = project.description || "";
    selectors.projectForm.querySelector("input[name='url']").value = project.url || "";
    selectors.projectForm.querySelector("input[name='featured']").checked = Boolean(project.featured);
    selectors.projectForm.querySelector("button[type='submit']").textContent = "Update Project";
  }

  if (button.dataset.action === "delete-project") {
    const confirmed = window.confirm("Delete this project? This cannot be undone.");
    if (!confirmed) return;
    const removed = state.projects.find((project) => project.id === id);
    state.projects = state.projects.filter((project) => project.id !== id);
    renderProjects();
    await publishAfterChange("projects", `Deleted project ${removed?.title ?? id}.`);
  }
}

function downloadJSONFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function handlePostsDownload() {
  downloadJSONFile("posts.json", state.posts);
}

function handleProjectsDownload() {
  downloadJSONFile("projects.json", state.projects);
}

async function handleImport(event, type) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed)) {
        throw new Error("File must contain an array");
      }
      if (type === "posts") {
        state.posts = parsed;
        renderPosts();
        publishAfterChange("posts", "Imported posts.");
      }
      if (type === "projects") {
        state.projects = parsed;
        renderProjects();
        publishAfterChange("projects", "Imported projects.");
      }
    } catch (error) {
      setStatus(`Import failed: ${error.message}`, "error");
    }
  };
  reader.readAsText(file);
}

async function fetchGitHubFile(path, token) {
  const url = `https://api.github.com/repos/${ADMIN_CONFIG.repoOwner}/${ADMIN_CONFIG.repoName}/contents/${path}`;
  const response = await fetch(url, {
    headers: { Authorization: `token ${token}` }
  });
  if (response.status === 404) {
    return { sha: undefined };
  }
  if (!response.ok) {
    throw new Error(`GitHub fetch failed: ${response.status}`);
  }
  const json = await response.json();
  return { sha: json.sha };
}

async function commitToGitHub({ path, content, message }) {
  const token = selectors.githubToken.value.trim();
  if (!token) {
    throw new Error("GitHub token is required for commits.");
  }
  if (!ADMIN_CONFIG.repoOwner || !ADMIN_CONFIG.repoName) {
    throw new Error("Configure repoOwner and repoName in config.js first.");
  }

  const base64Content = btoa(unescape(encodeURIComponent(content)));
  const existing = await fetchGitHubFile(path, token);

  const url = `https://api.github.com/repos/${ADMIN_CONFIG.repoOwner}/${ADMIN_CONFIG.repoName}/contents/${path}`;
  const body = {
    message,
    content: base64Content,
    branch: ADMIN_CONFIG.defaultBranch,
    sha: existing.sha
  };

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub commit failed: ${response.status} ${text}`);
  }
}

function hasGitHubPublishConfig() {
  const token = selectors.githubToken.value.trim();
  return Boolean(
    token &&
      ADMIN_CONFIG.repoOwner &&
      ADMIN_CONFIG.repoName &&
      ADMIN_CONFIG.defaultBranch
  );
}

async function publishAfterChange(kind, baseMessage) {
  if (!hasGitHubPublishConfig()) {
    setStatus(
      `${baseMessage} Saved locally. Provide a GitHub token and repo info to publish automatically.`,
      "muted"
    );
    return;
  }

  if (publishState[kind]) {
    setStatus(`${baseMessage} Publish already in progress...`, "muted");
    return;
  }

  const button = kind === "posts" ? selectors.githubPostsButton : selectors.githubProjectsButton;
  const message = selectors.githubMessage.value || `Update ${kind}.json`;
  const path = kind === "posts" ? "data/posts.json" : "data/projects.json";
  const payload = kind === "posts" ? state.posts : state.projects;

  publishState[kind] = true;
  if (button) button.disabled = true;

  try {
    setStatus(`${baseMessage} Publishing to GitHub...`, "muted");
    await commitToGitHub({
      path,
      content: JSON.stringify(payload, null, 2),
      message
    });
    setStatus(`${baseMessage} Published to GitHub.`, "success");
  } catch (error) {
    console.error(error);
    setStatus(`${baseMessage} Publishing failed: ${error.message}`, "error");
  } finally {
    publishState[kind] = false;
    if (button) button.disabled = false;
  }
}

async function handleCommitPosts() {
  try {
    selectors.githubPostsButton.disabled = true;
    setStatus("Committing posts.json to GitHub...");
    await commitToGitHub({
      path: "data/posts.json",
      content: JSON.stringify(state.posts, null, 2),
      message: selectors.githubMessage.value || "Update posts.json"
    });
    setStatus("posts.json committed to GitHub.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  } finally {
    selectors.githubPostsButton.disabled = false;
  }
}

async function handleCommitProjects() {
  try {
    selectors.githubProjectsButton.disabled = true;
    setStatus("Committing projects.json to GitHub...");
    await commitToGitHub({
      path: "data/projects.json",
      content: JSON.stringify(state.projects, null, 2),
      message: selectors.githubMessage.value || "Update projects.json"
    });
    setStatus("projects.json committed to GitHub.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  } finally {
    selectors.githubProjectsButton.disabled = false;
  }
}

function restoreSession() {
  const hasSession = localStorage.getItem("skyler-admin-session") === "true";
  if (!hasSession) return;
  selectors.loginOverlay.classList.add("hidden");
  selectors.adminWrapper.classList.remove("hidden");
  loadInitialData();
}

function wireEvents() {
  selectors.loginForm.addEventListener("submit", handleLogin);
  selectors.postForm.addEventListener("submit", handlePostSubmit);
  selectors.postForm.addEventListener("reset", (event) => {
    event.preventDefault();
    resetPostForm();
  });
  selectors.postForm.querySelector("textarea[name='content']").addEventListener("input", syncMarkdownPreview);
  selectors.postsTableBody.addEventListener("click", handlePostsTableClick);
  selectors.downloadPostsButton.addEventListener("click", handlePostsDownload);
  selectors.importPostsInput.addEventListener("change", (event) => handleImport(event, "posts"));

  selectors.projectForm.addEventListener("submit", handleProjectSubmit);
  selectors.projectForm.addEventListener("reset", (event) => {
    event.preventDefault();
    resetProjectForm();
  });
  selectors.projectsTableBody.addEventListener("click", handleProjectsTableClick);
  selectors.downloadProjectsButton.addEventListener("click", handleProjectsDownload);
  selectors.importProjectsInput.addEventListener("change", (event) => handleImport(event, "projects"));

  selectors.githubPostsButton.addEventListener("click", handleCommitPosts);
  selectors.githubProjectsButton.addEventListener("click", handleCommitProjects);

  document.querySelector("#logout")?.addEventListener("click", () => {
    localStorage.removeItem("skyler-admin-session");
    window.location.reload();
  });
}

function init() {
  if (!window.crypto?.subtle) {
    setStatus("Browser lacks Web Crypto support. Admin tools require a modern browser.", "error");
    return;
  }
  wireEvents();
  restoreSession();
}

init();
