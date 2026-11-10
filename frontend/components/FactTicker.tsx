"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import FACTS from "@/data/fun-facts.json";
import { BulbIcon } from "@/components/icons";

const SWITCH_MS = 5000;

/** "Did you know?" — a new travel fact every 5s, starting at a random one. */
export default function FactTicker() {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // Random start on the client only, so server and browser render the same first fact.
    setIdx(Math.floor(Math.random() * FACTS.length));
    const t = setInterval(() => setIdx((i) => (i + 1) % FACTS.length), SWITCH_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <p className="fact">
      <BulbIcon /> <b>Did you know?</b>{" "}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={idx}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {FACTS[idx]}
        </motion.span>
      </AnimatePresence>
    </p>
  );
}
