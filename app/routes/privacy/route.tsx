import styles from "./styles.module.css";

/**
 * Public privacy policy, linked from the App Store listing. Plain HTML on
 * purpose: it's read outside the Shopify admin, so no Polaris or App Bridge.
 */

const UPDATED = "9 November 2026";
const SUPPORT = "chopi-support@aaxira.co.uk";

export const meta = () => [
  { title: "Privacy policy — Chopi - Menu" },
  { name: "robots", content: "noindex" },
];

export default function Privacy() {
  return (
    <main className={styles.page}>
      <h1>Privacy policy</h1>
      <p className={styles.muted}>Last updated: {UPDATED}</p>

      <p>
        Chopi - Menu (the &quot;app&quot;) is a Shopify app that lets merchants design
        the mobile menu of their online store. This policy explains what
        information the app handles when you install it, why, and what your
        rights are. It applies to merchants who install the app and to their
        staff; it is not a policy for the shoppers who visit a store.
      </p>

      <h2>Information the app stores</h2>
      <p>When you install the app, it stores the following on our servers:</p>
      <ul>
        <li>
          <strong>Store details.</strong> Your store&apos;s myshopify domain, the
          Shopify access token the app needs to work, your plan and
          subscription status, and the dates the app was installed or
          uninstalled.
        </li>
        <li>
          <strong>Staff details.</strong> The name, email address and locale of
          the staff account that uses the app, as provided by Shopify with
          each login session. This is only used to sign you in.
        </li>
        <li>
          <strong>Your menu designs.</strong> Every menu you create, including
          drafts, published versions, version history, translations and custom
          CSS, and the collections, products, pages and blog posts you link to
          (by ID only).
        </li>
        <li>
          <strong>Support messages.</strong> If you contact us from the app&apos;s
          Help page, we keep the message, the topic and the reply-to email
          address you entered, and send them to our support mailbox.
        </li>
      </ul>

      <h2>Information the app reads from your store</h2>
      <p>
        The app asks Shopify for the minimum access it needs: products and
        collections, pages and blog posts, legal policies, themes, languages
        and reports, read-only, so you can pick them while editing a menu. It
        also writes files to your store&apos;s Files area (template images you
        choose) and writes its own app-owned metafields that hold the
        published menu. The app never edits your theme&apos;s code and never
        changes your store&apos;s navigation menus.
      </p>
      <p>
        <strong>The app does not collect customer data.</strong> It never
        reads customers, orders or checkout information. The menu shown on
        your storefront is rendered from your store&apos;s own data; it sets no
        cookies, contains no tracking and sends nothing about your shoppers to
        us.
      </p>

      <h2>How the information is used</h2>
      <ul>
        <li>To run the app and show your menus on your storefront.</li>
        <li>To bill you through Shopify&apos;s Billing API. We never see your payment details.</li>
        <li>To answer support requests.</li>
        <li>To keep the app secure and diagnose errors.</li>
      </ul>
      <p>
        We do not sell your information, use it for advertising, or share it
        with anyone except the service providers below.
      </p>

      <h2>Where the information is kept</h2>
      <p>
        The app runs on a server in the United Kingdom (Contabo GmbH) and keeps
        its database with Neon, Inc. Support emails are delivered through our
        own mail server. All connections to the app are encrypted (HTTPS).
      </p>

      <h2>How long it is kept</h2>
      <p>
        When you uninstall the app, Shopify sends us an uninstall notice and,
        48 hours later, a data-removal request. We then delete your store&apos;s
        record, menus, versions and support messages. Within those 48 hours
        you can reinstall and find your menus as you left them. Published
        menus stored in your store&apos;s metafields are removed by Shopify with the
        app.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask us at any time to show, correct or delete the information
        we hold about your store, and we will answer within 30 days. Merchants
        in the EEA and UK have the rights set out in the GDPR, including the
        right to complain to a supervisory authority. Shopify&apos;s own data
        requests (customer data request, customer redact, shop redact) are
        handled automatically.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes in a way that matters, we will update the date
        above and tell you in the app.
      </p>

      <h2>Contact</h2>
      <p>
        Email <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a>, or use the Help
        page inside the app.
      </p>
    </main>
  );
}
