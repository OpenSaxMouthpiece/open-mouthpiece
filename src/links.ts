// Links shown in the app. The printing guide points at the repository's copy of
// docs/PRINTING.md.
export const REPO_URL = "https://github.com/OpenSaxMouthpiece/open-mouthpiece";
export const PRINTING_GUIDE_URL = REPO_URL ? `${REPO_URL}/blob/master/docs/PRINTING.md` : "";
// The words (tip, facing, baffle, ...) with labelled pictures.
export const GLOSSARY_URL = REPO_URL ? `${REPO_URL}/blob/master/docs/GLOSSARY.md` : "";

// Donation page (Ko-fi). Empty hides every donation link.
export const DONATE_URL = "https://ko-fi.com/opensaxmouthpiece";

// The mouthpieces the presets were measured from (rounded dimensions only; credited in README.md).
export const PRESET_SOURCES: { label: string; url: string }[] = [
  { label: '"64" soprano', url: "https://www.thingiverse.com/thing:6645219" },
  { label: '"64" alto', url: "https://www.thingiverse.com/thing:6645230" },
  { label: '"64" tenor', url: "https://www.thingiverse.com/thing:6645238" },
  { label: '"64" bari', url: "https://www.thingiverse.com/thing:6645244" },
];
