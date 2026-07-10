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

/* ── contact form submit ── */
const form = document.querySelector('.contact-form');
if (form) {
  const action="https://api.web3forms.com/submit";
  const access_key = "e0d19a99-adfc-4c09-abed-78d367e57bcf";
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.onclick = async e => {
    e.preventDefault();
    const originalBtnText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending...';

    // Build FormData manually from inputs/textareas/selects
    const formData = new FormData();
    form.querySelectorAll('input, textarea, select').forEach(field => {
      if (field.name) formData.append(field.name, field.value);
    });
    formData.append('access_key', access_key);
    console.log('--- Payload being sent ---');
    for (let [key, value] of formData.entries()) {
        console.log(key, ':', value);
    }
    try {
      const response = await fetch(action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });
      const result = await response.json();
      console.log('Response body:', result);   // 👈 shows { success: true, message: ... }

      if (response.ok) {
        alert('Message sent successfully!');
        // manually clear fields (placeholders reappear automatically)
        form.querySelectorAll('input, textarea, select').forEach(f => {
          f.value = '';
        });
      } else {
        console.log('Something went wrong. Please try again.');
      }
    } catch (error) {
      console.log('Encounter error. Please try again.', error);
    } finally {
      btn.disabled = false;
      btn.textContent = originalBtnText;
    }
  };
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

/* ── Portfolio text parser ──
   Format: blocks separated by blank lines.
   Each line: "key: value" or "key:" (empty value)
   Value is everything after the first colon (and optional space). */
function parsePortfolio(text) {
  return text.trim()
    .split(/\n\s*\n/)          // split on blank lines → one block per entry
    .map(block => {
      const entry = {};
      block.split('\n').forEach(line => {
        const colon = line.indexOf(':');
        if (colon === -1) return;
        const key   = line.slice(0, colon).trim();
        const value = line.slice(colon + 1).replace(/^ /, ''); // strip one leading space
        entry[key]  = value;
      });
      return entry;
    })
    .filter(e => e.title);     // skip empty blocks
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
    // The CSV parser strips internal " chars from unquoted fields, so
    // data-instgrm-permalink may appear with or without surrounding quotes.
    const m = raw.match(/data-instgrm-permalink=["']?https:\/\/www\.instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
    if (m) {
      const id = m[1];
      const iframe = `<div class="embed-wrapper">
        <iframe src="https://www.instagram.com/p/${id}/embed/"
          title="${title}" frameborder="0" scrolling="no"
          allow="encrypted-media; autoplay" allowfullscreen></iframe>
      </div>`;
      return withCrop(iframe);
    }
    // Fallback: extract the URL even without quotes
    const fb = raw.match(/data-instgrm-permalink=["']?(https:\/\/www\.instagram\.com\/[^"'\s?]+)/);
    const href = fb ? fb[1] : 'https://www.instagram.com/';
    return `<div class="embed-wrapper embed-link">
      <a href="${href}" target="_blank" rel="noopener" class="btn primary embed-external-btn">
        ▶ Watch on Instagram
      </a>
    </div>`;
  }

  const url = raw.trim();

  if (url.includes('youtube.com/embed/') || url.includes('video.xx.fbcdn.net') ) {
    return `<div class="embed-wrapper">
      <iframe src="${url}" title="${title}" frameborder="0"
        //allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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

/* ── load and render portfolio.txt ── */
fetch('portfolio.txt')
  .then(r => r.text())
  .then(csv => {
    const entries = parsePortfolio(csv);
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
