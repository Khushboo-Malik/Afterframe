import { SITE } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="s-foot">
      <span>Built by {SITE.ownerName}</span>
      <span aria-hidden="true">·</span>
      <a href={SITE.githubProfileUrl} target="_blank" rel="noopener">GitHub</a>
      {SITE.linkedinUrl && (
        <>
          <span aria-hidden="true">·</span>
          <a href={SITE.linkedinUrl} target="_blank" rel="noopener">LinkedIn</a>
        </>
      )}
    </footer>
  );
}
