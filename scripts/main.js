/* global marked */

async function loadJSON(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json();
}

function formatDate(value) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function renderPosts(posts) {
  const container = document.querySelector("#posts-list");
  if (!container) return;

  if (!Array.isArray(posts) || posts.length === 0) {
    container.innerHTML = "<p>No posts yet. Check back soon.</p>";
    return;
  }

  const sorted = posts
    .slice()
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  container.innerHTML = sorted
    .map((post) => {
      const html = marked.parse(post.content || "");
      const preview = html.length > 800 ? `${html.substring(0, 800)}…` : html;
      return `
        <article class="post-card">
          <h2>${post.title || "Untitled"}</h2>
          <div class="post-meta">${formatDate(post.publishedAt)}${post.tags ? ` · ${post.tags.join(", ")}` : ""}</div>
          <div class="post-preview">${preview}</div>
        </article>
      `;
    })
    .join("\n");
}

function renderProjects(projects) {
  const container = document.querySelector("#projects-grid");
  if (!container) return;

  if (!Array.isArray(projects) || projects.length === 0) {
    container.innerHTML = "<p>No projects yet. Check back soon.</p>";
    return;
  }

  const sorted = projects
    .slice()
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  container.innerHTML = sorted
    .map((project) => {
      return `
        <article class="project-card">
          <h3>${project.title || "Untitled Project"}</h3>
          <div class="project-description">${project.description || ""}</div>
          ${project.url ? `<div style="margin-top: 1rem;"><a class="button" href="${project.url}" target="_blank" rel="noopener">View Project</a></div>` : ""}
        </article>
      `;
    })
    .join("\n");
}

async function init() {
  try {
    const [posts, projects] = await Promise.all([
      loadJSON("data/posts.json"),
      loadJSON("data/projects.json")
    ]);

    renderPosts(posts);
    renderProjects(projects);
  } catch (error) {
    console.error(error);
    const postsList = document.querySelector("#posts-list");
    const projectsGrid = document.querySelector("#projects-grid");

    if (postsList) {
      postsList.innerHTML = `<p>Could not load posts. ${error.message}</p>`;
    }
    if (projectsGrid) {
      projectsGrid.innerHTML = `<p>Could not load projects. ${error.message}</p>`;
    }
  }
}

init();
