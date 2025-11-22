import { collection, getDocs, orderBy, query, Timestamp, where } from "firebase/firestore";
import { ArrowLeft, Clock, MapPin, User as UserIcon, Wrench } from "lucide-react"; // Added icons for the modal
import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";

interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  [key: string]: any;
}

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
    breakdownRequest?: {
        address?: string;
        reason?: string;
    };
    [key: string]: any;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [filtered, setFiltered] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // 🧩 STATE ADDED: State for managing the Reports Modal
    const [userReportModal, setUserReportModal] = useState<{
        open: boolean;
        loading: boolean;
        reports: Report[];
    }>({ open: false, loading: false, reports: [] });

    // Fetch all users from Firestore
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const snapshot = await getDocs(collection(db, "users"));
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as User[];
                // Add first and last name to the 'name' field for display consistency
                const usersWithNames = data.map(u => ({
                    ...u,
                    name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.name || "Unnamed User"
                }));

                setUsers(usersWithNames);
                setFiltered(usersWithNames);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        const lower = search.toLowerCase();
        setFiltered(
            users.filter((u) =>
                u.name.toLowerCase().includes(lower)
            )
        );
    }, [search, users]);

    const fetchUserReports = async (userId: string) => {
    setUserReportModal({ ...userReportModal, open: true, loading: true });

    try {
        const q = query(
      collection(db, "reports_history"),
      where("userId", "==", userId),
      orderBy("taggedAt", "desc")
    );

        const snapshot = await getDocs(q);

        const reportsData = snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
                id: docSnap.id,
                userId: d.reportedBy?.id,
                userName: d.reportedBy?.name || "Unknown",
                mechanicName: d.reportedTo?.name || "N/A",
                issue: d.reportReason || d.description || "N/A",
                createdAt: d.createdAt,
                status: d.status || "pending",
                breakdownRequest: d.breakdownRequest || null,
                ...d
            } as Report;
        });

        setUserReportModal((prev) => ({
            ...prev,
            reports: reportsData,
        }));
    } catch (error) {
        console.error("Error fetching user reports:", error);
        setUserReportModal((prev) => ({
            ...prev,
            reports: [],
        }));
    } finally {
        setUserReportModal((prev) => ({ ...prev, loading: false }));
    }
};

    const formatDate = (timestamp?: Timestamp) => {
        if (!timestamp) return "N/A";
        return new Date(timestamp.seconds * 1000).toLocaleString();
    };

    return (
        <div className="min-h-screen bg-white text-gray-800 p-10 font-inter">
            <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-[#FF5722]">Search Users</h1>
                    <p className="text-gray-500 mt-1">
                        Find and view user details in the database.
                    </p>
                </div>
            </header>

            <div className="max-w-3xl mx-auto">
                <input
                    type="text"
                    placeholder="Search user by name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-6 focus:ring-2 focus:ring-[#FF5722] focus:outline-none"
                />

                {loading ? (
                    <p className="text-center text-gray-400">Loading users...</p>
                ) : filtered.length > 0 ? (
                    <div className="space-y-3">
                        {filtered.map((user) => (
                            <div
                                key={user.id}
                                onClick={() => setSelectedUser(user)}
                                className="cursor-pointer p-4 border rounded-lg hover:border-[#FF5722] transition-all hover:shadow-md hover:scale-[1.01]"
                            >
                                <h2 className="text-lg font-semibold text-[#FF5722]">
                                    {user.name}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {user.email || "No email"}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-400 mt-10">No users found.</p>
                )}
            </div>
            {/* Back Button */}
            <button
                onClick={() => window.history.back()} // or navigate("/Dashboard") if using react-router
                className="fixed bottom-8 right-8 bg-[#FF5722] text-white px-5 py-3 rounded-lg shadow-lg hover:bg-[#e64a19] transition-all z-50"
            >
                ← Back to Dashboard
            </button>

            {selectedUser && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-[90%] max-w-md relative animate-slideUp overflow-y-auto max-h-[90vh]">
                        <button
                            onClick={() => setSelectedUser(null)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-[#FF5722]"
                        >
                            ✕
                        </button>

                        <div className="flex justify-center mb-4">
                            {selectedUser.profilePictureUrl && (
                                <img
                                    src={selectedUser.profilePictureUrl}
                                    alt="Profile"
                                    className="w-32 h-32 object-cover rounded-full border border-gray-300"
                                />
                            )}
                        </div>

                        <h2 className="text-2xl font-bold text-[#FF5722] mb-4">
                            {selectedUser.name}
                        </h2>

                        <div className="space-y-2 text-gray-700">
                            <p>
                                <span className="font-semibold">Email:</span> {selectedUser.email || "N/A"}
                            </p>
                            <p>
                                <span className="font-semibold">Phone:</span> {selectedUser.phone || "N/A"}
                            </p>
                            <p>
                                <span className="font-semibold">Address:</span> {selectedUser.address || "N/A"}
                            </p>

                            {/* Dynamically show extra fields */}
                            {/* ... (Existing dynamic fields display logic) ... */}
                        </div>

                        {/* 🧩 BUTTON ADDED HERE */}
                        <button
                            onClick={() => fetchUserReports(selectedUser.id)}
                            className="w-full mt-6 bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition font-semibold flex items-center justify-center gap-2"
                        >
                            <UserIcon size={18} /> View Reports Submitted by User
                        </button>
                        {/* END BUTTON ADDED */}

                        <div className="mt-6 text-right">
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="bg-[#FF5722] text-white px-4 py-2 rounded-lg hover:bg-[#e64a19] transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🧩 NEW REPORT MODAL COMPONENT */}
            {userReportModal.open && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-[95%] max-w-2xl relative overflow-y-auto max-h-[90vh] animate-slideUp">
                        <h2 className="text-2xl font-bold text-[#FF5722] mb-4 flex items-center gap-2">
                            <ArrowLeft
                                size={20}
                                className="cursor-pointer text-gray-500 hover:text-[#FF5722]"
                                onClick={() => setUserReportModal({ open: false, loading: false, reports: [] })}
                            />
                            Reports by {selectedUser?.name}
                        </h2>
                        
                        {userReportModal.loading ? (
                            <p className="text-center text-gray-500 py-10">Loading reports...</p>
                        ) : userReportModal.reports.length === 0 ? (
                            <p className="text-center text-gray-500 py-10">This user has not submitted any reports.</p>
                        ) : (
                            <div className="space-y-4">
                                {userReportModal.reports.map((report) => (
                                    <div 
                                        key={report.id} 
                                        className="p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-white transition"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                                <Wrench size={16} className="text-[#FF5722]" /> 
                                                Mechanic: {report.mechanicName}
                                            </p>
                                            <span 
                                                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                                    report.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                                }`}
                                            >
                                                {report.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 flex items-center gap-2">
                                            <Clock size={14} className="text-gray-400" />
                                            Reported: {formatDate(report.createdAt)}
                                        </p>
                                        <p className="text-sm text-gray-600 flex items-center gap-2">
                                            <MapPin size={14} className="text-gray-400" />
                                            Location: {report.breakdownRequest?.address || "N/A"}
                                        </p>
                                        <p className="text-sm mt-2 p-2 border-l-2 border-[#FF5722] bg-white rounded-r">
                                            <span className="font-medium">Issue:</span> {report.issue}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <div className="mt-6 text-right">
                            <button
                                onClick={() => setUserReportModal({ open: false, loading: false, reports: [] })}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
                            >
                                Close Reports
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
        </div>
    );
}