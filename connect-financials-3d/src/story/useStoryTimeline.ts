import { useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { story, STORY_LENGTH } from './state';
import { startSmoothScroll } from './smoothScroll';

gsap.registerPlugin(ScrollTrigger);

const TAU = Math.PI * 2;

/**
 * Wraps each character of the [data-type-in] paragraphs in a span so they can
 * "type in" with the scroll. The text stays in the DOM the whole time.
 */
function splitChars(root: Element) {
  const spans: HTMLElement[] = [];
  root.querySelectorAll<HTMLElement>('[data-type-in]').forEach((p) => {
    if (p.dataset.split) {
      spans.push(...Array.from(p.querySelectorAll<HTMLElement>('span[data-ch]')));
      return;
    }
    p.dataset.split = '1';
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const t of nodes) {
      const frag = document.createDocumentFragment();
      for (const ch of t.data) {
        const s = document.createElement('span');
        s.dataset.ch = '';
        s.textContent = ch;
        s.style.opacity = '0.16';
        frag.appendChild(s);
        spans.push(s);
      }
      t.replaceWith(frag);
    }
  });
  return spans;
}

/**
 * The scroll story.
 *
 * Beats 1–5 play on one master timeline scrubbed across the pinned story
 * track (#story), one label per beat, time measured in viewport heights.
 * Beats 6–12 are normal page sections; each gets a scrubbed timeline of its
 * own, triggered by the section, so the choreography stays attached to the
 * content whatever height the tables and forms end up. Everything writes to
 * the shared `story` object that the 3D scene reads every frame.
 */
export function useStoryTimeline(reduced: boolean) {
  useLayoutEffect(() => {
    if (reduced) {
      // Static: wings open, gold fringes lit, eyes bright, menu visible, normal scrolling.
      Object.assign(story, { open: 1, reveal: 1, scan: 1, mix: 1 });
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
      // ───────────────────────── Beats 1–5: master timeline
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: '#story',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          onToggle: (self) => gsap.to('[data-story-layer]', { autoAlpha: self.isActive ? 1 : 0, duration: 0.3 }),
        },
      });

      // 1 · HERO — closed wings; the title blurs, parts and fades.
      tl.addLabel('hero', 0)
        .to('[data-word="left"]', { xPercent: -18, yPercent: -40, duration: 0.8 }, 0)
        .to('[data-word="right"]', { xPercent: 18, yPercent: 40, duration: 0.8 }, 0)
        .to('[data-hero] h1', { filter: 'blur(16px)', autoAlpha: 0, duration: 0.7 }, 0.05)
        .to('[data-hero-sub]', { autoAlpha: 0, y: -30, duration: 0.35 }, 0)

        // 2 · OPENING — wings open, gold fringes catch the light body → tips, price cards drift in.
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

        // 3 · WINGS FULLY OPEN — the options appear along the wings.
        .addLabel('wings-open', 3.0)
        .fromTo('[data-wing-item]', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.07 }, 2.8)
        .to('[data-wing-item]', { autoAlpha: 0, y: -12, duration: 0.3, stagger: 0.03 }, 4.05)

        // 4 · ROTATION / FLIGHT — the eagle banks and turns, the camera orbits,
        //     the backdrop becomes the navy grid and the light on the bird drops.
        .addLabel('flight', 4.3)
        .to(story, { spin: TAU, duration: 2.3, ease: 'power1.inOut' }, 4.35)
        .to(story, { bank: 0.35, duration: 0.6, ease: 'sine.inOut' }, 4.35)
        .to(story, { bank: -0.3, duration: 1.0, ease: 'sine.inOut' }, 4.95)
        .to(story, { bank: 0, duration: 0.7, ease: 'sine.inOut' }, 5.95)
        .to(story, { orbit: 0.55, duration: 1.1, ease: 'sine.inOut' }, 4.35)
        .to(story, { orbit: 0, duration: 1.1, ease: 'sine.inOut' }, 5.45)
        .to(story, { grid: 1, glow: 0.75, duration: 0.8 }, 4.35)
        .to(story, { mix: 0, duration: 1.0 }, 4.6)
        .fromTo('[data-fly]', { autoAlpha: 1, y: 0 }, { y: (_, el) => ({ far: -200, mid: -260, near: -330 })[(el as HTMLElement).dataset.fly as 'far'] + 'vh', duration: 2.6 }, 4.3)
        .to('[data-fly]', { autoAlpha: 0, duration: 0.2 }, 6.7)
        .fromTo('[data-flight-words]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 4.8)
        .fromTo('[data-fw]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.25 }, 4.8)
        .to('[data-flight-words]', { autoAlpha: 0, y: -30, duration: 0.3 }, 6.3)

        // 5 · AWAKENING — a warm light sweeps down the falcon; behind it the gold
        //     fringes return and the blue eyes brighten.
        .addLabel('transform', 6.9)
        .to(story, { scan: 1, duration: 1.3 }, 6.9)
        .to(story, { glow: 1, duration: 0.6 }, 6.9)
        .fromTo('[data-transform-words]', { autoAlpha: 0, x: -30 }, { autoAlpha: 1, x: 0, duration: 0.3 }, 7.0)
        .to('[data-transform-words]', { autoAlpha: 0, duration: 0.3 }, 8.3);
      tl.to({}, { duration: Math.max(0, STORY_LENGTH - tl.duration()) });

      // ───────────────────────── Beats 6–12: one scrubbed timeline per section
      const beat = (trigger: string, start: string, end: string) =>
        gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger, start, end, scrub: 1 } });

      // 6 · MARKETS — the eagle moves aside into its frame; the terminal tilts up into place.
      beat('#trade', 'top bottom', 'top 15%').addLabel('markets').fromTo(story.p, { markets: 0 }, { markets: 1 });
      beat('[data-tilt]', 'top 95%', 'top 30%').fromTo(
        '[data-tilt] > *',
        { rotateX: 28, y: 120, transformOrigin: '50% 0%' },
        { rotateX: 0, y: 0, ease: 'power2.out' },
      );

      // 7 · 3D TO CARD — the eagle folds into the portrait frame; About types in.
      beat('#about', 'top bottom', 'top 20%').addLabel('card').fromTo(story.p, { card: 0 }, { card: 1 });
      const about = document.querySelector('#about');
      if (about) {
        const spans = splitChars(about);
        const proxy = { n: 0 };
        let shown = 0;
        beat('#about', 'top 65%', 'center 45%').to(proxy, {
          n: spans.length,
          onUpdate: () => {
            const n = Math.round(proxy.n);
            for (let i = Math.min(n, shown); i < Math.max(n, shown); i++) spans[i].style.opacity = i < n ? '1' : '0.16';
            shown = n;
          },
        });
      }

      // 8 · BIG SPLIT WORDS — the eagle lifts away; words slide in from both sides.
      beat('#values', 'top 85%', 'top 15%').addLabel('words').fromTo(story.p, { words: 0 }, { words: 1 });
      beat('#values', 'top bottom', 'center 55%')
        .fromTo('[data-split="l"]', { xPercent: -80, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, stagger: 0.2 }, 0)
        .fromTo('[data-split="r"]', { xPercent: 80, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, stagger: 0.2 }, 0)
        .fromTo('[data-split="m"]', { scaleX: 0 }, { scaleX: 1, stagger: 0.2 }, 0.3);
      gsap.utils.toArray<HTMLElement>('[data-par]').forEach((el) =>
        beat('#values', 'top bottom', 'bottom top').fromTo(el, { yPercent: 0 }, { yPercent: Number(el.dataset.par) * 160 }),
      );

      // 9–11 · ACCOUNTS, TOOLS, PLATFORMS — the eagle rests out of frame.
      for (const id of ['#accounts', '#tools', '#platforms']) {
        beat(id, 'top 90%', 'top 40%').fromTo(
          `${id} [data-rise]`,
          { y: 60, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, stagger: 0.1, ease: 'power2.out' },
        );
      }

      // 12 · CLOSING — the eagle returns calm, wings folding.
      beat('#open-account', 'top bottom', 'center 60%').addLabel('closing').fromTo(story.p, { closing: 0 }, { closing: 1, ease: 'power2.out' });
    });

    // Sections change height (tabs, forms, fonts loading): keep triggers accurate.
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    const main = document.querySelector('main');
    if (main) ro.observe(main);

    return () => {
      ro.disconnect();
      ctx.revert();
      window.removeEventListener('pointermove', onPointer);
      stopScroll();
    };
  }, [reduced]);
}
