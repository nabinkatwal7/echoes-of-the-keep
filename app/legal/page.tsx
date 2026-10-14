import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";

export const metadata = { title: "Legal and attribution" };

export default function Legal() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <PageHeader eyebrow="The fine print" title="Legal and attribution" />
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-display text-xl text-goldBright">An unofficial fan project</h2>
        <p>This site is not affiliated with, endorsed by or sponsored by Wizards of the Coast. Dungeons &amp; Dragons is a trademark of Wizards of the Coast LLC.</p>
      </Card>
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-display text-xl text-goldBright">System Reference Document 5.1</h2>
        <p>
          This work includes material taken from the System Reference Document 5.1 (&quot;SRD 5.1&quot;) by Wizards of the Coast LLC, available at{" "}
          <a className="text-gold underline" href="https://dnd.wizards.com/resources/systems-reference-document" rel="noreferrer">dnd.wizards.com/resources/systems-reference-document</a>.
          The SRD 5.1 is licensed under the{" "}
          <a className="text-gold underline" href="https://creativecommons.org/licenses/by/4.0/legalcode" rel="noreferrer">Creative Commons Attribution 4.0 International License</a>.
        </p>
      </Card>
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-display text-xl text-goldBright">Your content</h2>
        <p>Heroes, journal entries, homebrew monsters and campaign notes belong to the people who write them. You can download everything you have made, and delete your account, from the Account page.</p>
      </Card>
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-display text-xl text-goldBright">Analytics</h2>
        <p>When hosted on Vercel, the site counts page views with Vercel Web Analytics. It sets no cookies and does not follow you across sites; it records which pages are visited and broad details such as country and browser.</p>
      </Card>
    </div>
  );
}
