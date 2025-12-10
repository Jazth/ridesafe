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
import emailjs from "@emailjs/browser";

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
  const [selectedTab, setSelectedTab] = useState<"all" | "saved" | "completed">("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState<"userName" | "mechanicName">("userName");
  const [showActions, setShowActions] = useState(false);
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    action: "flag" | "disable" | "ban" | null;
    report: Report | null;
  }>({ open: false, action: null, report: null });
  const [disableDays, setDisableDays] = useState("7");
  const [loadingAction, setLoadingAction] = useState(false);

  const openActionModal = (report: Report, action: "flag" | "disable" | "ban") => {
    setActionModal({ open: true, action, report });
  };

  // ---------- New undo action handlers ----------
  const undoRemoveOneFlag = async (report: Report) => {
    if (!report?.mechanicId) {
      setFeedback({ type: "error", message: "Mechanic id missing." });
      return;
    }
    setLoadingAction(true);
    try {
      const mechanicRef = doc(db, "mechanics", report.mechanicId);
      const mechanicSnap = await getDoc(mechanicRef);
      if (!mechanicSnap.exists()) {
        setFeedback({ type: "error", message: "Mechanic not found." });
        setLoadingAction(false);
        return;
      }

      const currentFlags = mechanicSnap.data().flags || 0;
      const newFlags = Math.max(0, currentFlags - 1);
      await updateDoc(mechanicRef, { flags: newFlags });

      setFeedback({ type: "success", message: `Removed one flag. New flags: ${newFlags}.` });
    } catch (err) {
      console.error("Error removing flag:", err);
      setFeedback({ type: "error", message: "Failed to remove flag." });
    } finally {
      setLoadingAction(false);
    }
  };

  const undoResetAllFlags = async (report: Report) => {
    if (!report?.mechanicId) {
      setFeedback({ type: "error", message: "Mechanic id missing." });
      return;
    }
    setLoadingAction(true);
    try {
      const mechanicRef = doc(db, "mechanics", report.mechanicId);
      await updateDoc(mechanicRef, { flags: 0 });
      setFeedback({ type: "success", message: "Flags reset to 0." });
    } catch (err) {
      console.error("Error resetting flags:", err);
      setFeedback({ type: "error", message: "Failed to reset flags." });
    } finally {
      setLoadingAction(false);
    }
  };

  const undoUpliftDisable = async (report: Report) => {
    if (!report?.mechanicId) {
      setFeedback({ type: "error", message: "Mechanic id missing." });
      return;
    }
    setLoadingAction(true);
    try {
      const mechanicRef = doc(db, "mechanics", report.mechanicId);
      // set accountStatus to active and remove disabledUntil (set null)
      await updateDoc(mechanicRef, {
        accountStatus: "active",
        disabledUntil: null,
      });
      setFeedback({ type: "success", message: "Account re-activated (disable uplifted)." });
    } catch (err) {
      console.error("Error uplifting disable:", err);
      setFeedback({ type: "error", message: "Failed to uplift disable." });
    } finally {
      setLoadingAction(false);
    }
  };

  const undoUpliftBan = async (report: Report) => {
  setLoadingAction(true);

  try {
    // Unban mechanic (if exists)
    if (report?.mechanicId) {
      const mechanicRef = doc(db, "mechanics", report.mechanicId);
      await updateDoc(mechanicRef, {
        accountStatus: "active",
      });
    }

    // Unban user (if exists)
    if (report?.userId) {
      const userRef = doc(db, "users", report.userId);
      await updateDoc(userRef, {
        accountStatus: "active",
      });
    }

    setFeedback({ type: "success", message: "Account unbanned successfully for both user and mechanic." });

  } catch (err) {
    console.error("Error uplifting ban:", err);
    setFeedback({ type: "error", message: "Failed to uplift ban." });

  } finally {
    setLoadingAction(false);
  }
};

  // ---------- end undo handlers ----------

  const confirmAdminAction = async () => {
  const { action, report } = actionModal;
  if (!report || !action) return;

  setLoadingAction(true);

  try {
    // Create an array of targets: mechanic and user
    const targets = [
      { id: report.mechanicId, type: "mechanic" },
      { id: report.userId, type: "user" },
    ].filter((t): t is { id: string; type: "mechanic" | "user" } => !!t.id); // type guard

    for (const target of targets) {
      const collectionName = target.type === "mechanic" ? "mechanics" : "users";
      const targetRef = doc(db, collectionName, target.id);
      const targetSnap = await getDoc(targetRef);

      if (!targetSnap.exists()) {
        console.warn(`${target.type} not found with id: ${target.id}`);
        continue;
      }

      const currentFlags = targetSnap.data().flags || 0;
      let updateData: Record<string, any> = {};
      let actionText = "";

      if (action === "flag") {
        const newFlags = currentFlags + 1;
        updateData.flags = newFlags;
        actionText = "flagged";

        if (newFlags >= 6) {
          updateData.accountStatus = "banned";
          updateData.flags = 6; // cap flags
          actionText = "banned (auto)";
        }
      }

      if (action === "disable") {
        const days = Number(disableDays);
        const disabledUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        updateData.accountStatus = "disabled";
        updateData.disabledUntil = Timestamp.fromDate(disabledUntil);
        actionText = `disabled for ${days} day(s)`;
      }

      if (action === "ban") {
        updateData.accountStatus = "banned";
        actionText = "banned (manual)";
        updateData.flags = 6;
      }

      // --- Update account in Firestore ---
      await updateDoc(targetRef, updateData);

      // --- Send system notification (fail gracefully) ---
     // --- Send system notification (corrected path) ---
try {
  const notifCollection =
    target.type === "mechanic"
      ? "mechanic_system_notifications"
      : "users_system_notifications";
  await addDoc(collection(db, notifCollection), {
    receiverId: target.id,
    senderId: "admin",
    senderName: "Admin",
    type: "admin_action",
    message: `Your account has been ${actionText} by the admin after a report regarding "${report.issue || "an issue"}".`,
    createdAt: Timestamp.now(),
  });
} catch (notifErr) {
  console.warn("Failed to create system notification:", notifErr);
}
      try {
        const recipientEmail = report.reportedTo?.email?.trim() || report.reportedBy?.email?.trim() || null;
        if (!recipientEmail) {
          console.error("Skipped email: no recipient for report ID:", report.id);
        } else {
          await emailjs.send(
            "service_5by4oi4",
            "template_oe1ytoj",
            {
              to_email: recipientEmail,
              to_name: report.targetType === "mechanic" ? report.mechanicName : report.userName || "User",
              action_text: actionText,
              reported_by: report.userName || report.mechanicName || "N/A",
              issue: report.breakdownRequest?.reason || report.issue || "N/A",
              vehicle: report.vehicle || "N/A",
              reported_on: report.createdAt ? new Date(report.createdAt.seconds * 1000).toLocaleString() : "N/A",
            },
            { publicKey: "T50O3A7RAeC8wu9MB" }
          );
          console.log("EMAIL SENT via EmailJS:", recipientEmail);
        }
      } catch (emailErr) {
        console.error("EmailJS error:", emailErr);
      }
    }

    // Tag report as completed
    await tagReport(report, "completed");
    setFeedback({ type: "success", message: `Action "${action}" applied to all relevant accounts.` });
    setActionModal({ open: false, action: null, report: null });
    setShowActions(false);

  } catch (err) {
    console.error("Error performing admin action:", err);
    setFeedback({ type: "error", message: "Failed to perform the action. Try again." });
  } finally {
    setLoadingAction(false);
  }
};



  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Report[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data() as any;

        const rawStatus = d.breakdownRequest?.status || d.status || "saved";
        const mappedStatus = rawStatus.toLowerCase() === "done" ? "completed" : "saved";

        const report: Report = {
          id: docSnap.id,
          targetType: d.targetType || "mechanic",
          reportedBy: {
            id: d.reportedBy?.id || "",
            name: d.reportedBy?.name || "N/A",
            email: d.reportedBy?.email || null,
            photo: d.reportedBy?.photo || null,
          },
          reportedTo: {
            id: d.reportedTo?.id || "",
            name: d.reportedTo?.name || "N/A",
            email: d.reportedTo?.email || "",
          },
          userId: d.reportedTo?.id || "",
          userName: d.reportedTo?.name || "N/A",
          mechanicId: d.reportedBy?.id || "",
          mechanicName: d.reportedBy?.name || "N/A",
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

  const tagReport = async (report: Report, newStatus: "completed" | "saved") => {
    const reportRef = doc(db, "reports", report.id);
    const historyRef = doc(db, "reports_history", report.id);

    try {
      await updateDoc(reportRef, { status: newStatus });
      await setDoc(historyRef, { ...report, status: newStatus, taggedAt: Timestamp.now() });
      setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status: newStatus } : r)));
    } catch (error) {
      console.error("Error tagging report:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-10 font-inter">
      {/* Feedback */}
      {feedback && (
        <div className={`p-3 mb-4 rounded-lg text-white ${feedback.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
          {feedback.message}
          <button onClick={() => setFeedback(null)} className="ml-3 font-bold">✕</button>
        </div>
      )}

      {/* Header + Search */}
      <header className="mb-6 flex flex-col gap-4">
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
            className={`px-4 py-2 rounded-lg font-semibold ${selectedTab === tab ? "bg-[#FF5722] text-white" : "bg-white text-gray-700 border border-gray-300"}`}
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

              <h2 className="text-lg font-semibold text-[#FF5722]">{report.userName}</h2>
              <p>
                <span className="font-semibold">{report.targetType === "mechanic" ? "Mechanic" : "User"}:</span>{" "}
                {report.targetType === "mechanic" ? report.mechanicName || "N/A" : report.userName || "N/A"}
              </p>
              <p><span className="font-semibold">Vehicle:</span> {report.vehicle}</p>
              <p><span className="font-semibold">Issue/Reason(s):</span> {Array.isArray(report.reportReasons) ? report.reportReasons.join(", ") : report.issue}</p>
              <p><span className="font-semibold">Pickup Address:</span> {report.breakdownRequest?.address || "N/A"}</p>
              <p><span className="font-semibold">Original Breakdown Reason:</span> {report.breakdownRequest?.reason || "N/A"}</p>
              <p className="text-sm text-gray-500"><span className="font-semibold">Reported:</span> {formatDate(report.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Selected Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-[90%] max-w-md relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setSelectedReport(null)} className="absolute top-3 right-3 text-gray-400 hover:text-[#FF5722]">✕</button>

            <h2 className="text-2xl font-bold text-[#FF5722] mb-4">Breakdown Report Details</h2>
            <div className="space-y-2 text-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <img src={selectedReport.reportedBy?.photo || "https://placehold.co/50x50?text=User"} alt="User" className="w-12 h-12 rounded-full border border-gray-300 object-cover"/>
                <p className="text-lg font-semibold">{selectedReport.reportedBy?.name || selectedReport.userName || "N/A"}</p>
              </div>

              <p><span className="font-semibold">{selectedReport.targetType === "mechanic" ? "Mechanic" : "User"}:</span> {selectedReport.targetType === "mechanic" ? selectedReport.mechanicName || "N/A" : selectedReport.userName || "N/A"}</p>
              <p><span className="font-semibold">Vehicle:</span> {selectedReport.vehicle}</p>
              <p><span className="font-semibold">Reported At:</span> {formatDate(selectedReport.createdAt)}</p>
              <p><span className="font-semibold">Pickup Address:</span> {selectedReport.breakdownRequest?.address || "N/A"}</p>
              <p><span className="font-semibold">Original Breakdown Reason:</span> {selectedReport.breakdownRequest?.reason || "N/A"}</p>
              <p><span className="font-semibold">Reported Reason(s):</span> {Array.isArray(selectedReport.reportReasons) ? selectedReport.reportReasons.join(", ") : selectedReport.issue}</p>
            </div>

            {selectedReport.proofImageUrl && (
              <div className="mt-5">
                <h3 className="font-semibold text-lg mb-2 text-[#FF5722]">Proof Image</h3>
                <img src={selectedReport.proofImageUrl} alt="Proof" className="w-full rounded-lg border border-gray-300 object-cover"/>
              </div>
            )}

            {/* Admin Actions */}
            <div className="mt-6">
              <button onClick={() => setShowActions((prev) => !prev)} className="flex items-center justify-between w-full bg-[#FF5722] text-white px-4 py-2 rounded-lg hover:bg-[#e64a19] transition">
                Admin Actions
                <MoreVertical size={18}/>
              </button>

              {showActions && (
                <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                  <button onClick={() => openActionModal(selectedReport, "flag")} className="w-full text-left bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">🚩 Flag</button>
                  <button onClick={() => openActionModal(selectedReport, "ban")} className="w-full text-left bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition">🔒 Ban</button>
                  <button onClick={() => openActionModal(selectedReport, "disable")} className="w-full text-left bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition">⏸️ Disable</button>

                  {/* ----- Added undo actions ----- */}
                  <div className="mt-2 border-t pt-2 space-y-2">
                    <button onClick={() => undoRemoveOneFlag(selectedReport)} className="w-full text-left bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition">↩️ Undo Flag (remove 1)</button>
                    <button onClick={() => undoResetAllFlags(selectedReport)} className="w-full text-left bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition">🗑️ Reset Flags to 0</button>
                    <button onClick={() => undoUpliftDisable(selectedReport)} className="w-full text-left bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition">🔓 Uplift Disable</button>
                    <button onClick={() => undoUpliftBan(selectedReport)} className="w-full text-left bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">🔓 Uplift Ban (unban)</button>
                  </div>
                  {/* ----- end undo actions ----- */}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setSelectedReport(null)} className="bg-[#FF5722] text-white px-4 py-2 rounded-lg hover:bg-[#e64a19] transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-[90%] max-w-md relative">
            <button onClick={() => setActionModal({ open: false, action: null, report: null })} className="absolute top-3 right-3 text-gray-400 hover:text-[#FF5722]">✕</button>
            <h2 className="text-2xl font-bold text-[#FF5722] mb-4">Confirm {actionModal.action?.toUpperCase()}</h2>

            {actionModal.action === "disable" && (
              <div className="mb-4">
                <label className="block font-semibold mb-1">Disable for (days):</label>
                <input type="number" min={1} value={disableDays} onChange={(e) => setDisableDays(e.target.value)} className="w-full border px-3 py-2 rounded-lg"/>
              </div>
            )}

            <p>Are you sure you want to {actionModal.action} this mechanic?</p>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setActionModal({ open: false, action: null, report: null })} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100">Cancel</button>
              <button disabled={loadingAction} onClick={confirmAdminAction} className="px-4 py-2 rounded-lg bg-[#FF5722] text-white hover:bg-[#e64a19]">{loadingAction ? "Processing..." : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
