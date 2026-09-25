import { useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { story, STORY_LENGTH } from './state';
import { startSmoothScroll } from './smoothScroll';

gsap.registerPlugin(ScrollTrigger);

/**
 * The master timeline: one scroll-scrubbed GSAP timeline, one label per beat.
 * It tweens the shared `story` object (read by the 3D scene every frame) and
 * the HTML layers directly. Later beats are appended here.
 */
export function useStoryTimeline(reduced: boolean) {
  useLayoutEffect(() => {
    if (reduced) {
      // Static: wings open, candles lit, menu visible, normal scrolling.
      Object.assign(story, { open: 1, reveal: 1 });
      gsap.set('[data-wing-item]', { autoAlpha: 1 });
      return;
    }

    const stopScroll = startSmoothScroll();

    const onPointer = (e: PointerEvent) => {
      story.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      story.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: '#story',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          onToggle: (self) => {
            story.active = self.isActive;
            gsap.to('[data-story-layer]', { autoAlpha: self.isActive ? 1 : 0, duration: 0.3 });
          },
        },
      });

      // ── Beat 1 · HERO: closed wings. Title blurs, parts and fades.
      tl.addLabel('hero', 0)
        .to('[data-word="left"]', { xPercent: -18, yPercent: -40, duration: 0.8 }, 0)
        .to('[data-word="right"]', { xPercent: 18, yPercent: 40, duration: 0.8 }, 0)
        .to('[data-hero] h1', { filter: 'blur(16px)', autoAlpha: 0, duration: 0.7 }, 0.05)
        .to('[data-hero-sub]', { autoAlpha: 0, y: -30, duration: 0.35 }, 0)

        // ── Beat 2 · OPENING: wings open, candles light one by one, price cards drift in.
        .addLabel('opening', 0.6)
        .to(story, { open: 1, duration: 2.3, ease: 'power1.inOut' }, 0.5)
        .to(story, { reveal: 1, duration: 2.1 }, 0.75)
        .fromTo(
          '[data-price-card]',
          { autoAlpha: 0, y: (i, el) => 160 * Number((el as HTMLElement).dataset.depth) + i * 30 },
          { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.14, ease: 'power2.out' },
          0.95,
        )
        .to('[data-price-card]', { y: (_, el) => -140 * Number((el as HTMLElement).dataset.depth), duration: 1.3 }, 1.75)
        .to('[data-price-card]', { autoAlpha: 0, duration: 0.35, stagger: 0.05 }, 2.65)

        // ── Beat 3 · WINGS FULLY OPEN: the options appear along the wings.
        .addLabel('wings-open', 3.0)
        .fromTo('[data-wing-item]', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.07 }, 2.8)
        .to({}, { duration: STORY_LENGTH - tl.duration() }); // hold to the end of the track
    });

    return () => {
      ctx.revert();
      window.removeEventListener('pointermove', onPointer);
      stopScroll();
    };
  }, [reduced]);
}
