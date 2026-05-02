import React from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Wraps children in a fade transition keyed by the current pathname.
 * Framer-motion AnimatePresence handles mount/unmount cross-fade.
 */
export default function PageTransition({ children }) {
  const { pathname } = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.45, ease: [0.22, 0.9, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
