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
    
    const selectedText = select.options[select.selectedIndex]?.text || 'Pilih...';
    trigger.innerHTML = `<span>${selectedText}</span><i class="ph ph-caret-down"></i>`;
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'custom-options';
    
    // Build options list
    Array.from(select.options).forEach(opt => {
      const customOpt = document.createElement('div');
      customOpt.className = `custom-option ${opt.selected ? 'selected' : ''}`;
      customOpt.textContent = opt.text;
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
        trigger.querySelector('span').textContent = opt.text;
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
    trigger.onclick = (e) => {
      e.stopPropagation();
      // Close other open selects
      document.querySelectorAll('.custom-select-wrapper').forEach(w => {
        if (w !== wrapper) w.classList.remove('open');
      });
      wrapper.classList.toggle('open');
    };
  });
}

// Global click to close
document.addEventListener('click', () => {
  document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
});
