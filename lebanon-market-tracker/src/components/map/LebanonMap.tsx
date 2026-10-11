"use client";
import dynamic from "next/dynamic";
import type { MapLayer } from "./LebanonMapInner";
import { Skeleton } from "../ui";

const Inner = dynamic(() => import("./LebanonMapInner"), { ssr: false, loading: () => <Skeleton className="h-[420px] w-full" /> });

export type { MapLayer };
export function LebanonMap(props: { layers: MapLayer[]; height?: number }) {
  return <Inner {...props} />;
}
