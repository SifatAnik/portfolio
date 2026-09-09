const jokes = [
  "Why don't Airflow DAGs ever get lost? They always know their upstream and downstream.",
  "Why did the data engineer break up with the spreadsheet? Too many unresolved joins.",
  "What do you call a Spark job that won't finish? A cluster's worst nightmare.",
  "Why did the ETL pipeline go to therapy? It couldn't stop transforming its feelings.",
  "How does a data engineer apologize? 'I'm sorry, that was a schema issue, not a me issue.'",
  "Marriage is just a two-node pipeline: no upstream/downstream, only merge conflicts you both have to resolve — together, every single day."
];
let jokeIdx = 0;
function nextJoke(){
  jokeIdx = (jokeIdx + 1) % jokes.length;
  const el = document.getElementById('jokeText');
  const n = document.getElementById('jokeNum');
  if(el) el.innerHTML = '$ joke --random<br>' + jokes[jokeIdx];
  if(n) n.textContent = '#' + String(jokeIdx+1).padStart(2,'0');
}

// Theme toggle (persists across pages via localStorage is not used per Claude artifact rules,
// but this is a real static site, not a Claude artifact, so plain localStorage is fine here.)
document.addEventListener('DOMContentLoaded', function(){
  const saved = localStorage.getItem('theme');
  if(saved === 'light'){ document.body.classList.add('light'); }
  const toggle = document.getElementById('themeToggle');
  if(toggle){
    toggle.addEventListener('click', function(){
      document.body.classList.toggle('light');
      localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
    });
  }
});

// ===== Photography gallery =====
// Everything below is scoped to photography.html; it no-ops on other pages
// since it checks for #galleryGrid before doing anything.
//
// Public/admin model:
// - window.PUBLISHED_PHOTOS (from photos-data.js) is what every visitor sees.
// - Admin mode (unlocked via the lock icon) works against a local "working set"
//   in this browser's storage, seeded from PUBLISHED_PHOTOS. New adds are drafts
//   until you hit "publish photos-data.js", which downloads an updated data file
//   for you to drop into the deployed site.
// - ADMIN_PASSPHRASE below is just a UI gate to keep the form out of casual
//   visitors' way — it's visible in this file's source, so it's not real
//   security. Change it to whatever you like.
(function(){
  const GRID = document.getElementById('galleryGrid');
  if(!GRID) return;

  const ADMIN_KEY = 'sifatul_photo_admin';
  const ADMIN_PASSPHRASE = 'sifatul-shoots';
  const STORE_KEY = 'sifatul_photos_working';

  function isAdmin(){ return localStorage.getItem(ADMIN_KEY) === '1'; }
  function setAdmin(on){
    if(on) localStorage.setItem(ADMIN_KEY, '1');
    else localStorage.removeItem(ADMIN_KEY);
    document.body.classList.toggle('is-admin', on);
    const lockBtn = document.getElementById('lockToggle');
    if(lockBtn){
      lockBtn.textContent = on ? '🔓' : '🔒';
      lockBtn.title = on ? 'Lock uploads (exit admin mode)' : 'Unlock uploads';
      lockBtn.classList.toggle('on', on);
    }
  }
  document.body.classList.toggle('is-admin', isAdmin());

  const lockToggle = document.getElementById('lockToggle');
  if(lockToggle){
    lockToggle.textContent = isAdmin() ? '🔓' : '🔒';
    lockToggle.classList.toggle('on', isAdmin());
    lockToggle.addEventListener('click', function(){
      if(isAdmin()){
        setAdmin(false);
      } else {
        const attempt = prompt('Admin passphrase:');
        if(attempt === null) return;
        if(attempt === ADMIN_PASSPHRASE) setAdmin(true);
        else alert('Wrong passphrase.');
      }
      render();
    });
  }

  const dropZone   = document.getElementById('dropZone');
  const photoInput = document.getElementById('photoInput');
  const dzPreview  = document.getElementById('dzPreview');
  const dzText     = document.getElementById('dzText');
  const form       = document.getElementById('photoForm');
  const formMsg    = document.getElementById('formMsg');
  const filterRow  = document.getElementById('filterRow');
  const emptyState = document.getElementById('emptyState');
  const lightbox   = document.getElementById('lightbox');
  const lbImg      = document.getElementById('lbImg');
  const lbCap      = document.getElementById('lbCap');
  const lbMeta     = document.getElementById('lbMeta');

  let pendingDataUrl = null;
  let activeFilter = 'all';
  let lbIndex = 0;

  function publishedList(){
    return (window.PUBLISHED_PHOTOS || []).map(function(p){
      return Object.assign({}, p, { published: true });
    });
  }
  function loadWorking(){
    try{
      const raw = localStorage.getItem(STORE_KEY);
      if(raw) return JSON.parse(raw);
    } catch(e){ /* fall through to reseed */ }
    const seeded = publishedList();
    saveWorking(seeded);
    return seeded;
  }
  function saveWorking(list){
    try{ localStorage.setItem(STORE_KEY, JSON.stringify(list)); return true; }
    catch(e){ return false; }
  }
  // The list actually shown on screen: admins see their working set
  // (published + drafts); everyone else only ever sees published photos.
  function displayList(){
    return isAdmin() ? loadWorking() : publishedList();
  }

  // ---- resize + compress an image file before storing ----
  function fileToCompressedDataUrl(file, maxDim, quality){
    return new Promise(function(resolve, reject){
      const reader = new FileReader();
      reader.onload = function(){
        const img = new Image();
        img.onload = function(){
          let w = img.width, h = img.height;
          if(w > h && w > maxDim){ h = Math.round(h * (maxDim / w)); w = maxDim; }
          else if(h > maxDim){ w = Math.round(w * (maxDim / h)); h = maxDim; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function handleFile(file){
    if(!file || !file.type.startsWith('image/')) return;
    fileToCompressedDataUrl(file, 1600, 0.82).then(function(dataUrl){
      pendingDataUrl = dataUrl;
      dzPreview.src = dataUrl;
      dzPreview.style.display = 'block';
      dzText.style.display = 'none';
    });
  }

  if(dropZone){
    photoInput.addEventListener('change', function(){ handleFile(photoInput.files[0]); });
    dropZone.addEventListener('dragover', function(e){ e.preventDefault(); dropZone.classList.add('drag'); });
    dropZone.addEventListener('dragleave', function(){ dropZone.classList.remove('drag'); });
    dropZone.addEventListener('drop', function(e){
      e.preventDefault();
      dropZone.classList.remove('drag');
      if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
  }

  function tagsOf(list){
    const set = new Set(list.map(function(p){ return p.tag; }));
    return Array.from(set);
  }

  function renderFilters(list){
    const tags = tagsOf(list);
    filterRow.innerHTML = '<div class="chip' + (activeFilter === 'all' ? ' active' : '') + '" data-tag="all">All</div>' +
      tags.map(function(t){
        return '<div class="chip' + (activeFilter === t ? ' active' : '') + '" data-tag="' + t + '">' + t + '</div>';
      }).join('');
    filterRow.querySelectorAll('.chip').forEach(function(chip){
      chip.addEventListener('click', function(){
        activeFilter = chip.getAttribute('data-tag');
        render();
      });
    });
  }

  function currentList(list){
    if(activeFilter === 'all') return list;
    return list.filter(function(p){ return p.tag === activeFilter; });
  }

  function renderStats(list){
    document.getElementById('statTotal').textContent = list.length;
    document.getElementById('statTags').textContent = tagsOf(list).length;
    document.getElementById('statPlaces').textContent = new Set(list.filter(function(p){return p.location;}).map(function(p){return p.location;})).size;
    const now = new Date();
    const thisMonth = list.filter(function(p){
      const d = new Date(p.addedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    document.getElementById('statRecent').textContent = thisMonth;
  }

  function metaLine(p){
    const parts = [];
    if(p.location) parts.push(p.location);
    if(p.dateTaken) parts.push(p.dateTaken);
    parts.push(p.tag);
    return parts.join(' <span class="g">·</span> ');
  }

  function render(){
    const list = displayList();
    renderStats(list);
    renderFilters(list);
    const shown = currentList(list);
    emptyState.style.display = list.length === 0 ? 'block' : 'none';
    const admin = isAdmin();
    GRID.innerHTML = shown.map(function(p, i){
      return '<div class="photo-card" data-id="' + p.id + '">' +
        '<div class="photo-frame" data-idx="' + i + '">' +
          '<img src="' + p.dataUrl + '" alt="' + (p.caption || 'photo') + '">' +
          '<div class="photo-del admin-only" data-id="' + p.id + '" title="Delete">✕</div>' +
        '</div>' +
        '<div class="photo-info">' +
          (admin && p.published === false ? '<div class="draft-badge">draft — not published</div><br>' : '') +
          '<div class="photo-cap">' + (p.caption || 'Untitled shot') + '</div>' +
          '<div class="photo-meta">' + metaLine(p) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    GRID.querySelectorAll('.photo-del').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        if(!isAdmin()) return;
        const id = btn.getAttribute('data-id');
        const remaining = loadWorking().filter(function(p){ return p.id !== id; });
        saveWorking(remaining);
        render();
      });
    });
    GRID.querySelectorAll('.photo-frame').forEach(function(frame){
      frame.addEventListener('click', function(){
        openLightbox(shown, parseInt(frame.getAttribute('data-idx'), 10));
      });
    });
  }

  // ---- form submit (admin only — the form itself is hidden from visitors) ----
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if(!isAdmin()) return;
      if(!pendingDataUrl){
        formMsg.textContent = 'Add a photo before saving.';
        return;
      }
      const list = loadWorking();
      list.unshift({
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        dataUrl: pendingDataUrl,
        caption: document.getElementById('captionInput').value.trim(),
        location: document.getElementById('locationInput').value.trim(),
        tag: document.getElementById('tagInput').value,
        dateTaken: document.getElementById('dateInput').value,
        addedAt: Date.now(),
        published: false
      });
      if(saveWorking(list)){
        formMsg.textContent = 'Saved as a draft — click "publish photos-data.js" when ready to make it public.';
        form.reset();
        pendingDataUrl = null;
        dzPreview.style.display = 'none';
        dzText.style.display = 'block';
        activeFilter = 'all';
        render();
      } else {
        formMsg.textContent = "Storage's full — try removing an older shot, or export a backup and clear some space.";
      }
    });
  }

  // ---- lightbox ----
  function openLightbox(list, idx){
    lbIndex = idx;
    showLightboxItem(list);
    lightbox.classList.add('open');
  }
  function showLightboxItem(list){
    const p = list[lbIndex];
    if(!p) return;
    lbImg.src = p.dataUrl;
    lbCap.textContent = p.caption || 'Untitled shot';
    lbMeta.innerHTML = metaLine(p);
    lightbox._list = list;
  }
  const lbClose = document.getElementById('lbClose');
  const lbPrev = document.getElementById('lbPrev');
  const lbNext = document.getElementById('lbNext');
  if(lbClose){
    lbClose.addEventListener('click', function(){ lightbox.classList.remove('open'); });
    lightbox.addEventListener('click', function(e){ if(e.target === lightbox) lightbox.classList.remove('open'); });
    lbPrev.addEventListener('click', function(){
      const list = lightbox._list || [];
      lbIndex = (lbIndex - 1 + list.length) % list.length;
      showLightboxItem(list);
    });
    lbNext.addEventListener('click', function(){
      const list = lightbox._list || [];
      lbIndex = (lbIndex + 1) % list.length;
      showLightboxItem(list);
    });
    document.addEventListener('keydown', function(e){
      if(!lightbox.classList.contains('open')) return;
      if(e.key === 'Escape') lightbox.classList.remove('open');
      if(e.key === 'ArrowLeft') lbPrev.click();
      if(e.key === 'ArrowRight') lbNext.click();
    });
  }

  function downloadFile(filename, content, mime){
    const blob = new Blob([content], {type: mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- publish: turns the working set into the public data file ----
  const publishBtn = document.getElementById('publishBtn');
  if(publishBtn){
    publishBtn.addEventListener('click', function(){
      if(!isAdmin()) return;
      const list = loadWorking().map(function(p){
        const copy = Object.assign({}, p);
        copy.published = true;
        return copy;
      });
      saveWorking(list);
      const cleaned = list.map(function(p){
        const c = Object.assign({}, p);
        delete c.published;
        return c;
      });
      const fileBody =
        '// Published photography data — replace the file at this path in your\n' +
        '// deployed site, then redeploy so visitors see these shots.\n' +
        'window.PUBLISHED_PHOTOS = ' + JSON.stringify(cleaned, null, 2) + ';\n';
      downloadFile('photos-data.js', fileBody, 'text/javascript');
      render();
      formMsg.textContent = 'Downloaded photos-data.js — replace it in your site and redeploy to go live.';
    });
  }

  // ---- backup export / import (raw safety copy of your working set) ----
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  if(exportBtn){
    exportBtn.addEventListener('click', function(){
      if(!isAdmin()) return;
      downloadFile('photography-backup.json', JSON.stringify(loadWorking()), 'application/json');
    });
    importBtn.addEventListener('click', function(){ if(isAdmin()) importFile.click(); });
    importFile.addEventListener('change', function(){
      if(!isAdmin()) return;
      const file = importFile.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = function(){
        try{
          const incoming = JSON.parse(reader.result);
          if(!Array.isArray(incoming)) throw new Error('bad format');
          const current = loadWorking();
          const ids = new Set(current.map(function(p){ return p.id; }));
          incoming.forEach(function(p){ if(!ids.has(p.id)) current.push(p); });
          saveWorking(current);
          render();
          formMsg.textContent = 'Backup imported.';
        } catch(e){
          formMsg.textContent = 'Could not read that backup file.';
        }
      };
      reader.readAsText(file);
    });
  }

  render();
})();
