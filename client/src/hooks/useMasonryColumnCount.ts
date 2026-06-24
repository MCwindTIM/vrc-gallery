import { useEffect, useState } from "react";
import { masonryColumnCount } from "../lib/masonryColumns";

export function useMasonryColumnCount(): number {
  const [count, setCount] = useState(() => masonryColumnCount());

  useEffect(() => {
    const update = () => setCount(masonryColumnCount());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return count;
}
