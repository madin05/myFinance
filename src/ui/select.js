/**
 * Custom Select Transformer
 * Magic by MyFinance Engineering Team
 */
export function initCustomSelects(container = document) {
  const nativeSelects = container.querySelectorAll('select.form-control');
  
  nativeSelects.forEach(select => {
    // Avoid double initialization
    if (select.nextElementSibling?.classList.contains('custom-select-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    
    const selectedOpt = select.options[select.selectedIndex];
    const selectedText = selectedOpt?.text || 'Pilih...';
    const selectedLogo = selectedOpt?.getAttribute('data-logo');
    
    let initialTriggerContent = `<span>${selectedText}</span>`;
    if (selectedLogo) {
      initialTriggerContent = `<div style="display: flex; align-items: center; gap: 8px;"><img src="${selectedLogo}" style="width: 20px; height: 20px; border-radius: 4px; object-fit: contain;" onerror="this.style.display='none'"><span>${selectedText}</span></div>`;
    }
    trigger.innerHTML = `${initialTriggerContent}<i class="ph ph-caret-down"></i>`;
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'custom-options';
    
    // Build options list
    Array.from(select.options).forEach(opt => {
      const customOpt = document.createElement('div');
      customOpt.className = `custom-option ${opt.selected ? 'selected' : ''}`;
      
      const logoUrl = opt.getAttribute('data-logo');
      if (logoUrl) {
        customOpt.innerHTML = `<img src="${logoUrl}" style="width: 20px; height: 20px; border-radius: 4px; margin-right: 8px; object-fit: contain; vertical-align: middle;" onerror="this.style.display='none'"><span>${opt.text}</span>`;
        customOpt.style.display = 'flex';
        customOpt.style.alignItems = 'center';
      } else {
        customOpt.textContent = opt.text;
      }
      
      customOpt.setAttribute('data-value', opt.value);
      
      customOpt.onclick = (e) => {
        e.stopPropagation();
        
        // Sync to native select
        select.value = opt.value;
        Array.from(select.options).forEach(o => {
          o.selected = (o.value === opt.value);
        });
        
        // Trigger events
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Update UI
        wrapper.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
        customOpt.classList.add('selected');
        
        let triggerContent = `<span>${opt.text}</span>`;
        if (logoUrl) {
          triggerContent = `<div style="display: flex; align-items: center; gap: 8px;"><img src="${logoUrl}" style="width: 20px; height: 20px; border-radius: 4px; object-fit: contain;" onerror="this.style.display='none'"><span>${opt.text}</span></div>`;
        }
        trigger.innerHTML = `${triggerContent}<i class="ph ph-caret-down"></i>`;
        
        wrapper.classList.remove('open');
      };
      
      optionsContainer.appendChild(customOpt);
    });
    
    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsContainer);
    
    // Hide native select and insert custom UI
    select.classList.add('custom-select-hidden');
    select.parentNode.insertBefore(wrapper, select.nextSibling);
    
    // Trigger logic
    if (select.disabled) {
      wrapper.classList.add('disabled');
      wrapper.style.opacity = '0.6';
      wrapper.style.cursor = 'not-allowed';
      trigger.style.pointerEvents = 'none';
    } else {
      trigger.onclick = (e) => {
        e.stopPropagation();
        // Close other open selects
        document.querySelectorAll('.custom-select-wrapper').forEach(w => {
          if (w !== wrapper) {
            w.classList.remove('open');
            const card = w.closest('.stat-card');
            if (card) card.style.zIndex = '';
          }
        });
        const isOpening = !wrapper.classList.contains('open');
        wrapper.classList.toggle('open');
        const card = wrapper.closest('.stat-card');
        if (card) {
          card.style.zIndex = isOpening ? '100' : '';
        }
      };
    }
  });
}

// Global click to close
document.addEventListener('click', () => {
  document.querySelectorAll('.custom-select-wrapper').forEach(w => {
    w.classList.remove('open');
    const card = w.closest('.stat-card');
    if (card) card.style.zIndex = '';
  });
});
