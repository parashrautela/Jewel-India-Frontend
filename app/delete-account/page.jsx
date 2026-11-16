// Public page required by Google Play (Data safety → account deletion URL). No sign-in needed.
export const metadata = {
  title: "Delete your account · Jewel India",
  description: "How to delete your Jewel India account and what happens to your data.",
};

const steps = [
  "Open the Jewel India app and sign in.",
  "Approved accounts: tap your profile picture (top right) → Profile → Delete account.",
  "Accounts still under review: on the status screen, tap Delete account (Android), or contact us as shown below.",
  "Confirm with “Delete account permanently”. You are signed out and the account is gone.",
];

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#2c1f18] px-4 py-12">
      <article className="mx-auto max-w-[600px] flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-[#8a7a6f]">Jewel India</p>
          <h1 className="text-[28px] font-serif font-bold text-[#111]">Delete your account</h1>
          <p className="text-[15px] leading-relaxed text-[#4b4038]">
            You can delete your Jewel India account at any time, from the app or by asking us.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-[17px] font-bold text-[#111]">In the app (Android or iPhone)</h2>
          <ol className="list-decimal pl-5 flex flex-col gap-2 text-[15px] leading-relaxed">
            {steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[17px] font-bold text-[#111]">Can&apos;t open the app?</h2>
          <p className="text-[15px] leading-relaxed">
            Call us on <a className="underline font-semibold" href="tel:+919897453396">+91 98974 53396</a> from the phone
            number or with the email address on your account, and ask us to delete it. We confirm who you are, delete
            the account, and tell you when it&apos;s done.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[17px] font-bold text-[#111]">What is deleted</h2>
          <ul className="list-disc pl-5 flex flex-col gap-2 text-[15px] leading-relaxed">
            <li>Your sign-in account (email, phone number, password).</li>
            <li>Your business profile and verification details.</li>
            <li>Your catalogue: designs and their photos.</li>
            <li>Your Chamak history and credit balance.</li>
          </ul>
          <p className="text-[15px] leading-relaxed">
            Copies of the verification documents you uploaded (Aadhaar, PAN, GST) are deleted when you contact us
            using the number above. Deletion is permanent and can&apos;t be undone. Records we must keep by law, such
            as tax invoices for payments, are kept only for the period the law requires.
          </p>
        </section>

        <footer className="text-[13px] text-[#8a7a6f]">
          See also our <a className="underline" href="https://jewelindia.shop/privacy-policy">Privacy Policy</a>.
        </footer>
      </article>
    </main>
  );
}
