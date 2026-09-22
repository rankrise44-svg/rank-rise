import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';

type AnimatedTextProps = {
  text: string;
  className?: string;
  style?: CSSProperties;
};

type CharProps = {
  char: string;
  progress: MotionValue<number>;
  range: [number, number];
};

function Char({ char, progress, range }: CharProps) {
  const opacity = useTransform(progress, range, [0.2, 1]);

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      {/* Invisible placeholder keeps the line breaks honest… */}
      <span style={{ opacity: 0 }}>{char}</span>
      {/* …while the visible copy rides the scroll progress. */}
      <motion.span
        style={{ opacity, position: 'absolute', left: 0, top: 0 }}
        aria-hidden="true"
      >
        {char}
      </motion.span>
    </span>
  );
}

export default function AnimatedText({ text, className, style }: AnimatedTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'end 0.2'],
  });

  const words = text.split(' ');
  const step = 1 / Array.from(text).length;
  let charIndex = 0;

  return (
    <p ref={ref} className={className} style={style} aria-label={text}>
      {words.map((word, w) => {
        // Words are inline-block so a line only ever breaks between them —
        // the characters inside still light up one at a time.
        const node = (
          <span key={`w-${w}`} style={{ display: 'inline-block' }}>
            {Array.from(word).map((char, c) => {
              const i = charIndex + c;
              return (
                <Char
                  key={`c-${c}`}
                  char={char}
                  progress={scrollYProgress}
                  range={[i * step, (i + 1) * step]}
                />
              );
            })}
          </span>
        );
        charIndex += word.length + 1; // +1 for the space that followed it
        return w === words.length - 1 ? node : [node, <span key={`s-${w}`}> </span>];
      })}
    </p>
  );
}
