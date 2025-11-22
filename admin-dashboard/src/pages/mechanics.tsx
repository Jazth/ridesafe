// src/pages/mechanics.tsx
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";

interface Mechanic {
  profilePictureUrl?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  businessName?: string;
  serviceArea?: string;
  licenseNumber?: string;
  [key: string]: any;
}

interface BreakdownRequest {
  address?: string;
  reason?: string;
  timestamp?: any;
  completedAt?: any;
  mechanicFeedback?: {
    notes?: string;
    photos?: string[];
    submittedAt?: any;
    [key: string]: any;
  };
  service_notes?: any;
  status?: string;
  [key: string]: any;
}

const getStatusColor = (status: string | undefined) => {
  switch (status) {
    case "done":
      return "text-green-600";
    case "cancelled":
      return "text-red-600";
    case "claimed":
      return "text-purple-600";
    default:
      return "text-gray-500";
  }
};

/** small util: detect if a string looks like an image url */
const looksLikeImageUrl = (s: string) =>
  typeof s === "string" &&
  (s.startsWith("http://") || s.startsWith("https://")) &&
  /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i.test(s);

const looksLikeTimestamp = (obj: any) =>
  obj &&
  typeof obj === "object" &&
  typeof obj.seconds === "number" &&
  typeof obj.nanoseconds === "number";

const convertTimestamp = (obj: any) =>
  new Date(obj.seconds * 1000 + obj.nanoseconds / 1e6);

function RenderValue({
  value,
  onPreview,
  indent = 0,
  keyName,
}: {
  value: any;
  onPreview: (url: string) => void;
  indent?: number;
  keyName?: string;
}) {
  const hiddenKeys = ["id", "currentLocation", "reminders", "location", "vehicleId"];
  if (keyName && hiddenKeys.includes(keyName)) return null;
  if (keyName === "status" && value === "pending") return null;

  if (looksLikeTimestamp(value)) {
    const d = convertTimestamp(value);
    return (
      <div className="text-sm text-gray-700">
        <span className="font-semibold capitalize">{keyName}:</span>{" "}
        <span className="ml-1">{d.toLocaleString()}</span>
      </div>
    );
  }

  if (typeof value === "string" && looksLikeImageUrl(value)) {
    return (
      <div className="mt-2">
        {keyName && <div className="font-semibold text-sm text-gray-700">{keyName}:</div>}
        <img
          src={value}
          alt={keyName || "image"}
          onClick={() => onPreview(value)}
          className="w-32 h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 mt-1"
        />
      </div>
    );
  }

  if (Array.isArray(value)) {
    const allImages = value.every((v) => typeof v === "string" && looksLikeImageUrl(v));
    if (allImages) {
      return (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((url: string, i) => (
            <img
              key={i}
              src={url}
              alt={`${keyName ?? "image"} ${i + 1}`}
              onClick={() => onPreview(url)}
              className="w-24 h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90"
            />
          ))}
        </div>
      );
    }
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return (
      <div className="mt-1">
        {keyName && <div className="font-semibold text-sm text-gray-700">{keyName}:</div>}
        <div className="pl-3 border-l border-gray-100">
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="mb-1">
              <RenderValue value={v} onPreview={onPreview} indent={indent + 1} keyName={k} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (keyName) {
    return (
      <div className="text-sm text-gray-700">
        <span className="font-semibold capitalize">{keyName}:</span>{" "}
        <span className="ml-1">{String(value)}</span>
      </div>
    );
  }

  return <div className="text-sm text-gray-700">{String(value)}</div>;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-5 h-5 ${star <= rating ? "text-yellow-400" : "text-gray-300"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.96a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.959c.3.922-.755 1.688-1.539 1.118l-3.38-2.455a1 1 0 00-1.176 0l-3.38 2.455c-.784.57-1.838-.196-1.539-1.118l1.287-3.959a1 1 0 00-.364-1.118L2.044 9.387c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.96z" />
        </svg>
      ))}
    </div>
  );
}

function FeedbackItem({ feedback }: { feedback: any }) {
  const [showMore, setShowMore] = useState(false);
  const comment = feedback.comment || "";

  return (
    <div className="p-3 border rounded-lg bg-gray-50">
      {feedback.user && (
        <p className="text-xs text-gray-500 mb-1">
          <span className="font-semibold">By:</span> {feedback.user.name}
        </p>
      )}
      <StarRating rating={feedback.rating} />
      {comment && (
        <p className="mt-2 text-sm text-gray-700">
          {showMore || comment.length <= 100 ? comment : comment.slice(0, 100) + "..."}
          {comment.length > 100 && (
            <button
              onClick={() => setShowMore(!showMore)}
              className="text-blue-500 ml-1 text-xs font-semibold"
            >
              {showMore ? "Show less" : "Show more"}
            </button>
          )}
        </p>
      )}
      <p className="text-xs text-gray-400 mt-1">
        {feedback.createdAt?.toDate
          ? feedback.createdAt.toDate().toLocaleString()
          : new Date(feedback.createdAt.seconds * 1000).toLocaleString()}
      </p>
    </div>
  );
}

function MechanicRepairHistory({
  mechanicId,
  onSelectRequest,
}: {
  mechanicId: string;
  onSelectRequest: (req: BreakdownRequest) => void;
}) {
  const [history, setHistory] = useState<BreakdownRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!mechanicId) return;
      setLoadingHistory(true);
      try {
        const q = query(collection(db, "breakdown_requests"), where("claimedBy.id", "==", mechanicId));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as BreakdownRequest[];

        const sorted = data.sort(
          (a, b) =>
            (b.timestamp?.toDate?.() ?? new Date(b.timestamp)).getTime() - (a.timestamp?.toDate?.() ?? new Date(a.timestamp)).getTime()
        );

        setHistory(sorted);
      } catch (err) {
        console.error("Error fetching mechanic history:", err);
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [mechanicId]);

  if (loadingHistory) {
    return <p className="text-center text-gray-400 mt-4">Loading repair history...</p>;
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h3 className="text-lg font-bold mb-3 text-[#FF5722]">Repair History ({history.length})</h3>
      <div className="max-h-60 overflow-y-auto space-y-2">
        {history.length === 0 && <p className="text-center text-gray-400">No repair history found.</p>}
        {history.map((req) => (
          <div
            key={req.id}
            className="p-3 border rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
            onClick={() => onSelectRequest(req)}
          >
            <p className="text-sm font-semibold">{req.address || "No address"}</p>
            <p className="text-xs text-gray-600 truncate">Reason: {req.reason || "N/A"}</p>
            <div className="flex justify-between items-center text-xs mt-1">
              <p className="text-gray-400">
                {(req.timestamp?.toDate ? req.timestamp.toDate() : new Date(req.timestamp)).toLocaleString()}
              </p>
              <span className={`font-bold uppercase text-xs ${getStatusColor(req.status)}`}>{req.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default function MechanicsPage() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [filtered, setFiltered] = useState<Mechanic[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<BreakdownRequest | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [mechanicFeedback, setMechanicFeedback] = useState<any[]>([]);

const fetchServiceNotes = async (requestId: string) => {
  const q = query(collection(db, "service_notes"), where("requestId", "==", requestId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

const averageRating = mechanicFeedback.length
  ? mechanicFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / mechanicFeedback.length
  : 0;

  const [loading, setLoading] = useState(true);
  const [openFlagsId, setOpenFlagsId] = useState<string | null>(null);
  const [flagsByMechanic, setFlagsByMechanic] = useState<Record<string, any[]>>({});
  const [showHistory, setShowHistory] = useState(false);
  useEffect(() => {
    const fetchMechanics = async () => {
      try {
        const snapshot = await getDocs(collection(db, "mechanics"));
        const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Mechanic[];
        setMechanics(data);
        setFiltered(data);

        const notifSnapshot = await getDocs(collection(db, "mechanic_system_notifications"));
        const allFlags = notifSnapshot.docs.map((d) => d.data());
        const grouped: Record<string, any[]> = {};
        data.forEach((m) => {
          grouped[m.id] = allFlags.filter((f: any) => f.receiverId === m.id && f.type === "admin_action");
        });
        setFlagsByMechanic(grouped);
      } catch (err) {
        console.error("Error fetching mechanics or flags:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMechanics();
  }, []);

  useEffect(() => {
    const lower = search.toLowerCase();
    setFiltered(mechanics.filter((m) => `${m.firstName ?? ""} ${m.lastName ?? ""}`.toLowerCase().includes(lower)));
  }, [search, mechanics]);

  useEffect(() => {
    if (!selectedMechanic) return;

    const fetchFeedback = async () => {
      try {
        const q = query(
          collection(db, "mechanic_feedback"),
          where("mechanic.id", "==", selectedMechanic.id)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setMechanicFeedback(data);
      } catch (err) {
        console.error("Error fetching mechanic feedback:", err);
        setMechanicFeedback([]);
      }
    };
    fetchFeedback();
  }, [selectedMechanic]);

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
              <div key={mechanic.id} className="relative border rounded-lg p-4 hover:border-[#FF5722] transition-all hover:shadow-md hover:scale-[1.01]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenFlagsId(openFlagsId === mechanic.id ? null : mechanic.id);
                  }}
                  className="absolute top-2 right-2 bg-[#FF5722] text-white px-2 py-1 rounded-full text-sm"
                  title="View Flags"
                >
                  ⚑ {flagsByMechanic[mechanic.id]?.length || 0}
                </button>

                <div
                  onClick={() => {
                    setSelectedMechanic(mechanic);
                    setShowHistory(false);
                  }}
                  className="cursor-pointer"
                >
                  <h2 className="text-lg font-semibold text-[#FF5722]">{mechanic.firstName} {mechanic.lastName}</h2>
                  <p className="text-sm text-gray-500">{mechanic.email}</p>
                </div>

                {openFlagsId === mechanic.id && flagsByMechanic[mechanic.id]?.length > 0 && (
                  <div className="mt-3 border-t border-gray-200 pt-3 space-y-2 max-h-48 overflow-y-auto">
                    {flagsByMechanic[mechanic.id].map((flag, idx) => (
                      <div key={idx} className="p-3 border rounded-lg bg-gray-50">
                        <p><span className="font-semibold">Action:</span> {flag.message?.split("\n")[0] || "N/A"}</p>
                        <p><span className="font-semibold">Vehicle:</span> {flag.message?.match(/Vehicle: (.*)/)?.[1] || "N/A"}</p>
                        <p><span className="font-semibold">Issue/Reason:</span> {flag.message?.match(/Issue\/Reason: (.*)/)?.[1] || "N/A"}</p>
                        <p><span className="font-semibold">Pickup Address:</span> {flag.message?.match(/Pickup Address: (.*)/)?.[1] || "N/A"}</p>
                        <p><span className="font-semibold">Reported On:</span> {flag.createdAt ? new Date(flag.createdAt.seconds * 1000).toLocaleString() : "N/A"}</p>
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

      {/* Mechanic modal */}
      {selectedMechanic && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[92%] max-w-2xl relative animate-slideUp overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => {
                setSelectedMechanic(null);
                setSelectedRequest(null);
                setPreviewImage(null);
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-[#FF5722]"
            >
              ✕
            </button>
              {selectedMechanic && selectedMechanic.profilePictureUrl && ( <div className="flex justify-center mb-4"> <img src={selectedMechanic.profilePictureUrl} alt="Profile Preview" onClick={() => setPreviewImage(selectedMechanic.profilePictureUrl!)} className="w-32 h-32 object-cover rounded-full border cursor-pointer hover:opacity-90" /> </div> )}
            <div className="flex justify-center mb-4 space-x-2">
              <button onClick={() => setShowHistory(false)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${!showHistory ? "bg-[#FF5722] text-white" : "bg-gray-200 text-gray-700"}`}>
                Details
              </button>
              <button onClick={() => setShowHistory(true)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${showHistory ? "bg-[#FF5722] text-white" : "bg-gray-200 text-gray-700"}`}>
                Repair History
              </button>
            </div>

            <h2 className="text-2xl font-bold text-[#FF5722] mb-4 text-center">{selectedMechanic.firstName} {selectedMechanic.lastName}</h2>
              {/* Average Rating */}
<div className="flex justify-center mb-4">
  <StarRating rating={Math.round(averageRating)} />
  <span className="ml-2 text-sm text-gray-600">
    {averageRating.toFixed(1)} / 5
  </span>
</div>

            {!showHistory ? (
              <>
                <div className="flex flex-col items-center mb-4">
                  {selectedMechanic.profilePictureUrl && (
                    <img src={selectedMechanic.profilePictureUrl} alt="Profile" className="w-32 h-32 object-cover rounded-full border mb-3" />
                  )}
                </div>

                <h3 className="text-xl font-bold mb-3 text-gray-800 border-b pb-2">Mechanic Details</h3>
                <div className="space-y-2 text-gray-700">
                  {Object.entries(selectedMechanic).map(([key, value]) => {
                    if (key === "password") return null;
                    return (
                      <div key={key} className="mb-1">
                        <RenderValue value={value} onPreview={(url) => setPreviewImage(url)} keyName={key} />
                      </div>
                    );
                  })}
                </div>

                {mechanicFeedback.length > 0 && (
                  <>
                    <h3 className="text-xl font-bold mt-6 mb-2 text-gray-800 border-b pb-2">Feedback</h3>
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {mechanicFeedback.map((f) => (
                        <FeedbackItem key={f.id} feedback={f} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
               <MechanicRepairHistory
    mechanicId={selectedMechanic.id}
    onSelectRequest={async (r) => {
      const notes = await fetchServiceNotes(r.id!);
      setSelectedRequest({ ...r, service_notes: notes.length > 0 ? notes[0] : null });
    }}
  />
            )}

            {selectedRequest && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 animate-fadeIn">
    <div className="bg-white rounded-2xl shadow-xl p-6 w-[92%] max-w-2xl relative animate-slideUp overflow-y-auto max-h-[90vh]">
      <button
        onClick={() => setSelectedRequest(null)}
        className="absolute top-3 right-3 text-gray-400 hover:text-[#FF5722]"
      >
        ✕
      </button>

      <h3 className="text-xl font-bold mb-3 text-[#FF5722]">Breakdown Details</h3>

      {/* Breakdown Details */}
      <div className="space-y-3 text-gray-700">
        {Object.entries(selectedRequest)
          .filter(([k]) => k !== "id" && k !== "mechanicFeedback" && k !== "service_notes")
          .map(([k, v]) => {
            if (k === "timestamp" || k === "completedAt") {
              const date = v?.toDate ? v.toDate() : new Date(v);
              return (
                <div key={k} className="text-sm text-gray-700">
                  <span className="font-semibold capitalize">{k.replace(/([A-Z])/g, " $1")}:</span>{" "}
                  <span className="ml-1">{date.toLocaleString()}</span>
                </div>
              );
            }
            return <RenderValue key={k} value={v} onPreview={(url) => setPreviewImage(url)} keyName={k} />;
          })}
      </div>

      {/* Separator for Service Notes */}
      {(selectedRequest.mechanicFeedback || selectedRequest.service_notes) && <hr className="my-4 border-gray-300" />}

      {/* Mechanic Feedback / Service Notes */}
      {selectedRequest.mechanicFeedback && (
        <div className="mb-4">
          <h4 className="text-lg font-semibold mb-2 text-gray-800">Mechanic Feedback</h4>
          <div className="space-y-3 text-gray-700">
            {selectedRequest.mechanicFeedback.notes && (
              <p className="text-sm">{selectedRequest.mechanicFeedback.notes}</p>
            )}

            {selectedRequest.mechanicFeedback.photos &&
              selectedRequest.mechanicFeedback.photos.map((url: string, i: number) => (
                <img
                  key={i}
                  src={url}
                  alt={`photo ${i + 1}`}
                  onClick={() => setPreviewImage(url)}
                  className="w-32 h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90"
                />
              ))}
          </div>
        </div>
      )}

      {selectedRequest.service_notes && (
        <div>
          <h4 className="text-lg font-semibold mb-2 text-gray-800">Service Notes</h4>
          <div className="space-y-3 text-gray-700">
            {Object.entries(selectedRequest.service_notes).map(([k, v]) => (
              <RenderValue key={k} value={v} onPreview={(url) => setPreviewImage(url)} keyName={k} />
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
)}


            {previewImage && (
              <div
                className="fixed inset-0 bg-black/70 flex items-center justify-center z-70"
                onClick={() => setPreviewImage(null)}
              >
                <img src={previewImage} alt="preview" className="max-w-[90%] max-h-[90%] rounded-xl shadow-2xl" />
              </div>
            )}

            <div className="mt-6 text-right">
              <button onClick={() => { setSelectedMechanic(null); setSelectedRequest(null); setPreviewImage(null); }} className="bg-[#FF5722] text-white px-4 py-2 rounded-lg hover:bg-[#e64a19]">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .animate-fadeIn { animation: fadeIn 0.18s ease-out; }
        .animate-slideUp { animation: slideUp 0.22s ease-out; }
      `}</style>

      <button onClick={() => window.history.back()} className="fixed bottom-8 right-8 bg-[#FF5722] text-white px-5 py-3 rounded-lg shadow-lg hover:bg-[#e64a19] transition-all z-50">
        ← Back to Dashboard
      </button>
    </div>
  );
}
