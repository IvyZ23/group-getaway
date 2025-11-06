import * as concepts from "@concepts";
import syncs from "@syncs";
import { $vars } from "@engine/vars";

console.log("Loaded concepts and syncs.");

for (const [name, func] of Object.entries(syncs)) {
  try {
    func($vars);
    console.log("OK", name);
  } catch (e) {
    console.error("ERROR in sync:", name, e);
  }
}
