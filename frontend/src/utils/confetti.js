// Pure zero-dependency confetti effect for Web & PWA
export function triggerConfetti() {
  const count = 40;
  const colors = ['#FF5C8A', '#7C5CFF', '#C6F432', '#FFD84D', '#19B37A', '#3A86FF'];
  
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.floor(Math.random() * 8) + 6;
    const startX = window.innerWidth / 2 + (Math.random() * 100 - 50);
    const startY = window.innerHeight * 0.4;
    const destX = startX + (Math.random() * 300 - 150);
    const destY = startY + (Math.random() * 400 + 100);
    const rot = Math.random() * 720;
    
    el.style.position = 'fixed';
    el.style.left = `${startX}px`;
    el.style.top = `${startY}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.backgroundColor = color;
    el.style.zIndex = '9999';
    el.style.pointerEvents = 'none';
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    el.style.border = '1px solid black';
    el.style.transition = 'all 1s cubic-bezier(0.25, 1, 0.5, 1)';
    
    document.body.appendChild(el);
    
    requestAnimationFrame(() => {
      el.style.transform = `translate(${destX - startX}px, ${destY - startY}px) rotate(${rot}deg)`;
      el.style.opacity = '0';
    });
    
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1100);
  }
}

