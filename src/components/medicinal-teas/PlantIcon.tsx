"use client";

import type { PlantIconType } from "@/lib/medicinal-teas/types";
import {
  Flower2, Leaf, Circle, TreeDeciduous, Apple, Sprout,
} from "lucide-react";

const ICONS: Record<PlantIconType, typeof Leaf> = {
  leaf: Leaf,
  root: Sprout,
  bark: TreeDeciduous,
  flower: Flower2,
  seed: Circle,
  fruit: Apple,
  bulb: Sprout,
};

export default function PlantIcon({
  type,
  className = "w-8 h-8",
  style,
}: {
  type: PlantIconType;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = ICONS[type] || Leaf;
  return <Icon className={className} style={style} aria-hidden />;
}
