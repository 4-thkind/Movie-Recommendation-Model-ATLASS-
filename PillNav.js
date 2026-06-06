export function initPillNav() {
  const pills = document.querySelectorAll('.pill');
  if (pills.length === 0) return;

  const ease = 'power3.easeOut';
  const tlRefs = [];
  const activeTweenRefs = [];

  const layout = () => {
    pills.forEach((pill, idx) => {
      const circle = pill.querySelector('.hover-circle');
      if (!circle) return;

      const rect = pill.getBoundingClientRect();
      const { width: w, height: h } = rect;
      
      // Geometric calculation to scale circle to perfectly cover the pill capsule
      const R = ((w * w) / 4 + h * h) / (2 * h);
      const D = Math.ceil(2 * R) + 2;
      const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
      const originY = D - delta;

      circle.style.width = `${D}px`;
      circle.style.height = `${D}px`;
      circle.style.bottom = `-${delta}px`;

      gsap.set(circle, {
        xPercent: -50,
        scale: 0,
        transformOrigin: `50% ${originY}px`
      });

      const label = pill.querySelector('.pill-label');
      const white = pill.querySelector('.pill-label-hover');

      if (label) gsap.set(label, { y: 0 });
      if (white) gsap.set(white, { y: h + 12, opacity: 0 });

      if (tlRefs[idx]) tlRefs[idx].kill();

      const tl = gsap.timeline({ paused: true });
      tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: 'auto' }, 0);

      if (label) {
        tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: 'auto' }, 0);
      }

      if (white) {
        gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 });
        tl.to(white, { y: 0, opacity: 1, duration: 2, ease, overwrite: 'auto' }, 0);
      }

      tlRefs[idx] = tl;
    });
  };

  layout();
  
  // Recalculate values on window resize to ensure fluid layouts
  window.addEventListener('resize', layout);

  // Bind mouse hover listeners to each pill item
  pills.forEach((pill, idx) => {
    pill.addEventListener('mouseenter', () => {
      const tl = tlRefs[idx];
      if (!tl) return;
      if (activeTweenRefs[idx]) activeTweenRefs[idx].kill();
      activeTweenRefs[idx] = tl.tweenTo(tl.duration(), {
        duration: 0.3,
        ease,
        overwrite: 'auto'
      });
    });

    pill.addEventListener('mouseleave', () => {
      const tl = tlRefs[idx];
      if (!tl) return;
      if (activeTweenRefs[idx]) activeTweenRefs[idx].kill();
      activeTweenRefs[idx] = tl.tweenTo(0, {
        duration: 0.2,
        ease,
        overwrite: 'auto'
      });
    });
  });
}
