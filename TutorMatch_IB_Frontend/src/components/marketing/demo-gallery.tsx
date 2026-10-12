"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { SectionHeading } from "@/components/marketing/section-heading";
import { cn } from "@/lib/utils";

/** How long each slide is shown before the carousel advances on its own. */
const AUTOPLAY_MS = 5000;

const slides = [
  {
    id: "one-to-one",
    title: "One-to-one attention",
    body: "Every session focuses on a single student, so questions get answered on the spot.",
    src: "/images/gallery/one-to-one.jpg",
    alt: "A tutor leaning in to help one student with their work at a desk.",
  },
  {
    id: "whiteboard",
    title: "Live on the whiteboard",
    body: "Step-by-step working on a shared board keeps each lesson clear and easy to follow.",
    src: "/images/gallery/whiteboard.jpg",
    alt: "A teacher working through a problem with a student at their desk.",
  },
  {
    id: "exam-prep",
    title: "Exam-ready practice",
    body: "Mock questions and timed practice build confidence for WAEC, NECO and every other level.",
    src: "/images/gallery/exam-prep.jpg",
    alt: "A student revising with books and notes ahead of an exam.",
  },
  {
    id: "online",
    title: "Learn from anywhere",
    body: "Online sessions bring the same trusted Ibadan tutors to a student wherever they are.",
    src: "/images/gallery/online.jpg",
    alt: "A tutor teaching students over a video call on a laptop.",
  },
] as const;

export function DemoGallery() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const goTo = (index: number) => setActive((index + count) % count);

  // Auto-advance the carousel. It pauses while the visitor is hovering or
  // focused inside it, and never runs at all for someone who has asked for
  // reduced motion.
  useEffect(() => {
    if (paused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % count);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [paused, count]);

  return (
    <section className="bg-background">
      <div className="container-page py-16 lg:py-24">
        <SectionHeading
          align="center"
          eyebrow="A day with TutorMatch IB"
          title="Real lessons, at home or online."
          description="From the first request to the final mock exam, here is how a session comes to life."
        />

        <div
          className="mx-auto mt-12 max-w-4xl"
          role="group"
          aria-roledescription="carousel"
          aria-label="Photos from tutoring sessions"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${active * 100}%)` }}
            >
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="w-full shrink-0"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${count}`}
                  aria-hidden={index !== active}
                >
                  <div className="relative h-[240px] w-full sm:h-[340px]">
                    <Image
                      src={slide.src}
                      alt={slide.alt}
                      fill
                      sizes="(min-width: 1024px) 896px, 100vw"
                      className="object-cover"
                      priority={index === 0}
                    />
                  </div>
                  <div className="p-6 sm:p-8">
                    <h3 className="text-lg font-semibold tracking-tight">{slide.title}</h3>
                    <p className="mt-1.5 leading-relaxed text-muted-foreground text-pretty">
                      {slide.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              aria-label="Previous slide"
              className="flex size-10 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-2" role="tablist" aria-label="Choose a slide">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={index === active}
                  aria-label={`Show slide: ${slide.title}`}
                  onClick={() => goTo(index)}
                  className="p-1"
                >
                  <span
                    className={cn(
                      "block h-2 w-2 rounded-full transition-colors",
                      index === active ? "bg-brand-emerald-deep" : "bg-muted-foreground/30",
                    )}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => goTo(active + 1)}
              aria-label="Next slide"
              className="flex size-10 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}