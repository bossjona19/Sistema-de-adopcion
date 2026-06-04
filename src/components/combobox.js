const STATUS_LABEL = { disponible: 'En espera de adopción', en_proceso: 'En proceso de adopción', adoptado: 'Adoptado' };

export function createCombobox(container, initialItems = [], { placeholder = 'Seleccionar…' } = {}) {
  let _items    = initialItems;
  let _value    = '';
  let _disabled = false;
  let _open     = false;

  container.innerHTML = `
    <div class="cb" role="combobox" aria-haspopup="listbox" aria-expanded="false" tabindex="0">
      <div class="cb-trigger">
        <span class="cb-display cb-display--placeholder">${placeholder}</span>
        <svg class="cb-chevron" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      <div class="cb-dropdown" hidden>
        <div class="cb-search-wrap">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true" style="color:var(--text-3);flex-shrink:0;">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input class="cb-search" type="text" placeholder="Buscar…" autocomplete="off" aria-label="Buscar">
        </div>
        <ul class="cb-list" role="listbox"></ul>
      </div>
    </div>
  `;

  const root     = container.querySelector('.cb');
  const trigger  = container.querySelector('.cb-trigger');
  const display  = container.querySelector('.cb-display');
  const dropdown = container.querySelector('.cb-dropdown');
  const search   = container.querySelector('.cb-search');
  const list     = container.querySelector('.cb-list');

  function renderList() {
    const q = search.value.toLowerCase();
    const visible = _items.filter(i => !q || i.label.toLowerCase().includes(q));
    list.innerHTML = visible.length
      ? visible.map(i => `
          <li class="cb-item${i.id === _value ? ' cb-item--selected' : ''}"
              role="option" data-id="${i.id}" aria-selected="${i.id === _value}">
            <span class="cb-item-label">${i.label}</span>
            ${i.status ? `<span class="cb-status cb-status--${i.status}">${STATUS_LABEL[i.status] ?? i.status}</span>` : ''}
          </li>`).join('')
      : `<li class="cb-item cb-item--empty">Sin resultados</li>`;
  }

  function open() {
    if (_disabled) return;
    _open = true;
    root.setAttribute('aria-expanded', 'true');
    root.classList.add('cb--open');
    dropdown.hidden = false;
    search.value = '';
    renderList();
    requestAnimationFrame(() => search.focus());
  }

  function close() {
    _open = false;
    root.setAttribute('aria-expanded', 'false');
    root.classList.remove('cb--open');
    dropdown.hidden = true;
  }

  trigger.addEventListener('mousedown', e => {
    e.preventDefault();
    _open ? close() : open();
  });

  list.addEventListener('click', e => {
    const li = e.target.closest('[data-id]');
    if (!li) return;
    const item = _items.find(i => i.id === li.dataset.id);
    if (!item) return;
    _value = item.id;
    display.textContent = item.label;
    display.classList.remove('cb-display--placeholder');
    close();
    root.focus();
  });

  search.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
  search.addEventListener('input', renderList);

  root.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && !_open) { e.preventDefault(); open(); }
    if (e.key === 'Escape' && _open) { e.stopPropagation(); close(); }
  });

  function onOutsideClick(e) {
    if (!container.contains(e.target)) close();
  }
  document.addEventListener('mousedown', onOutsideClick);

  // Tab fuera del combobox cierra el dropdown
  container.addEventListener('focusout', e => {
    if (!container.contains(e.relatedTarget)) {
      setTimeout(() => { if (_open && !container.contains(document.activeElement)) close(); }, 0);
    }
  });

  return {
    getValue: () => _value,
    setValue(id) {
      const item = _items.find(i => i.id === id);
      if (item) {
        _value = id;
        display.textContent = item.label;
        display.classList.remove('cb-display--placeholder');
      } else {
        _value = '';
        display.textContent = placeholder;
        display.classList.add('cb-display--placeholder');
      }
    },
    setItems(items) {
      _items = items;
      if (_open) renderList();
    },
    setDisabled(bool) {
      _disabled = bool;
      root.classList.toggle('cb--disabled', bool);
      if (bool && _open) close();
    },
    clear() {
      _value = '';
      display.textContent = placeholder;
      display.classList.add('cb-display--placeholder');
      if (_open) close();
    },
    destroy() {
      document.removeEventListener('mousedown', onOutsideClick);
      container.innerHTML = '';
    },
  };
}
