// Test helper: render a hook-free function component to its React element
// tree (no DOM) and walk it, so tests can check what a component draws.

import React from "react";

type El = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

const isEl = (n: unknown): n is El => typeof n === "object" && n !== null && "type" in n && "props" in n;

/** Every element in the tree, depth first (function components are called, so their output is included). */
export const elements = (node: unknown): El[] => {
  const out: El[] = [];
  const visit = (n: unknown) => {
    if (Array.isArray(n)) return n.forEach(visit);
    if (!isEl(n)) return;
    if (typeof n.type === "function") return visit((n.type as (p: unknown) => unknown)(n.props));
    out.push(n);
    visit(n.props.children);
  };
  visit(node);
  return out;
};

/** A component's element tree for these props. */
export const draw = <P extends object>(c: React.FC<P>, props: P): El[] => elements((c as (p: P) => unknown)(props));
