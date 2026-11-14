import { ExtIcon } from "@/components/icons";
import { SITE } from "@/lib/site";

// The owner's name links to LinkedIn; the ↗ says it leaves the site.
export default function SiteFooter() {
  return (
    <footer className="s-foot">
      <span>
        Built by{" "}
        {SITE.linkedinUrl ? (
          <a className="s-foot-me" href={SITE.linkedinUrl} target="_blank" rel="noopener">
            {SITE.ownerName}
            <ExtIcon />
            <span className="sr-only"> on LinkedIn (opens in a new tab)</span>
          </a>
        ) : (
          SITE.ownerName
        )}
      </span>
    </footer>
  );
}
