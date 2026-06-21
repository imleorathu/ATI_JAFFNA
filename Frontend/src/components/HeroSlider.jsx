import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./HeroSlider.module.css";

const defaultSlides = [
  {
    title: "Design That Moves",
    subtitle: "A cinematic hero experience with immersive transitions, layered depth, and responsive interaction.",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2200&q=85",
    ctaText: "Explore Work",
    ctaLink: "#"
  },
  {
    title: "Built For Impact",
    subtitle: "Premium landing-page motion with clean typography, strong contrast, and a smooth product-story rhythm.",
    image: "https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=2200&q=85",
    ctaText: "View Case Study",
    ctaLink: "#"
  },
  {
    title: "Focused Momentum",
    subtitle: "Touch, keyboard, autoplay, and clean fullscreen presentation tuned for modern portfolio and SaaS pages.",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2200&q=85",
    ctaText: "Start Now",
    ctaLink: "#"
  }
];

const swipeThreshold = 54;
const ease = [0.76, 0, 0.24, 1];

function clampSlides(slides) {
  return Array.isArray(slides) && slides.length ? slides.filter((slide) => slide?.image && slide?.title) : defaultSlides;
}

export default function HeroSlider({
  slides = defaultSlides,
  autoplay = false,
  autoplayDelay = 6500,
  loop = true,
  showDots = true,
  showArrows = true,
  showScrollIndicator = true,
  className = "",
  ariaLabel = "Featured hero slides"
}) {
  const items = useMemo(() => clampSlides(slides), [slides]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pointerStart, setPointerStart] = useState(null);
  const sliderRef = useRef(null);
  const transitionLock = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sliderRef,
    offset: ["start start", "end start"]
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "0%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [1, 1] : [1, 1.06]);
  const contentY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -90]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.76], [1, 0.35]);
  const smoothImageY = useSpring(imageY, { stiffness: 90, damping: 26, mass: 0.35 });
  const smoothImageScale = useSpring(imageScale, { stiffness: 90, damping: 24, mass: 0.35 });
  const smoothContentY = useSpring(contentY, { stiffness: 90, damping: 26, mass: 0.35 });
  const smoothContentOpacity = useSpring(contentOpacity, { stiffness: 100, damping: 24, mass: 0.35 });

  const goTo = useCallback(
    (nextIndex, nextDirection = 1) => {
      if (transitionLock.current || items.length < 2) return;
      transitionLock.current = true;
      setActiveIndex((current) => {
        const resolved = typeof nextIndex === "number" ? nextIndex : current + nextDirection;
        const next = loop ? (resolved + items.length) % items.length : Math.min(items.length - 1, Math.max(0, resolved));
        if (next === current) transitionLock.current = false;
        return next;
      });
      window.setTimeout(() => {
        transitionLock.current = false;
      }, 220);
    },
    [items.length, loop]
  );

  const goNext = useCallback(() => goTo(null, 1), [goTo]);
  const goPrev = useCallback(() => goTo(null, -1), [goTo]);

  useEffect(() => {
    if (!autoplay || items.length < 2) return undefined;
    const timer = window.setInterval(goNext, Math.max(2200, Number(autoplayDelay) || 6500));
    return () => window.clearInterval(timer);
  }, [autoplay, autoplayDelay, goNext, items.length]);

  useEffect(() => {
    const preloadIndexes = [(activeIndex + 1) % items.length, (activeIndex - 1 + items.length) % items.length];
    preloadIndexes.forEach((index) => {
      const image = new Image();
      image.src = items[index]?.image;
    });
  }, [activeIndex, items]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") goNext();
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") goPrev();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  const sliderMarkup = (
    <div
      ref={sliderRef}
      className={`${styles.slider} ${className}`}
      aria-label={ariaLabel}
      role="region"
    >
      {items.map((slide, index) => {
        const isActive = index === activeIndex;

        return (
          <motion.article
            key={`${slide.title}-${index}`}
            className={`${styles.slide} ${isActive ? styles.slideActive : ""}`}
            initial={false}
            animate={{
              opacity: isActive ? 1 : 0,
              scale: isActive ? 1 : 1.035
            }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.9, ease }}
            aria-hidden={!isActive}
          >
            <motion.img
              src={slide.image}
              alt=""
              draggable="false"
              className={styles.image}
              style={{
                y: smoothImageY,
                scale: smoothImageScale
              }}
            />
            <div className={styles.overlay} />

            {isActive && (
              <motion.div
                className={styles.content}
                style={{
                  y: smoothContentY,
                  opacity: smoothContentOpacity
                }}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.72, ease }}
              >
                <motion.h1
                  className={styles.title}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.72, ease }}
                >
                  {slide.title}
                </motion.h1>

                {slide.subtitle && (
                  <motion.p
                    className={styles.subtitle}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                    animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.64, delay: 0.08, ease }}
                  >
                    {slide.subtitle}
                  </motion.p>
                )}

                {slide.ctaText && slide.ctaLink && (
                  <motion.a
                    href={slide.ctaLink}
                    className={styles.cta}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                    animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.56, delay: 0.16, ease }}
                  >
                    {slide.ctaText}
                  </motion.a>
                )}
              </motion.div>
            )}
          </motion.article>
        );
      })}

      <div
        className={styles.gestureLayer}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse") return;
          setPointerStart({ x: event.clientX, y: event.clientY });
        }}
        onPointerUp={(event) => {
          if (!pointerStart) return;
          const dx = event.clientX - pointerStart.x;
          const dy = event.clientY - pointerStart.y;
          setPointerStart(null);
          if (Math.max(Math.abs(dx), Math.abs(dy)) < swipeThreshold) return;
          if (Math.abs(dx) > Math.abs(dy)) {
            if (loop || (dx < 0 && activeIndex < items.length - 1) || (dx > 0 && activeIndex > 0)) {
              dx < 0 ? goNext() : goPrev();
            }
          } else {
            if (loop || (dy < 0 && activeIndex < items.length - 1) || (dy > 0 && activeIndex > 0)) {
              dy < 0 ? goNext() : goPrev();
            }
          }
        }}
        onPointerCancel={() => setPointerStart(null)}
      />

      {showArrows && items.length > 1 && (
        <div className={styles.arrows} aria-label="Hero slider navigation">
          <button type="button" className={styles.arrowButton} onClick={goPrev} aria-label="Previous slide">
            <ChevronLeft size={22} />
          </button>
          <button type="button" className={styles.arrowButton} onClick={goNext} aria-label="Next slide">
            <ChevronRight size={22} />
          </button>
        </div>
      )}

      {showDots && items.length > 1 && (
        <div className={styles.dots} role="tablist" aria-label="Hero slides">
          {items.map((slide, index) => (
            <button
              key={`${slide.title}-${index}`}
              type="button"
              role="tab"
              aria-selected={activeIndex === index}
              aria-label={`Go to slide ${index + 1}: ${slide.title}`}
              className={`${styles.dot} ${activeIndex === index ? styles.dotActive : ""}`}
              onClick={() => goTo(index, index > activeIndex ? 1 : -1)}
            />
          ))}
        </div>
      )}

      {showScrollIndicator && (
        <motion.div
          className={styles.scrollIndicator}
          animate={prefersReducedMotion ? undefined : { y: [0, 8, 0], opacity: [0.72, 1, 0.72] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          <ChevronDown size={24} />
        </motion.div>
      )}
    </div>
  );

  return sliderMarkup;
}
