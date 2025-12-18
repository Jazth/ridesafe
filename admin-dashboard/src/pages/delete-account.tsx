export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-white text-gray-800 p-10 font-inter">
      {/* Header */}
      <header className="mb-8 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-[#FF5722]">
          Delete Account
        </h1>
        <p className="text-gray-500 mt-1">
          How to permanently remove your RideSafee account
        </p>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto space-y-8 text-gray-700 leading-relaxed">
        <p>
          This page explains how you can permanently delete your
          <strong> RideSafee</strong> account and associated data.
        </p>

        {/* Section */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">
            How to Delete Your Account
          </h2>

          <ol className="list-decimal pl-5 space-y-3">
            <li>
              Open the <strong>RideSafee</strong> mobile application.
            </li>
            <li>
              Go to <strong>Account Settings</strong>.
            </li>
            <li>
              Tap the <strong>Delete Account</strong> button.
            </li>
            <li>
              You will be asked to <strong>confirm</strong> before deletion.
            </li>
          </ol>
        </section>

        {/* Warning */}
        <section className="border border-red-200 bg-red-50 rounded-lg p-4">
          <h3 className="text-lg font-bold text-red-600 mb-2">
            Important Notice
          </h3>
          <p>
            Once your account is deleted, it will be
            <strong> permanently removed</strong>. Your account and all
            associated data will be gone forever and cannot be recovered.
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
