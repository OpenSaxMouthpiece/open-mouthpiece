import paramDocs from "./paramDocs.json";

// Links shown in the app. The printing guide points at the repository's copy of
// docs/PRINTING.md.
export const REPO_URL = "https://github.com/OpenSaxMouthpiece/open-mouthpiece";
export const PRINTING_GUIDE_URL = REPO_URL ? `${REPO_URL}/blob/master/docs/PRINTING.md` : "";
// The words (tip, facing, baffle, ...) with labelled pictures.
export const GLOSSARY_URL = REPO_URL ? `${REPO_URL}/blob/master/docs/GLOSSARY.md` : "";
// The user guide (it links to the printing guide, the glossary and every setting).
export const DOCS_URL = REPO_URL ? `${REPO_URL}/blob/master/docs/GUIDE.md` : "";

// Each setting's section of docs/PARAMETERS.md (its picture and longer notes), by the fixed
// target scripts/param_docs.mjs gives it. The dev site and a local server link the `dev` branch's
// copy, so settings not live yet are found. "" for a setting the page doesn't have.
const DOCUMENTED = new Set<string>(paramDocs);
const DOCS_BRANCH =
  import.meta.env.DEV || (typeof location !== "undefined" && location.hostname.startsWith("dev.")) ? "dev" : "master";
export const paramDocUrl = (name: string) =>
  REPO_URL && DOCUMENTED.has(name) ? `${REPO_URL}/blob/${DOCS_BRANCH}/docs/PARAMETERS.md#${name}` : "";
// What changed, newest first (About's "What's new"); the dev site shows what's coming next.
export const CHANGELOG_URL = REPO_URL ? `${REPO_URL}/blob/${DOCS_BRANCH}/CHANGELOG.md` : "";

// Donation page (Ko-fi). Empty hides every donation link.
export const DONATE_URL = "https://ko-fi.com/opensaxmouthpiece";

// The mouthpieces the presets were measured from (rounded dimensions only; credited in README.md).
export const PRESET_SOURCES: { label: string; url: string }[] = [
  { label: '"64" soprano', url: "https://www.thingiverse.com/thing:6645219" },
  { label: '"64" alto', url: "https://www.thingiverse.com/thing:6645230" },
  { label: '"64" tenor', url: "https://www.thingiverse.com/thing:6645238" },
  { label: '"64" bari', url: "https://www.thingiverse.com/thing:6645244" },
];
