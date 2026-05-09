"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./GooeyNav.module.css";

type GooeyItem = {
  label: string;
  href: string;
};

type GooeyNavProps = {
  items: GooeyItem[];
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[];
  initialActiveIndex?: number;
  activeIndex?: number;
  /** When set, anchors use preventDefault and parent owns scroll — avoids mismatch with programmatic smooth scroll */
  onNavigate?: (index: number, href: string) => void;
};

export default function GooeyNav({
  items,
  animationTime = 600,
  particleCount = 4,
  particleDistances = [90, 10],
  particleR = 100,
  timeVariance = 200,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
  initialActiveIndex = 0,
  activeIndex: controlledActiveIndex,
  onNavigate,
}: GooeyNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const filterRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);

  useEffect(() => {
    if (typeof controlledActiveIndex === "number" && controlledActiveIndex !== activeIndex) {
      setActiveIndex(controlledActiveIndex);
    }
  }, [controlledActiveIndex, activeIndex]);

  const noise = (n = 1) => n / 2 - Math.random() * n;

  const getXY = (distance: number, pointIndex: number, totalPoints: number) => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };

  const createParticle = (i: number, t: number, d: [number, number], r: number) => {
    const rotateBase = noise(r / 10);
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotateBase > 0 ? (rotateBase + r / 20) * 10 : (rotateBase - r / 20) * 10,
    };
  };

  const makeParticles = (element: HTMLSpanElement) => {
    const d = particleDistances;
    const r = particleR;
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty("--time", `${bubbleTime}ms`);

    for (let i = 0; i < particleCount; i += 1) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = createParticle(i, t, d, r);
      element.classList.remove(styles.effectActive);

      window.setTimeout(() => {
        const particle = document.createElement("span");
        const point = document.createElement("span");
        particle.classList.add(styles.particle);
        particle.style.setProperty("--start-x", `${p.start[0]}px`);
        particle.style.setProperty("--start-y", `${p.start[1]}px`);
        particle.style.setProperty("--end-x", `${p.end[0]}px`);
        particle.style.setProperty("--end-y", `${p.end[1]}px`);
        particle.style.setProperty("--time", `${p.time}ms`);
        particle.style.setProperty("--scale", `${p.scale}`);
        particle.style.setProperty("--color", `var(--color-${p.color}, white)`);
        particle.style.setProperty("--rotate", `${p.rotate}deg`);

        point.classList.add(styles.point);
        particle.appendChild(point);
        element.appendChild(particle);

        requestAnimationFrame(() => {
          element.classList.add(styles.effectActive);
        });

        window.setTimeout(() => {
          if (element.contains(particle)) {
            element.removeChild(particle);
          }
        }, t);
      }, 30);
    }
  };

  const updateEffectPosition = (element: HTMLLIElement) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = element.getBoundingClientRect();

    const stylePosition = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`,
    };

    Object.assign(filterRef.current.style, stylePosition);
    Object.assign(textRef.current.style, stylePosition);
    textRef.current.innerText = element.innerText;
  };

  const handleActivate = (liEl: HTMLLIElement, index: number) => {
    setActiveIndex(index);
    updateEffectPosition(liEl);

    if (filterRef.current) {
      filterRef.current.querySelectorAll(`.${styles.particle}`).forEach((p) => p.remove());
      makeParticles(filterRef.current);
    }

    if (textRef.current) {
      textRef.current.classList.remove(styles.effectTextActive);
      void textRef.current.offsetWidth;
      textRef.current.classList.add(styles.effectTextActive);
    }
  };

  useEffect(() => {
    if (!navRef.current || !containerRef.current) return;
    const activeLi = navRef.current.querySelectorAll("li")[activeIndex] as HTMLLIElement | undefined;
    if (activeLi) {
      updateEffectPosition(activeLi);
      textRef.current?.classList.add(styles.effectTextActive);
    }

    const resizeObserver = new ResizeObserver(() => {
      const currentActiveLi = navRef.current?.querySelectorAll("li")[activeIndex] as HTMLLIElement | undefined;
      if (currentActiveLi) updateEffectPosition(currentActiveLi);
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [activeIndex, styles.effectTextActive]);

  return (
    <div className={styles.container} ref={containerRef}>
      <nav className={styles.nav}>
        <ul ref={navRef} className={styles.list}>
          {items.map((item, index) => (
            <li
              key={item.label}
              className={`${styles.item} ${activeIndex === index ? styles.itemActive : ""}`}
            >
              <a
                href={item.href}
                onClick={(e) => {
                  const li = e.currentTarget.closest("li");
                  if (!(li instanceof HTMLLIElement)) return;
                  handleActivate(li, index);
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate(index, item.href);
                  }
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <span className={`${styles.effect} ${styles.effectFilter}`} ref={filterRef} />
      <span className={`${styles.effect} ${styles.effectText}`} ref={textRef} />
    </div>
  );
}
