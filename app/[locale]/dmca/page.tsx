import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

const DMCA_EMAIL = process.env.NEXT_PUBLIC_DMCA_EMAIL || "dmca@pdfsum.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  return {
    title: "DMCA / Copyright Policy — PDF Summary AI",
    description: "Our DMCA takedown policy, copyright infringement reporting process, and designated agent information.",
  };
}

export default async function DMCAPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-gray-50 py-16" id="main-content">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">DMCA / Copyright Policy</h1>

        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Copyright Infringement Notification</h2>
            <p className="mb-3">
              PDF Summary AI respects the intellectual property rights of others and expects its users to do the same.
              In accordance with the Digital Millennium Copyright Act (DMCA), we have implemented procedures for receiving
              written notification of claimed copyright infringement and for processing such claims.
            </p>
            <p>
              If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement
              and is accessible via our service, please notify our designated copyright agent as set forth below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Designated Copyright Agent</h2>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="font-medium text-gray-900">Copyright Agent</p>
              <p>PDF Summary AI</p>
              <p>Email: <a href={`mailto:${DMCA_EMAIL}`} className="text-blue-600 hover:underline">{DMCA_EMAIL}</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. DMCA Takedown Notice Requirements</h2>
            <p className="mb-3">To be effective, your DMCA takedown notice must include the following:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
              <li>Identification of the copyrighted work claimed to have been infringed, or, if multiple copyrighted works are covered by a single notification, a representative list of such works.</li>
              <li>Identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed or access to which is to be disabled, and information reasonably sufficient to permit us to locate the material (e.g., document URL or share ID).</li>
              <li>Your contact information, including your address, telephone number, and email address.</li>
              <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
              <li>A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Counter-Notification</h2>
            <p className="mb-3">
              If you believe that your material was removed or disabled by mistake or misidentification, you may submit a
              counter-notification to our Copyright Agent. Your counter-notification must include:
            </p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Your physical or electronic signature.</li>
              <li>Identification of the material that has been removed or to which access has been disabled and the location at which the material appeared before it was removed or access disabled.</li>
              <li>A statement under penalty of perjury that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification.</li>
              <li>Your name, address, and telephone number, and a statement that you consent to the jurisdiction of the Federal District Court for the judicial district in which your address is located (or if outside the United States, that you consent to jurisdiction of any judicial district in which we may be found), and that you will accept service of process from the person who provided the original notification or an agent of such person.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Repeat Infringers</h2>
            <p>
              It is our policy to terminate the accounts of users who are repeat infringers of copyright. We reserve the right
              to terminate access to our service for any user who has been found to have infringed the copyrights of others
              on multiple occasions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. User Content License</h2>
            <p>
              By uploading content to PDF Summary AI, you represent and warrant that you have the right to upload such content
              and that doing so does not violate any third-party rights, including copyright. You may not upload content that
              infringes the intellectual property rights of others.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Good Faith & False Claims</h2>
            <p>
              Please note that under Section 512(f) of the DMCA, any person who knowingly materially misrepresents that material
              or activity is infringing may be subject to liability. Please ensure that your claim is accurate before submitting it.
            </p>
          </section>

          <p className="text-sm text-gray-500 pt-4 border-t">Last updated: July 29, 2026</p>
        </div>
      </div>
    </main>
  );
}
