import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import FadeIn from '../components/FadeIn';
import LiveProjectButton from '../components/LiveProjectButton';

const cf = (file: string) =>
  `https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2F${file}&w=1280&q=85`;

type Project = {
  number: string;
  name: string;
  category: string;
  images: [string, string, string];
};

const PROJECTS: Project[] = [
  {
    number: '01',
    name: 'Nextlevel Studio',
    category: 'Client',
    images: [
      cf('hf_20260412_055344_5eff02e0-87a5-41ce-b64f-eb08da8f33db.png'),
      cf('hf_20260412_055431_11d841fd-8b41-46a5-82e4-b04f2407a7d8.png'),
      cf('hf_20260412_055451_e317bf2d-28d4-48cc-86b0-6f72f25b6327.png'),
    ],
  },
  {
    number: '02',
    name: 'Aura Brand Identity',
    category: 'Personal',
    images: [
      cf('hf_20260412_055654_911201c5-36d9-4bc6-bac7-331adfce159f.png'),
      cf('hf_20260412_055723_5ceda0b8-d9c2-4665-b2e3-83ba19ba76d1.png'),
      cf('hf_20260412_055753_adc5dcbd-a8e6-49c0-b43a-9b030d835cea.png'),
    ],
  },
  {
    number: '03',
    name: 'Solaris Digital',
    category: 'Client',
    images: [
      cf('hf_20260412_055759_963cfb0b-4bd1-4b0f-9d0a-09bd6cf95b2f.png'),
      cf('hf_20260412_060108_438f781a-9846-4dcc-89ab-c4e6cb830f5b.png'),
      cf('hf_20260412_055818_9d062121-ad7e-46b9-999a-1a6a692ef1ee.png'),
    ],
  },
];

const RADIUS = 'rounded-[40px] sm:rounded-[50px] md:rounded-[60px]';

type CardProps = {
  project: Project;
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
};

function ProjectCard({ project, index, total, progress }: CardProps) {
  // Cards further up the stack settle a little smaller, so the pile reads
  // as depth rather than a single sheet.
  const targetScale = 1 - (total - 1 - index) * 0.03;
  const range: [number, number] = [index * (1 / total), 1];
  const scale = useTransform(progress, range, [1, targetScale]);

  return (
    <div className="h-[85vh] flex items-start justify-center">
      <motion.article
        // The sticky offset is responsive (top-24 / md:top-32) *and* stepped per
        // card, so the base value rides a custom property the inline calc adds to.
        className={`sticky w-full border-2 border-[#D7E2EA] p-4 sm:p-6 md:p-8 [--stack-top:6rem] md:[--stack-top:8rem] ${RADIUS}`}
        style={{
          background: '#0C0C0C',
          scale,
          top: `calc(var(--stack-top) + ${index * 28}px)`,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center gap-4 sm:gap-6 md:gap-8">
            <span
              className="hero-heading font-black leading-none"
              style={{ fontSize: 'clamp(3rem, 10vw, 140px)' }}
            >
              {project.number}
            </span>
            <div className="flex flex-col gap-1 sm:gap-2">
              <span
                className="text-[#D7E2EA] font-light uppercase tracking-widest opacity-60"
                style={{ fontSize: 'clamp(0.7rem, 1.2vw, 1rem)' }}
              >
                {project.category}
              </span>
              <h3
                className="text-[#D7E2EA] font-medium uppercase leading-tight"
                style={{ fontSize: 'clamp(1rem, 2.2vw, 2.1rem)' }}
              >
                {project.name}
              </h3>
            </div>
          </div>

          <LiveProjectButton />
        </div>

        <div className="flex gap-3 sm:gap-4 md:gap-5">
          <div className="w-[40%] flex flex-col gap-3 sm:gap-4 md:gap-5">
            <img
              src={project.images[0]}
              alt={`${project.name} — detail one`}
              loading="lazy"
              className={`w-full object-cover ${RADIUS}`}
              style={{ height: 'clamp(130px, 16vw, 230px)' }}
            />
            <img
              src={project.images[1]}
              alt={`${project.name} — detail two`}
              loading="lazy"
              className={`w-full object-cover ${RADIUS}`}
              style={{ height: 'clamp(160px, 22vw, 340px)' }}
            />
          </div>

          <div className="w-[60%]">
            <img
              src={project.images[2]}
              alt={`${project.name} — hero view`}
              loading="lazy"
              className={`w-full h-full object-cover ${RADIUS}`}
            />
          </div>
        </div>
      </motion.article>
    </div>
  );
}

export default function ProjectsSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  return (
    <section
      id="projects"
      className="relative z-10 -mt-10 sm:-mt-12 md:-mt-14 rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] px-5 sm:px-8 md:px-10 py-20 sm:py-24 md:py-32"
      style={{ background: '#0C0C0C' }}
    >
      <FadeIn delay={0} y={40}>
        <h2
          className="hero-heading font-black uppercase leading-none tracking-tight text-center mb-16 sm:mb-20 md:mb-28"
          style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
        >
          Project
        </h2>
      </FadeIn>

      <div ref={containerRef} className="max-w-6xl mx-auto">
        {PROJECTS.map((project, i) => (
          <ProjectCard
            key={project.number}
            project={project}
            index={i}
            total={PROJECTS.length}
            progress={scrollYProgress}
          />
        ))}
      </div>
    </section>
  );
}
