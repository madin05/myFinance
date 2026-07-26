Tiap perpindahan langkah (step change), lu wajib jalanin "Reset Clean-up" dulu sebelum nempelin style buat step yang baru.

Lu bisa bikin fungsi pembantu (helper function) kayak gini di tutorial.js:

function renderStep(currentStepIndex) {
  // 1. CLEAR / RESET STATE SEBELUMNYA (PENTING!)
  // Hapus semua class highlight/z-index dari elemen manapun yang ada di dashboard
  document.querySelectorAll('.tutorial-highlighted').forEach(el => {
    el.classList.remove('tutorial-highlighted', 'z-50', 'relative');
  });

  // Hapus inline style atau class sisa di card tutorial/backdrop
  const currentTarget = steps[currentStepIndex].targetElement;
  
  // 2. APPLY STYLE BARU
  if (currentTarget) {
    currentTarget.classList.add('tutorial-highlighted', 'z-50');
  }

  // 3. Update isi Card Tutorial
  updateCardContent(steps[currentStepIndex]);
}