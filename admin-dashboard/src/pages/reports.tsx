import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc
} from "firebase/firestore";
import { MoreVertical } from "lucide-react"; // for menu icon
import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";

interface Report {
  id: string;
  userId?: string;
  userName?: string;
  mechanicId?: string;
  mechanicName?: string;
  vehicle?: string;
  issue?: string;
  createdAt?: Timestamp;
  status: "completed" | "saved";
  [key: string]: any;
}

export default function AdminReportsPage() {
  
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"all" | "saved" | "completed">(
    "all"
  );
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState<"userName" | "mechanicName">(
    "userName"
  );
  const [showActions, setShowActions] = useState(false);
// 🧩 Add these states near your other useState calls
const [actionModal, setActionModal] = useState<{
  open: boolean;
  action: "flag" | "disable" | "ban" | null;
  report: Report | null;
}>({
  open: false,
  action: null,
  report: null,
});

const [disableDays, setDisableDays] = useState("7");
const [loadingAction, setLoadingAction] = useState(false);

// 🧩 Open modal instead of alerts
const openActionModal = (report: Report, action: "flag" | "disable" | "ban") => {
  setActionModal({ open: true, action, report });
};

// 🧩 Confirm action (actual Firestore logic)
// 🧩 Confirm action (actual Firestore logic)
const confirmAdminAction = async () => {
    const { action, report } = actionModal;
    if (!report || !action) return;

    setLoadingAction(true);

    try {
        const mechanicRef = doc(db, "mechanics", report.mechanicId!);
        const mechanicSnap = await getDoc(mechanicRef);
        if (!mechanicSnap.exists()) {
            setFeedback({ type: "error", message: "Mechanic not found." });
            setLoadingAction(false);
            return;
        }

        const currentFlags = mechanicSnap.data().flags || 0;
        let updateData: Record<string, any> = {};
        let actionText = "";

        // --- 1. Determine Update Data based on Admin Action ---
        if (action === "flag") {
            const newFlags = currentFlags + 1;
            updateData.flags = newFlags;
            actionText = "flagged";

            // 🔥 LOGIC ADDED HERE: Check for automatic ban threshold (5 reports)
            if (newFlags >= 5) {
                updateData.accountStatus = "banned";
                actionText = "banned (auto)"; // Update action text for notification
                setFeedback({
                    type: "success",
                    message: `Mechanic flagged. Account automatically banned for reaching ${newFlags} reports.`,
                });
            } else {
                setFeedback({ type: "success", message: `Mechanic successfully flagged. Total reports: ${newFlags}.` });
            }
        }

        if (action === "disable") {
            const days = Number(disableDays);
            const disabledUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
            updateData.accountStatus = "disabled";
            updateData.disabledUntil = Timestamp.fromDate(disabledUntil);
            actionText = `disabled for ${days} day(s)`;
            setFeedback({ type: "success", message: `Mechanic successfully disabled for ${days} day(s).` });
        }

        if (action === "ban") {
            updateData.accountStatus = "banned";
            actionText = "banned (manual)";
            setFeedback({ type: "success", message: `Mechanic successfully banned.` });
                }
        if (updateData.accountStatus === "banned") {
            updateData.flags = 5; // 🔥 Always cap at 5 (ban threshold)
        }


        // --- 3. Perform the Firestore updates ---
        await updateDoc(mechanicRef, updateData);
        await tagReport(report, "completed");

        // --- 4. Send Notification ---
        await addDoc(collection(db, "mechanic_system_notifications"), {
            receiverId: report.mechanicId,
            senderId: "admin",
            senderName: "Admin",
            type: "admin_action",
            message: `Your account has been ${actionText} by the admin after a report from ${
                report.userName || "a user"
            } regarding "${report.issue || "an issue"}". 

    Breakdown Details:
    - Vehicle: ${report.vehicle || "N/A"}
    - Issue/Reason: ${report.breakdownRequest?.reason || report.issue || "N/A"}
    - Pickup Address: ${report.breakdownRequest?.address || "N/A"}
    - Reported On: ${report.createdAt ? new Date(report.createdAt.seconds * 1000).toLocaleString() : "N/A"}
    `,
            createdAt: Timestamp.now(),
        });

        setActionModal({ open: false, action: null, report: null });
        setShowActions(false);
        // The success message is now set within the action blocks
    } catch (err) {
        console.error("Error performing admin action:", err);
        setFeedback({ type: "error", message: "Failed to perform the action. Try again." }); // ✅ Show error
    } finally {
        setLoadingAction(false);
    }
};


  // ✅ Fetch reports in real-time
  useEffect(() => {
    
    setLoading(true);
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => {
  const d = docSnap.data() as any;
  const rawStatus = d.breakdownRequest?.status || d.status || "saved";
  const mappedStatus = rawStatus.toLowerCase() === "done" ? "completed" : "saved";

  const report: Report = {
    id: docSnap.id,

    // ✅ Correctly map reportedBy and reportedTo
    reportedBy: d.reportedBy || { 
      id: d.reportedBy?.id || d.breakdownRequest?.mechanicId || "",
      name: d.reportedBy?.name || d.breakdownRequest?.mechanicName || "N/A"
    }, // mechanic who submitted the report
    reportedTo: d.reportedTo || { 
      id: d.reportedTo?.id || d.breakdownRequest?.userId || "",
      name: d.reportedTo?.name || d.breakdownRequest?.userName || "N/A"
    }, // user being reported

    userId: d.reportedTo?.id || d.breakdownRequest?.userId || "",
    userName: d.reportedTo?.name || d.breakdownRequest?.userName || "N/A",
    mechanicId: d.reportedBy?.id || d.breakdownRequest?.mechanicId || "",
    mechanicName: d.reportedBy?.name || d.breakdownRequest?.mechanicName || "N/A",

    vehicle: d.vehicle
      ? `${d.vehicle.make} ${d.vehicle.model}`
      : d.breakdownRequest?.vehicle
      ? `${d.breakdownRequest.vehicle.make} ${d.breakdownRequest.vehicle.model}`
      : "N/A",

    issue: Array.isArray(d.reportReasons)
      ? d.reportReasons.join(", ")
      : d.reportReason || d.reason || d.breakdownRequest?.reason || "N/A",

    createdAt: d.createdAt || d.breakdownRequest?.createdAt,
    status: mappedStatus,
    ...d,
  };

  return report;
});


      setReports(data);
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ Filters
  useEffect(() => {
    let filtered = reports;

    if (selectedTab !== "all") {
      filtered = filtered.filter((r) => r.status === selectedTab);
    }

    if (searchTerm.trim() !== "") {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((r) => {
        const field = r[searchBy]?.toString().toLowerCase() || "";
        return field.includes(lowerTerm);
      });
    }

    setFilteredReports(filtered);
  }, [reports, selectedTab, searchTerm, searchBy]);

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.seconds * 1000).toLocaleString();
  };

  // ✅ Tag report automatically
  const tagReport = async (report: Report, newStatus: "completed" | "saved") => {
    const reportRef = doc(db, "reports", report.id);
    const historyRef = doc(db, "reports_history", report.id);

    try {
      await updateDoc(reportRef, { status: newStatus });
      await setDoc(historyRef, {
        ...report,
        status: newStatus,
        taggedAt: Timestamp.now(),
      });
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, status: newStatus } : r))
      );
    } catch (error) {
      console.error("Error tagging report:", error);
    }
    
  };

  // ✅ Admin action with dynamic notification
 
  return (
    <div className="min-h-screen bg-gray-100 p-10 font-inter">
      <header className="mb-6 flex flex-col gap-4">
        {feedback && (
  <div
    className={`p-3 mb-4 rounded-lg text-white ${
      feedback.type === "success" ? "bg-green-500" : "bg-red-500"
    }`}
  >
    {feedback.message}
    <button
      onClick={() => setFeedback(null)}
      className="ml-3 font-bold"
    >
      ✕
    </button>
  </div>
)}

        <h1 className="text-3xl font-bold text-[#FF5722]">Incident Reports</h1>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder={`Search by ${searchBy}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border rounded-lg flex-1"
          />
          <select
            value={searchBy}
            onChange={(e) => setSearchBy(e.target.value as any)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="userName">User Name</option>
            <option value="mechanicName">Mechanic Name</option>
          </select>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {["all", "saved", "completed"].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab as any)}
            className={`px-4 py-2 rounded-lg font-semibold ${
              selectedTab === tab
                ? "bg-[#FF5722] text-white"
                : "bg-white text-gray-700 border border-gray-300"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading reports...</p>
      ) : filteredReports.length === 0 ? (
        <p className="text-gray-500">No reports found.</p>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
  <div
    key={report.id}
    onClick={() => setSelectedReport(report)}
    className="relative cursor-pointer p-4 bg-white rounded-lg shadow hover:shadow-md transition"
  >
    {report.status === "completed" && (
      <span className="absolute top-2 right-3 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
        Completed
      </span>
    )}

    <h2 className="text-lg font-semibold text-[#FF5722]">
      {report.userName}
    </h2>
  <p>
  <span className="font-semibold">
    {report.targetType === "mechanic" ? "Mechanic" : "User"}:
  </span>{" "}
  {report.targetType === "mechanic"
    ? report.mechanicName || "N/A"
    : report.userName || "N/A"}
</p>


    <p>
      <span className="font-semibold">Vehicle:</span> {report.vehicle}
    </p>
    <p>
      <span className="font-semibold">Issue/Reason(s):</span>{" "}
      {Array.isArray(report.reportReasons)
        ? report.reportReasons.join(", ")
        : report.issue}
    </p>
    <p>
      <span className="font-semibold">Pickup Address:</span>{" "}
      {report.breakdownRequest?.address || "N/A"}
    </p>
    <p>
      <span className="font-semibold">Original Breakdown Reason:</span>{" "}
      {report.breakdownRequest?.reason || "N/A"}
    </p>
       <p className="text-sm text-gray-500">
      <span className="font-semibold">Reported:</span>{" "}
      {formatDate(report.createdAt)}
    </p>
  </div>
))}

{selectedReport && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-2xl shadow-xl w-[90%] max-w-md relative overflow-y-auto max-h-[90vh]">
      <button
        onClick={() => setSelectedReport(null)}
        className="absolute top-3 right-3 text-gray-400 hover:text-[#FF5722]"
      >
        ✕
      </button>

      <h2 className="text-2xl font-bold text-[#FF5722] mb-4">
        Breakdown Report Details
      </h2>

      <div className="space-y-2 text-gray-700">
        <div className="flex items-center gap-3 mb-2">
          <img
            src={
              selectedReport.reportedBy?.photo ||
              "https://placehold.co/50x50?text=User"
            }
            alt="User"
            className="w-12 h-12 rounded-full border border-gray-300 object-cover"
          />
          <p className="text-lg font-semibold">
            {selectedReport.reportedBy?.name ||
              selectedReport.userName ||
              "N/A"}
          </p>
        </div>

        <p>
  <span className="font-semibold">
    {selectedReport?.targetType === "mechanic" ? "Mechanic" : "User"}:
  </span>{" "}
  {selectedReport?.targetType === "mechanic"
    ? selectedReport?.mechanicName || "N/A"
    : selectedReport?.userName || "N/A"}
</p>

        <p>
          <span className="font-semibold">Vehicle:</span>{" "}
          {selectedReport.vehicle}
        </p>
        <p>
          <span className="font-semibold">Reported At:</span>{" "}
          {formatDate(selectedReport.createdAt)}
        </p>
        <p>
          <span className="font-semibold">Pickup Address:</span>{" "}
          {selectedReport.breakdownRequest?.address || "N/A"}
        </p>
        <p>
          <span className="font-semibold">Original Breakdown Reason:</span>{" "}
          {selectedReport.breakdownRequest?.reason || "N/A"}
        </p>
        <p>
          <span className="font-semibold">Reported Reason(s):</span>{" "}
          {Array.isArray(selectedReport.reportReasons)
            ? selectedReport.reportReasons.join(", ")
            : selectedReport.issue}
        </p>
      </div>

      {selectedReport.proofImageUrl && (
        <div className="mt-5">
          <h3 className="font-semibold text-lg mb-2 text-[#FF5722]">
            Proof Image
          </h3>
          <img
            src={selectedReport.proofImageUrl}
            alt="Proof"
            className="w-full rounded-lg border border-gray-300 object-cover"
          />
        </div>
      )}

      {/* Admin Actions Button & Modal */}
      {/* ...rest of your admin action logic */}
    </div>
  </div>
)}

        </div>
      )}

      {selectedReport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-[90%] max-w-md relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-[#FF5722]"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold text-[#FF5722] mb-4">
              Breakdown Report Details
            </h2>

            <div className="space-y-2 text-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <img
                  src={
                    selectedReport.reportedBy?.photo ||
                    "https://placehold.co/50x50?text=User"
                  }
                  alt="User"
                  className="w-12 h-12 rounded-full border border-gray-300 object-cover"
                />
                <p className="text-lg font-semibold">
                  {selectedReport.reportedBy?.name ||
                    selectedReport.userName ||
                    "N/A"}
                </p>
              </div>

             <p>
  <span className="font-semibold">Reported {selectedReport?.targetType === "mechanic" ? "Mechanic" : "User"}:</span>{" "}
  {selectedReport?.targetType === "mechanic"
    ? selectedReport.mechanicName || "N/A"
    : selectedReport.userName || "N/A"}
</p>
              <p>
                <span className="font-semibold">Issue:</span>{" "}
                {selectedReport.issue}
              </p>
              <p>
                <span className="font-semibold">Vehicle:</span>{" "}
                {selectedReport.vehicle}
              </p>
              <p>
                <span className="font-semibold">Reported At:</span>{" "}
                {formatDate(selectedReport.createdAt)}
              </p>
            </div>

            {selectedReport.proofImageUrl && (
              <div className="mt-5">
                <h3 className="font-semibold text-lg mb-2 text-[#FF5722]">
                  Proof Image
                </h3>
                <img
                  src={selectedReport.proofImageUrl}
                  alt="Proof"
                  className="w-full rounded-lg border border-gray-300 object-cover"
                />
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={() => setShowActions((prev) => !prev)}
                className="flex items-center justify-between w-full bg-[#FF5722] text-white px-4 py-2 rounded-lg hover:bg-[#e64a19] transition"
              >
                Admin Actions
                <MoreVertical size={18} />
              </button>

              {showActions && (
                <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                  <button
                    onClick={() => openActionModal(selectedReport, "flag")}
                    className="w-full text-left bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                  >
                    🚩 Flag
                  </button>
                  <button
                    onClick={() => openActionModal(selectedReport, "ban")}
                    className="w-full text-left bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                  >
                    🔒 Ban
                  </button>
                  <button
                    onClick={() => openActionModal(selectedReport, "disable")}
                    className="w-full text-left bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
                  >
                    ⏸️ Disable
                  </button>
                </div>

              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedReport(null)}
                className="bg-[#FF5722] text-white px-4 py-2 rounded-lg hover:bg-[#e64a19] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {actionModal.open && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
    <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-sm p-6 text-center">
      <h3 className="text-2xl font-bold text-[#FF5722] mb-4">
  {actionModal.action === "flag"
    ? `🚩 Flag ${actionModal.report?.targetType === "mechanic" ? "Mechanic" : "User"}`
    : actionModal.action === "ban"
    ? `🚫 Ban ${actionModal.report?.targetType === "mechanic" ? "Mechanic" : "User"}`
    : `⏸️ Disable ${actionModal.report?.targetType === "mechanic" ? "Mechanic" : "User"}`}
</h3>

      <p className="text-gray-700 mb-5">
  Are you sure you want to{" "}
  <span className="font-semibold text-[#FF5722]">
    {actionModal.action}
  </span>{" "}
  {actionModal.report?.targetType === "mechanic" ? "mechanic" : "user"}{" "}
  <span className="font-semibold">
    {actionModal.report?.targetType === "mechanic"
      ? actionModal.report?.mechanicName || "N/A"
      : actionModal.report?.userName || "N/A"}
  </span>
  ?
</p>

      {actionModal.action === "disable" && (
        <div className="mb-5">
          <label className="block text-gray-600 text-sm font-medium mb-1">
            Duration (in days)
          </label>
          <input
            type="number"
            value={disableDays}
            onChange={(e) => setDisableDays(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            min={1}
          />
        </div>
      )}

      <div className="flex justify-center gap-3">
        <button
          onClick={() =>
            setActionModal({ open: false, action: null, report: null })
          }
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
        >
          Cancel
        </button>
        <button
          onClick={confirmAdminAction}
          disabled={loadingAction}
          className="bg-[#FF5722] text-white px-4 py-2 rounded-lg hover:bg-[#e64a19] transition disabled:opacity-50"
        >
          {loadingAction ? "Processing..." : "Confirm"}
        </button>
      </div>
    </div>
 

  </div>
)}
  {/* Back Button */}
<button
  onClick={() => window.history.back()} // or navigate("/Dashboard") if using react-router
  className="fixed bottom-8 right-8 bg-[#FF5722] text-white px-5 py-3 rounded-lg shadow-lg hover:bg-[#e64a19] transition-all z-50"
>
  ← Back to Dashboard
</button>
    </div>
  );
}
