// The About panel (the rail's About; the phone's ☰ "About and help"): what the app is, how to use it,
// where designs live, where to get help, and the credits.
import { DONATE_URL, GLOSSARY_URL, PRINTING_GUIDE_URL, REPO_URL } from "../links";
import { Credits } from "./DesignPanel";

declare const __BUILD__: string;
declare const __BUILD_TIME__: string;

const ISSUES_URL = REPO_URL ? `${REPO_URL}/issues` : "";
const ext = { target: "_blank", rel: "noreferrer" } as const;

export function About() {
  const build = typeof __BUILD__ === "string" ? __BUILD__ : "";
  const when =
    typeof __BUILD_TIME__ === "string"
      ? new Date(__BUILD_TIME__).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
      : "";
  return (
    <div className="about">
      <p className="about-lead">Design your own saxophone mouthpiece and 3D print it: free, in your browser.</p>

      <h3>How it works</h3>
      <ol className="about-steps">
        <li>Pick a voice: soprano, alto, tenor or baritone (top left).</li>
        <li>Adjust the tip, facing, chamber and body; the model and the readouts follow.</li>
        <li>
          Download the STL and print it
          {PRINTING_GUIDE_URL && (
            <>
              {" "}
              (see the{" "}
              <a href={PRINTING_GUIDE_URL} {...ext}>
                printing guide
              </a>
              )
            </>
          )}
          .
        </li>
      </ol>
      {GLOSSARY_URL && (
        <p className="muted">
          New to the words?{" "}
          <a href={GLOSSARY_URL} {...ext}>
            The glossary
          </a>{" "}
          shows each part in a picture.
        </p>
      )}

      <h3>Your designs</h3>
      <p className="muted">
        They stay in your browser: no accounts, nothing saved on a server. Save as keeps a copy here; a download (.scad)
        or a Share link takes it elsewhere. Anonymous usage counts help improve the app (⚙ turns them off).
      </p>

      {ISSUES_URL && (
        <>
          <h3>Help and ideas</h3>
          <p className="muted">
            Something broken, or an idea?{" "}
            <a href={ISSUES_URL} {...ext}>
              Tell us on GitHub
            </a>
            . Open Mouthpiece is free software; the{" "}
            <a href={REPO_URL} {...ext}>
              source code
            </a>{" "}
            is open to read and improve.
          </p>
        </>
      )}

      {DONATE_URL && (
        <a className="button donate about-donate" href={DONATE_URL} {...ext}>
          ♥ Support Open Mouthpiece
        </a>
      )}

      <h3>Credits</h3>
      <Credits donate={false} />
      {build && (
        <p className="about-build muted">
          Version {build}
          {when && ` · ${when}`}
        </p>
      )}
    </div>
  );
}
