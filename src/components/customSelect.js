// src/components/customSelect.js

/**
 * Converts a native select element into a beautiful custom UI.
 * @param {HTMLSelectElement} selectEl - The native select element
 * @param {Function} onChange - Callback when value changes
 */
export function initCustomSelect(selectEl, onChange) {
  if (!selectEl || selectEl.getAttribute('data-custom-select-init')) return;
  
  const originalOptions = Array.from(selectEl.options);
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select-wrapper';
  
  // Hide original but keep it for value handling
  selectEl.classList.add('custom-select-hidden');
  selectEl.parentElement.insertBefore(wrapper, selectEl);
  wrapper.appendChild(selectEl);
  
  const trigger = document.createElement('div');
  trigger.className = 'custom-select-trigger';
  const selectedOption = originalOptions.find(opt => opt.selected) || originalOptions[0];
  trigger.innerHTML = `
    <span>${selectedOption.textContent}</span>
    <i class="ph ph-caret-down"></i>
  `;
  
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'custom-options';
  
  originalOptions.forEach(opt => {
    const customOpt = document.createElement('div');
    customOpt.className = `custom-option ${opt.selected ? 'selected' : ''}`;
    customOpt.textContent = opt.textContent;
    customOpt.setAttribute('data-value', opt.value);
    
    customOpt.onclick = () => {
      // Update Native Select
      selectEl.value = opt.value;
      
      // Update UI
      trigger.querySelector('span').textContent = opt.textContent;
      wrapper.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
      customOpt.classList.add('selected');
      
      wrapper.classList.remove('open');
      
      if (onChange) onChange(opt.value);
      
      // Trigger native change event
      selectEl.dispatchEvent(new Event('change'));
    };
    
    optionsContainer.appendChild(customOpt);
  });
  
  wrapper.appendChild(trigger);
  wrapper.appendChild(optionsContainer);
  
  trigger.onclick = (e) => {
    e.stopPropagation();
    const isOpen = wrapper.classList.contains('open');
    
    // Close all other custom selects first
    document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
    
    if (!isOpen) wrapper.classList.add('open');
  };
  
  // Close when clicking outside
  document.addEventListener('click', () => {
    wrapper.classList.remove('open');
  });
  
  selectEl.setAttribute('data-custom-select-init', 'true');
}
