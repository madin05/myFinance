/**
 * Dynamic Cloud Generator (Desktop Only)
 * Creates subtle drifting background clouds in #login-cloud-container
 */
export function initLoginAnimations() {
  const cloudContainer = document.getElementById('login-cloud-container');
  if (cloudContainer && window.innerWidth > 991) {
    const cloudCount = 6;
    let cloudHTML = '';

    for (let i = 0; i < cloudCount; i++) {
      const sizeIndex = Math.floor(Math.random() * 3);
      let width, height, opacity, speedMult;
      
      if (sizeIndex === 0) {
        width = Math.floor(Math.random() * 30) + 45;
        height = Math.floor(width * 0.6);
        opacity = 0.25;
        speedMult = 1.35;
      } else if (sizeIndex === 1) {
        width = Math.floor(Math.random() * 40) + 80;
        height = Math.floor(width * 0.6);
        opacity = 0.35;
        speedMult = 1.0;
      } else {
        width = Math.floor(Math.random() * 50) + 130;
        height = Math.floor(width * 0.6);
        opacity = 0.45;
        speedMult = 0.72;
      }

      const top = Math.floor(Math.random() * 75) + 8;
      const duration = Math.floor((Math.random() * 35 + 45) / speedMult);
      const delay = -Math.floor(Math.random() * duration);
      const directionClass = Math.random() > 0.5 ? 'cloud-drift-left-to-right' : 'cloud-drift-right-to-left';

      cloudHTML += `
        <div class="cloud-ornament" style="
          top: ${top}%;
          animation: ${directionClass} ${duration}s linear infinite;
          animation-delay: ${delay}s;
          opacity: ${opacity};
          position: absolute;
          pointer-events: none;
        ">
          <svg viewBox="0 0 100 60" width="${width}" height="${height}">
            <path d="M20,45 A15,15 0 0,1 30,20 A20,20 0 0,1 70,20 A15,15 0 0,1 80,45 Z" fill="currentColor" />
          </svg>
        </div>
      `;
    }
    cloudContainer.innerHTML = cloudHTML;
  }
}
