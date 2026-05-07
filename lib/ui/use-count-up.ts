import { useEffect, useRef, useState } from "react";
import { useReduceMotion } from "lib/ui/use-reduce-motion";

interface UseCountUpOptions {
    readonly duration?: number;
    readonly delay?: number;
}

/**
 * Animate a number from 0 up to a target value.
 *
 * Uses requestAnimationFrame with an ease-out curve so the value lands cleanly
 * rather than snapping at the end. When the OS reports reduce-motion is on,
 * the hook returns the final value immediately and skips the animation.
 *
 * @param target Final numeric value to animate toward.
 * @param options.duration Animation duration in milliseconds (default 700).
 * @param options.delay Delay before the animation begins (default 0).
 * @returns The current animated value, suitable for rendering each frame.
 */
export function useCountUp(target: number, options: UseCountUpOptions = {}): number {
    const { duration = 700, delay = 0 } = options;
    const reduceMotion = useReduceMotion();
    const [value, setValue] = useState(reduceMotion ? target : 0);
    const rafRef = useRef<number | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (reduceMotion || !Number.isFinite(target)) {
            setValue(target);
            return undefined;
        }

        // Reset to zero on each new target so the animation always reads as
        // "filling up" rather than partially jumping forward.
        setValue(0);

        const startAnimation = () => {
            const startTime = Date.now();
            const tick = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(1, elapsed / duration);
                // ease-out cubic — a soft landing without overshoot.
                const eased = 1 - Math.pow(1 - progress, 3);
                setValue(target * eased);

                if (progress < 1) {
                    rafRef.current = requestAnimationFrame(tick);
                } else {
                    setValue(target);
                }
            };
            rafRef.current = requestAnimationFrame(tick);
        };

        if (delay > 0) {
            timeoutRef.current = setTimeout(startAnimation, delay);
        } else {
            startAnimation();
        }

        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            if (timeoutRef.current !== null) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [target, duration, delay, reduceMotion]);

    return value;
}
