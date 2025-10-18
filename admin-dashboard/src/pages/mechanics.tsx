import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";

interface Mechanic {
  id: string;
  profilePictureUrl?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password?: string;
  businessName: string;
  serviceArea: string;
  licenseNumber: string;
  [key: string]: any;
}

export default function MechanicsPage() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [filtered, setFiltered] = useState<Mechanic[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);
  const [loading, setLoading] = useState(true);
  const [openFlagsId, setOpenFlagsId] = useState<string | null>(null);
  const [flagsByMechanic, setFlagsByMechanic] = useState<Record<string, any[]>>({});

  // Fetch all mechanics
  useEffect(() => {
    const fetchMechanics = async () => {
      try {
        const snapshot = await getDocs(collection(db, "mechanics"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Mechanic[];
        setMechanics(data);
        setFiltered(data);

        // Fetch flags for all mechanics upfront
        const notifSnapshot = await getDocs(collection(db, "mechanic_system_notifications"));
        const allFlags = notifSnapshot.docs.map(doc => doc.data());
        const groupedFlags: Record<string, any[]> = {};
        data.forEach((m) => {
          groupedFlags[m.id] = allFlags.filter(
            (f: any) => f.receiverId === m.id && f.type === "admin_action"
          );
        });
        setFlagsByMechanic(groupedFlags);
      } catch (error) {
        console.error("Error fetching mechanics or flags:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMechanics();
  }, []);

  // Filter mechanics by search
  useEffect(() => {
    const lower = search.toLowerCase();
    setFiltered(
      mechanics.filter((m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(lower)
      )
    );
  }, [search, mechanics]);

  return (
    <div className="min-h-screen bg-white text-gray-800 p-10 font-inter">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#FF5722]">Search Mechanics</h1>
          <p className="text-gray-500 mt-1">Find and view mechanic details.</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto">
        <input
          type="text"
          placeholder="Search mechanic by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-6 focus:ring-2 focus:ring-[#FF5722] focus:outline-none"
        />

        {loading ? (
          <p className="text-center text-gray-400">Loading mechanics...</p>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((mechanic) => (
              <div
                key={mechanic.id}
                className="relative border rounded-lg p-4 hover:border-[#FF5722] transition-all hover:shadow-md hover:scale-[1.01]"
              >
                {/* Flag Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // prevent opening modal
                    setOpenFlagsId(openFlagsId === mechanic.id ? null : mechanic.id);
                  }}
                  className={`absolute top-2 right-2 bg-[#FF5722] text-white px-2 py-1 rounded-full text-sm hover:bg-[#e64a19] flex items-center`}
                  title="View Flags"
                >
                  ⚑ {flagsByMechanic[mechanic.id]?.length || 0}
                </button>

                <div
                  onClick={() => setSelectedMechanic(mechanic)}
                  className="cursor-pointer"
                >
                  <h2 className="text-lg font-semibold text-[#FF5722]">{`${mechanic.firstName} ${mechanic.lastName}`}</h2>
                  <p className="text-sm text-gray-500">{mechanic.email}</p>
                </div>

                {/* Flags below card */}
                {openFlagsId === mechanic.id && flagsByMechanic[mechanic.id]?.length > 0 && (
                  <div className="mt-3 border-t border-gray-200 pt-3 space-y-2 max-h-48 overflow-y-auto">
                    {flagsByMechanic[mechanic.id].map((flag, idx) => (
                      <div key={idx} className="p-3 border rounded-lg bg-gray-50">
                        <p>
                          <span className="font-semibold">Action:</span>{" "}
                          {flag.message?.split("\n")[0] || "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold">Vehicle:</span>{" "}
                          {flag.message?.match(/Vehicle: (.*)/)?.[1] || "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold">Issue/Reason:</span>{" "}
                          {flag.message?.match(/Issue\/Reason: (.*)/)?.[1] || "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold">Pickup Address:</span>{" "}
                          {flag.message?.match(/Pickup Address: (.*)/)?.[1] || "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold">Reported On:</span>{" "}
                          {flag.createdAt
                            ? new Date(flag.createdAt.seconds * 1000).toLocaleString()
                            : "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 mt-10">No mechanics found.</p>
        )}
      </div>

      {/* Modal for mechanic details */}
      {selectedMechanic && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[90%] max-w-md relative animate-slideUp overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedMechanic(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-[#FF5722]"
            >
              ✕
            </button>

            {selectedMechanic.profilePictureUrl && (
              <div className="flex justify-center mb-4">
                <img
                  src={selectedMechanic.profilePictureUrl}
                  alt="Profile"
                  className="w-32 h-32 object-cover rounded-full border border-gray-300"
                />
              </div>
            )}

            <h2 className="text-2xl font-bold text-[#FF5722] mb-4">{`${selectedMechanic.firstName} ${selectedMechanic.lastName}`}</h2>

            <div className="space-y-2 text-gray-700">
              <p>
                <span className="font-semibold">Email:</span> {selectedMechanic.email}
              </p>
              <p>
                <span className="font-semibold">Phone:</span> {selectedMechanic.phoneNumber}
              </p>
              <p>
                <span className="font-semibold">Business:</span> {selectedMechanic.businessName}
              </p>
              <p>
                <span className="font-semibold">Service Area:</span> {selectedMechanic.serviceArea}
              </p>
              <p>
                <span className="font-semibold">License #:</span> {selectedMechanic.licenseNumber}
              </p>

              {/* Extra fields */}
              {Object.entries(selectedMechanic)
                .filter(
                  ([key]) =>
                    ![
                      "id",
                      "firstName",
                      "lastName",
                      "email",
                      "phoneNumber",
                      "businessName",
                      "serviceArea",
                      "licenseNumber",
                      "profilePictureUrl",
                    ].includes(key)
                )
                .map(([key, value]) => {
                  if (value && typeof value === "object" && "seconds" in value) {
                    const date = new Date(value.seconds * 1000);
                    return (
                      <p key={key}>
                        <span className="font-semibold capitalize">{key}:</span>{" "}
                        {date.toLocaleString()}
                      </p>
                    );
                  }
                  return (
                    <p key={key}>
                      <span className="font-semibold capitalize">{key}:</span> {String(value)}
                    </p>
                  );
                })}
            </div>

            <div className="mt-6 text-right">
              <button
                onClick={() => setSelectedMechanic(null)}
                className="bg-[#FF5722] text-white px-4 py-2 rounded-lg hover:bg-[#e64a19] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simple animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.25s ease-out; }
      `}</style>

      {/* Back Button */}
      <button
        onClick={() => window.history.back()}
        className="fixed bottom-8 right-8 bg-[#FF5722] text-white px-5 py-3 rounded-lg shadow-lg hover:bg-[#e64a19] transition-all z-50"
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}
