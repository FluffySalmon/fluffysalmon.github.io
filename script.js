/* ── nav toggle ── */
const menu = document.getElementById('menuToggle');
const links = document.getElementById('navLinks');
menu.onclick = () => links.classList.toggle('active');
document.querySelectorAll('.nav-links a').forEach(a => a.onclick = () => links.classList.remove('active'));

/* ── scroll reveal ── */
const reveal = () =>
  document.querySelectorAll('.reveal').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight - 100)
      el.classList.add('active');
  });
addEventListener('scroll', reveal);
addEventListener('load', reveal);

/* ── contact form placeholder ── */
const form = document.querySelector('.contact-form');
if (form) {
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.onclick = e => { e.preventDefault(); alert('Placeholder form — message not sent.'); };
}

/* ── simple markdown → HTML (headings, bold, italic, links, list items) ── */
function parseMarkdown(md) {
  return md
    .split('\n')
    .map(line => {
      // headings
      if (/^### (.+)/.test(line)) return `<h3>${line.replace(/^### /, '')}</h3>`;
      if (/^## (.+)/.test(line))  return `<h2>${line.replace(/^## /, '')}</h2>`;
      if (/^# (.+)/.test(line))   return `<h2>${line.replace(/^# /, '')}</h2>`;
      // list items
      if (/^- (.+)/.test(line))   return `<li>${renderInline(line.replace(/^- /, ''))}</li>`;
      // blank line → paragraph break
      if (line.trim() === '')     return '</p><p>';
      return renderInline(line);
    })
    .join('\n')
    .replace(/(<li>[\s\S]*?<\/li>)/g, m => `<ul>${m}</ul>`) // wrap li runs
    .replace(/<\/ul>\n?<ul>/g, '')                           // merge adjacent ul
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>\s*(<h[23]>)/g, '$1')
    .replace(/(<\/h[23]>)\s*<\/p>/g, '$1');
}

function renderInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

/* ── load about.md ── */
fetch('about.md')
  .then(r => r.text())
  .then(md => {
    // Split into biography section and influences section
    const parts = md.split(/^## Musical Influences/m);
    const bioMd = parts[0].replace(/^# About Me\s*/m, '').replace(/^## Biography\s*/m, '').trim();
    const influencesMd = parts[1] ? parts[1].trim() : '';

    document.getElementById('about-content').innerHTML = parseMarkdown(bioMd);

    if (influencesMd) {
      const items = influencesMd.split('\n').filter(l => l.startsWith('- '));
      const html = items.map(item => {
        const content = item.replace(/^- /, '');
        const [icon, ...rest] = content.split(' ');
        const text = rest.join(' ').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        return `<div class="influence-item"><span class="influence-icon">${icon}</span><span>${text}</span></div>`;
      }).join('');
      document.getElementById('influences-content').innerHTML = `<div class="influences-list">${html}</div>`;
    }
  })
  .catch(() => {
    document.getElementById('about-content').innerHTML = '<p>About content unavailable.</p>';
  });

/* ── load contact.md ── */
fetch('contact.md')
  .then(r => r.text())
  .then(md => {
    // Extract just the links/body below the headings
    const body = md
      .replace(/^# .+\n/m, '')
      .replace(/^## .+\n/m, '')
      .trim();
    const lines = body.split('\n');
    const linksHtml = lines
      .filter(l => l.startsWith('- '))
      .map(l => {
        const content = renderInline(l.replace(/^- /, ''));
        return `<div class="contact-link-item">${content}</div>`;
      }).join('');
    const paraLines = lines.filter(l => l.trim() && !l.startsWith('- ')).join(' ');
    document.getElementById('contact-content').innerHTML =
      `<p>${paraLines}</p><div class="socials">${linksHtml}</div>`;
  })
  .catch(() => {
    document.getElementById('contact-content').innerHTML = '<p>Contact content unavailable.</p>';
  });

/* ── CSV parser ── */
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1)
    .map(line => {
      // Handle quoted fields containing commas
      const fields = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          fields.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      fields.push(current.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = fields[i] || ''; });
      return obj;
    })
    // Skip rows that are overflow lines (e.g. a stray <script> tag from an
    // Instagram embed block that spilled onto its own CSV line)
    .filter(obj => obj.title && !obj.title.trim().startsWith('<'));
}

/* ── detect embed type and build embed HTML ── */
// Returns { html, isInstagram } so the caller knows to activate the SDK
// after the HTML is inserted into the live DOM.
function buildEmbed(raw, title) {
  if (!raw) return { html: '', isInstagram: false };

  // Instagram <blockquote> embed HTML supplied directly in the CSV cell.
  // The blockquote must be live in the DOM before the SDK processes it.
  if (raw.trimStart().startsWith('<blockquote')) {
    // Strip any <script> baked into the block; we load embed.js ourselves.
    const clean = raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').trim();
    return { html: `<div class="embed-wrapper embed-instagram">${clean}</div>`, isInstagram: true };
  }

  const url = raw.trim();

  // YouTube embed URL
  if (url.includes('youtube.com/embed/')) {
    return { html: `<div class="embed-wrapper">
      <iframe src="${url}" title="${title}" frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen></iframe>
    </div>`, isInstagram: false };
  }

  // YouTube watch or short URL → convert to embed
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
  if (ytMatch) {
    return { html: `<div class="embed-wrapper">
      <iframe src="https://www.youtube.com/embed/${ytMatch[1]}" title="${title}" frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen></iframe>
    </div>`, isInstagram: false };
  }

  // Plain Instagram URL (no blockquote provided)
  if (url.includes('instagram.com')) {
    return { html: `<div class="embed-wrapper embed-link">
      <a href="${url}" target="_blank" rel="noopener" class="btn primary embed-external-btn">
        ▶ Watch on Instagram
      </a>
    </div>`, isInstagram: false };
  }

  // Fallback: generic link
  return { html: `<div class="embed-wrapper embed-link">
    <a href="${url}" target="_blank" rel="noopener" class="btn primary embed-external-btn">
      ▶ Open Link
    </a>
  </div>`, isInstagram: false };
}

/* ── load Instagram embed.js exactly once, after blockquotes are in the DOM ── */
function activateInstagramEmbeds() {
  if (window.instgrm) {
    // SDK already loaded — just re-process any new blockquotes
    window.instgrm.Embeds.process();
    return;
  }
  // First time: load the script; it auto-processes on load
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.instagram.com/embed.js';
  document.body.appendChild(s);
}

/* ── load and render portfolio.csv ── */
fetch('portfolio.csv')
  .then(r => r.text())
  .then(csv => {
    const entries = parseCSV(csv);
    const grid = document.getElementById('music-grid');
    if (!entries.length) {
      grid.innerHTML = '<p style="color:var(--muted)">No portfolio entries found.</p>';
      return;
    }

    let hasInstagram = false;
    grid.innerHTML = entries.map(entry => {
      const { html, isInstagram } = buildEmbed(entry.link, entry.title);
      if (isInstagram) hasInstagram = true;
      return `
        <article class="music-card reveal">
          <div class="music-card-media">${html}</div>
          <div class="music-card-info">
            <span class="music-category">${entry.category || ''}</span>
            <h3>${entry.title || 'Untitled'}</h3>
            <span class="music-year">${entry.year || ''}</span>
            <p>${entry.description || ''}</p>
          </div>
        </article>`;
    }).join('');

    // Blockquotes are now live in the DOM — safe to activate the SDK
    if (hasInstagram) activateInstagramEmbeds();

    // Re-trigger reveal for newly added cards
    reveal();
  })
  .catch(() => {
    document.getElementById('music-grid').innerHTML =
      '<p style="color:var(--muted)">Could not load portfolio. Please try again later.</p>';
  });
