import type { Metadata } from "next";
import Link from "next/link";

import { LegalDoc } from "@/components/legal/LegalDoc";
import { pageMetadata } from "@/lib/seo";
import { contactEmail, contactPhone, mailingAddress, studio } from "@/lib/studio";

export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  description: `What ${studio.name} collects through this website, why, where it is kept and how to have it deleted.`,
  path: "/privacy",
});

function HowToReach() {
  if (contactEmail) {
    return (
      <>
        email{" "}
        <a href={`mailto:${contactEmail}`} className="link">
          {contactEmail}
        </a>
      </>
    );
  }
  if (contactPhone) return <>call {contactPhone}</>;
  return (
    <>
      write through the{" "}
      <Link href="/contact" className="link">
        contact form
      </Link>
    </>
  );
}

export default function PrivacyPage() {
  return (
    <LegalDoc
      eyebrow="Privacy"
      title="Privacy policy"
      updated="November 12, 2026"
      intro={
        <p>
          This website collects very little. Here is what it is, why I keep it and how you can have it removed.
          &ldquo;I&rdquo; and &ldquo;we&rdquo; mean {studio.name}, which is run by one person.
        </p>
      }
      sections={[
        {
          id: "what",
          title: "What the contact form collects",
          body: (
            <>
              <p>When you send a request, the form sends what you typed:</p>
              <ul>
                <li>your name, your restaurant&rsquo;s name, your email address and, if you give it, your phone number</li>
                <li>the city and state, and your current website if you list one</li>
                <li>what you need, how you would like to be contacted and anything else you write</li>
              </ul>
              <p>
                It also records the date and time and a reference number for your request. That is all. You can
                browse the rest of the site without giving any information.
              </p>
            </>
          ),
        },
        {
          id: "why",
          title: "Why it is collected",
          body: (
            <p>
              Only to reply to you and to talk about a possible project. Your details are not sold, rented or shared
              for marketing, and you will not be added to a mailing list. If we work together, the project agreement
              says how project information is handled.
            </p>
          ),
        },
        {
          id: "where",
          title: "Where it is kept",
          body: (
            <>
              <p>A request you send is stored in two places, both in accounts the studio controls:</p>
              <ul>
                <li>
                  <strong>A Google Sheet</strong>, where each request becomes one row, kept with Google Workspace or a
                  Google account.
                </li>
                <li>
                  <strong>Email</strong>: the studio receives a copy of the request, and you receive a short automatic
                  note that it arrived.
                </li>
              </ul>
              <p>
                Google processes this information under its own terms and privacy policy. Requests are kept while they
                are useful for replying and for keeping a record of past conversations, and are deleted when they
                are no longer needed or when you ask.
              </p>
            </>
          ),
        },
        {
          id: "hosting",
          title: "Hosting and server logs",
          body: (
            <p>
              The site is hosted by Vercel. Like any web host, it keeps short-lived technical logs of requests, such
              as the page asked for, the time, the browser type and the IP address, to keep the service running and
              secure. The form also uses your IP address for a few minutes, in memory, to stop automated abuse. It is
              not stored with your request.
            </p>
          ),
        },
        {
          id: "cookies",
          title: "Cookies, analytics and advertising",
          body: (
            <p>
              None. This site has no analytics, no advertising trackers, no social media pixels and no third-party
              scripts. It sets no cookies. The fonts are served from this site.
            </p>
          ),
        },
        {
          id: "rights",
          title: "Seeing, correcting or deleting your information",
          body: (
            <>
              <p>
                You can ask what I have about you, ask me to correct it, or ask me to delete it. To do any of these,{" "}
                <HowToReach /> and say which request you sent. I will confirm within a few business days once it is
                done.
              </p>
              {mailingAddress ? <p>By post: {mailingAddress}</p> : null}
            </>
          ),
        },
        {
          id: "children",
          title: "Children",
          body: <p>This site is for restaurant owners and managers. It is not meant for children under 13.</p>,
        },
        {
          id: "changes",
          title: "Changes to this policy",
          body: (
            <p>
              If this policy changes, the new version will be posted here with a new date at the top. Requests already
              received are handled under the policy that was in place when they were sent, unless you agree otherwise.
            </p>
          ),
        },
      ]}
    />
  );
}
