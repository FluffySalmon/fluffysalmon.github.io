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

/* ── build embed HTML ──
   crop = { left, top, right, bottom } in px.
   Positive value = clip that many px from that edge.
   Zero / empty = no crop on that edge. */
function buildEmbed(raw, title, crop = {}) {
  if (!raw) return '';

  const cl = parseFloat(crop.left)   || 0;
  const ct = parseFloat(crop.top)    || 0;
  const cr = parseFloat(crop.right)  || 0;
  const cb = parseFloat(crop.bottom) || 0;
  const hasCrop = cl || ct || cr || cb;

  // Wrap the embed in a clipping container.
  // Strategy: the inner .embed-wrapper is shifted via negative margins so the
  // cropped edges move outside the overflow:hidden outer box.
  function withCrop(innerHtml) {
    if (!hasCrop) return innerHtml;
    // Shift the inner block so unwanted edges are hidden by the outer clip.
    // margin-top:-N moves it up N px; the outer box clips N px from the top.
    const innerStyle = [
      ct ? `margin-top:-${ct}px;`    : '',
      cb ? `margin-bottom:-${cb}px;` : '',
      cl ? `margin-left:-${cl}px;`   : '',
      cr ? `margin-right:-${cr}px;`  : '',
    ].filter(Boolean).join('');
    return `<div class="embed-crop"><div style="${innerStyle}">${innerHtml}</div></div>`;
  }

  if (raw.trimStart().startsWith('<blockquote')) {
    const m = raw.match(/data-instgrm-permalink="https:\/\/www\.instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
    if (m) {
      const id = m[1];
      const iframe = `<div class="embed-wrapper">
        <iframe src="https://www.instagram.com/p/${id}/embed/"
          title="${title}" frameborder="0" scrolling="no"
          allow="encrypted-media; autoplay" allowfullscreen></iframe>
      </div>`;
      return withCrop(iframe);
    }
    const fb = raw.match(/data-instgrm-permalink="(https:\/\/www\.instagram\.com\/[^"?]+)/);
    const href = fb ? fb[1] : 'https://www.instagram.com/';
    return `<div class="embed-wrapper embed-link">
      <a href="${href}" target="_blank" rel="noopener" class="btn primary embed-external-btn">
        ▶ Watch on Instagram
      </a>
    </div>`;
  }

  const url = raw.trim();

  if (url.includes('youtube.com/embed/')) {
    return `<div class="embed-wrapper">
      <iframe src="${url}" title="${title}" frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen></iframe>
    </div>`;
  }

  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
  if (ytMatch) {
    return `<div class="embed-wrapper">
      <iframe src="https://www.youtube.com/embed/${ytMatch[1]}" title="${title}" frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen></iframe>
    </div>`;
  }

  if (url.includes('instagram.com')) {
    return `<div class="embed-wrapper embed-link">
      <a href="${url}" target="_blank" rel="noopener" class="btn primary embed-external-btn">
        ▶ Watch on Instagram
      </a>
    </div>`;
  }

  return `<div class="embed-wrapper embed-link">
    <a href="${url}" target="_blank" rel="noopener" class="btn primary embed-external-btn">
      ▶ Open Link
    </a>
  </div>`;
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

    grid.innerHTML = entries.map(entry => {
      const crop = {
        left:   entry.crop_left,
        top:    entry.crop_top,
        right:  entry.crop_right,
        bottom: entry.crop_bottom,
      };
      return `
      <article class="music-card reveal">
        <div class="music-card-media">${buildEmbed(entry.link, entry.title, crop)}</div>
        <div class="music-card-info">
          <span class="music-category">${entry.category || ''}</span>
          <h3>${entry.title || 'Untitled'}</h3>
          <span class="music-year">${entry.year || ''}</span>
          <p>${entry.description || ''}</p>
        </div>
      </article>`;
    }).join('');

    reveal();
  })
  .catch(() => {
    document.getElementById('music-grid').innerHTML =
      '<p style="color:var(--muted)">Could not load portfolio. Please try again later.</p>';
  });
