export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-800 p-10 font-inter">
      {/* Header */}
      <header className="mb-8 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-[#FF5722]">Privacy Policy</h1>
        <p className="text-gray-500 mt-1">
          Last updated: September 2025
        </p>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto space-y-8 text-gray-700 leading-relaxed">
        <p>
          <strong>RideSafee</strong> (“we”, “our”, or “the app”) respects your
          privacy and is committed to protecting your personal information. This
          Privacy Policy explains how we collect, use, and protect your data when
          you use our mobile application.
        </p>

        {/* Section 1 */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">
            1. Information We Collect
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Location Data:</strong> Real-time location (with your
              permission) to connect you with nearby mechanics during vehicle
              breakdowns.
            </li>
            <li>
              <strong>Personal Information:</strong>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Email address</li>
                <li>Profile picture</li>
                <li>Vehicle information (such as vehicle type)</li>
              </ul>
            </li>
            <li>
              <strong>Usage Purpose Only:</strong> We do not collect analytics
              data and do not display ads.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">
            2. How We Use Your Information
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Locating users during emergencies or breakdowns</li>
            <li>Connecting users with mechanics</li>
            <li>Managing user accounts and profiles</li>
            <li>Providing customer support</li>
            <li>Ensuring the safety and reliability of the service</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">
            3. Data Sharing and Third Parties
          </h2>
          <p className="mb-2">
            We only share data with trusted third-party services required to
            operate the app:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Firebase</strong> – backend services and secure data storage
            </li>
            <li>
              <strong>Google Maps</strong> – location and navigation services
            </li>
            <li>
              <strong>OpenAI (ChatGPT API)</strong> – in-app chat or assistance
              features
            </li>
          </ul>
          <p className="mt-3">
            We <strong>do not sell or share</strong> your personal data with
            advertisers or for marketing purposes.
          </p>
        </section>

        {/* Section 4 */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">
            4. Children’s Privacy
          </h2>
          <p>
            RideSafee is <strong>not intended for children under the age of
            13</strong>. We do not knowingly collect personal data from children
            under 13. If such data is identified, it will be deleted immediately.
          </p>
        </section>

        {/* Section 5 */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">
            5. Data Security
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Secure storage using Firebase infrastructure</li>
            <li>Restricted access to personal data</li>
            <li>Secure transmission using HTTPS</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">
            6. Contact Information
          </h2>
          <ul className="space-y-2">
            <li>
              <strong>Email:</strong>{" "}
              <a
                href="mailto:papasarone@gmail.com"
                className="text-[#FF5722] hover:underline"
              >
                papasarone@gmail.com
              </a>
            </li>
            <li>
              <strong>Phone:</strong> 09690137705
            </li>
          </ul>
        </section>

        {/* Section 7 */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">
            7. Account Deletion and Data Removal
          </h2>
          <p>
            You can delete your account and associated data at any time through
            the <strong>Account Settings</strong> within the app. Once deleted,
            your data will be permanently removed unless retention is required
            by law.
          </p>
        </section>

        {/* Section 8 */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">
            8. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes will
            be posted on this page, and continued use of the app indicates
            acceptance of the updated policy.
          </p>
        </section>
      </div>

      {/* Back Button */}
      <button
        onClick={() => window.history.back()}
        className="fixed bottom-8 right-8 bg-[#FF5722] text-white px-5 py-3 rounded-lg shadow-lg hover:bg-[#e64a19] transition-all z-50"
      >
        ← Back
      </button>
    </div>
  );
}
