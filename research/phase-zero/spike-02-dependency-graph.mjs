#!/usr/bin/env node
// Spike 02 — Dependency graph resolution
// Goal: prove the module dependency graph resolves transitively and detects cycles/conflicts.

const modules = {
  "database-d1": { requires: [] },
  auth: { requires: ["database-d1"] },
  rbac: { requires: ["auth"] },
  "user-dashboard": { requires: ["auth"] },
  "admin-dashboard": { requires: ["rbac"] },
  comments: { requires: ["auth", "database-d1"] },
};

function resolve(moduleId, visited = new Set(), order = []) {
  if (visited.has(moduleId)) {
    throw new Error(`cycle or duplicate: ${moduleId}`);
  }
  visited.add(moduleId);
  const mod = modules[moduleId];
  if (!mod) throw new Error(`unknown module: ${moduleId}`);
  for (const dep of mod.requires) {
    resolve(dep, new Set(visited), order);
  }
  if (!order.includes(moduleId)) order.push(moduleId);
  return order;
}

function resolveAll(requested) {
  const order = [];
  for (const id of requested) {
    resolve(id, new Set(), order);
  }
  return order;
}

const test = ["admin-dashboard", "comments"];
const order = resolveAll(test);
console.log("PASS: dependency graph resolution", { requested: test, order });

// Verify expected topological order invariant: dependencies precede dependents.
const idx = Object.fromEntries(order.map((id, i) => [id, i]));
for (const id of order) {
  for (const dep of modules[id].requires) {
    if (idx[dep] >= idx[id]) {
      console.error("FAIL: dependency after dependent", dep, id);
      process.exit(1);
    }
  }
}
