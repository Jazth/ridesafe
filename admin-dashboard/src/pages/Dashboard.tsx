import { collection, getDocs } from "firebase/firestore";
import { Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "../firebaseConfig";

// --- Helper: format Firestore timestamps & fallback values ---
function formatDate(value: any) {
  if (!value) return "-";
  // Firestore timestamp
  if (value.seconds) return new Date(value.seconds * 1000).toLocaleString();
  // JS Date
  if (value.toDate) return value.toDate().toLocaleString();
  try {
    return new Date(value).toLocaleString();
  } catch (e) {
    return String(value);
  }
}

function groupData(docs: any[], timeframe: "day" | "month" | "year") {
  const grouped: Record<string, { count: number; date: Date }> = {};

  docs.forEach((doc) => {
    const timestamp = doc.timestamp || doc.createdAt || doc.date || null;
    if (!timestamp) return;

    const dateObj = new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);

    let key: string;
    let sortDate: Date;

    if (timeframe === "year") {
      key = dateObj.toLocaleDateString("en-US", { year: "numeric" });
      sortDate = new Date(dateObj.getFullYear(), 0, 1);
      dateObj.setTime(sortDate.getTime());
    } else if (timeframe === "month") {
      key = dateObj.toLocaleDateString("en-US", { year: "numeric", month: "short" });
      sortDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
      dateObj.setTime(sortDate.getTime());
    } else {
      key = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    if (!grouped[key]) grouped[key] = { count: 0, date: dateObj };
    grouped[key].count += 1;
  });

  return Object.entries(grouped)
    .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
    .map(([day, { count }]) => ({ day, count }));
}

export default function Dashboard() {
  const [usersData, setUsersData] = useState<any[]>([]);
  const [mechanicsData, setMechanicsData] = useState<any[]>([]);
  const [requestsData, setRequestsData] = useState<any[]>([]);
  const [reportsData, setReportsData] = useState<any[]>([]);
  const [postsData, setPostsData] = useState<any[]>([]);

  const [rawUsersData, setRawUsersData] = useState<any[]>([]);
  const [rawMechanicsData, setRawMechanicsData] = useState<any[]>([]);
  const [rawRequestsData, setRawRequestsData] = useState<any[]>([]);
  const [rawReportsData, setRawReportsData] = useState<any[]>([]);
  const [rawPostsData, setRawPostsData] = useState<any[]>([]);

  const [timeframe, setTimeframe] = useState<"day" | "month" | "year">("day");

  const [totals, setTotals] = useState({ users: 0, mechanics: 0, requests: 0, reports: 0, posts: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [activeDataset, setActiveDataset] = useState<
    "users" | "mechanics" | "requests" | "reports" | "posts" | null
  >(null);

  // load data once
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersSnap, mechanicsSnap, breakdownSnap, reportsSnap, postsSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "mechanics")),
          getDocs(collection(db, "breakdown_requests")),
          getDocs(collection(db, "reports")),
          getDocs(collection(db, "posts")),
        ]);

        setTotals({
          users: usersSnap.size,
          mechanics: mechanicsSnap.size,
          requests: breakdownSnap.size,
          reports: reportsSnap.size,
          posts: postsSnap.size,
        });

        const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const mechanics = mechanicsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const requests = breakdownSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const reports = reportsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const posts = postsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        setRawUsersData(users);
        setRawMechanicsData(mechanics);
        setRawRequestsData(requests);
        setRawReportsData(reports);
        setRawPostsData(posts);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, []);

  // recalc groups on timeframe
  useEffect(() => {
    setUsersData(groupData(rawUsersData, timeframe));
    setMechanicsData(groupData(rawMechanicsData, timeframe));
    setRequestsData(groupData(rawRequestsData, timeframe));
    setReportsData(groupData(rawReportsData, timeframe));
    setPostsData(groupData(rawPostsData, timeframe));
  }, [rawUsersData, rawMechanicsData, rawRequestsData, rawReportsData, rawPostsData, timeframe]);

  const openModalFor = (dataset: typeof activeDataset) => {
    setActiveDataset(dataset);
    setModalOpen(true);
  };

  // columns as confirmed by you
  const columns = useMemo(() => {
    return {
      users: [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "createdAt", label: "Created At", format: formatDate },
        { key: "profilePictureUrl", label: "Profile Picture" },
        { key: "isVerified", label: "Verified" },
      ],
      mechanics: [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "businessName", label: "Business" },
        { key: "verified", label: "Verified" },
        { key: "createdAt", label: "Created At", format: formatDate },
        { key: "profilePictureUrl", label: "Profile Picture" },
      ],
      requests: [
        { key: "id", label: "ID" },
        { key: "userName", label: "User Name" },
        { key: "userPhone", label: "User Phone" },
        { key: "mechanicName", label: "Mechanic Name" },
        { key: "mechanicPhone", label: "Mechanic Phone" },
        { key: "status", label: "Status" },
        { key: "address", label: "Address" },
        { key: "location", label: "Location" },
        { key: "vehicleId", label: "Vehicle ID" },
        { key: "createdAt", label: "Created At", format: formatDate },
        { key: "completedAt", label: "Completed At", format: formatDate },
        { key: "issueDescription", label: "Issue" },
      ],
      reports: [
        { key: "id", label: "ID" },
        { key: "reportType", label: "Type" },
        { key: "description", label: "Description" },
        { key: "reporterName", label: "Reporter Name" },
        { key: "reporterId", label: "Reporter ID" },
        { key: "reportAgainstName", label: "Against Name" },
        { key: "reportAgainstId", label: "Against ID" },
        { key: "createdAt", label: "Created At", format: formatDate },
        { key: "status", label: "Status" },
        { key: "evidenceImages", label: "Evidence Count" },
      ],
      posts: [
        { key: "id", label: "ID" },
        { key: "userName", label: "User Name" },
        { key: "content", label: "Content" },
        { key: "images", label: "Images" },
        { key: "createdAt", label: "Created At", format: formatDate },
        { key: "likesCount", label: "Likes" },
        { key: "commentsCount", label: "Comments" },
      ],
    } as const;
  }, []);

  // map dataset name -> raw array
  const datasetMap: Record<string, any[]> = {
    users: rawUsersData,
    mechanics: rawMechanicsData,
    requests: rawRequestsData,
    reports: rawReportsData,
    posts: rawPostsData,
  };

  // helper to normalize row for display based on confirmed keys
  function normalizeRow(datasetKey: string, row: any) {
    if (datasetKey === "users") {
      return {
        id: row.id,
        name: row.fullName || row.name || `${row.firstName || ""} ${row.lastName || ""}`.trim(),
        email: row.email || "-",
        phone: row.phoneNumber || row.phone || row.phoneNum || "-",
        role: row.role || "-",
        address: row.address || "-",
        createdAt: row.createdAt || row.createdAtTimestamp || row.createdAtMillis || null,
        profilePictureUrl: row.profilePictureUrl || "-",
        isVerified: row.isVerified ?? row.verified ?? false,
      };
    }

    if (datasetKey === "mechanics") {
      return {
        id: row.id,
        name: row.name || `${row.firstName || ""} ${row.lastName || ""}`.trim(),
        email: row.email || "-",
        phone: row.phone || row.phoneNum || "-",
        businessName: row.business || row.businessName || "-",
        businessAddress: row.businessAddress || row.businessLocation || "-",
        documents: Array.isArray(row.documents) ? row.documents.map((d: any) => d.name || d).join(", ") : row.documents || "-",
        verified: row.verified ?? false,
        createdAt: row.createdAt || null,
        rating: row.rating ?? row.avgRating ?? "-",
        profilePictureUrl: row.profilePictureUrl || "-",
      };
    }

    if (datasetKey === "requests") {
      return {
        id: row.id,
        userName: row.userName || row.user?.name || "-",
        userPhone: row.phoneNum || row.user?.phoneNumber || row.userPhone || "-",
        mechanicName: row.claimedBy?.name || row.mechanic?.name || "-",
        mechanicPhone: row.claimedBy?.phoneNum || row.mechanic?.phone || "-",
        status: row.status || "-",
        address: row.address || "-",
        location: row.location ? `${row.location.latitude}, ${row.location.longitude}` : (row.lat && row.lng ? `${row.lat}, ${row.lng}` : "-"),
        vehicleId: row.vehicleId || (row.vehicle && row.vehicle.id) || "-",
        createdAt: row.timestamp || row.createdAt || null,
        completedAt: row.completedAt || row.doneAt || null,
        payment: row.payment || "-",
        serviceType: row.serviceType || row.type || "-",
        issueDescription: row.reason || row.issue || row.issueDescription || "-",
      };
    }

   if (datasetKey === "reports") {
  return {
    id: row.id,

    // There is no "type" field in your DB unless you add one
    reportType: row.reportType || "-", 

    description: row.description || "-",

    // reporter = reportedBy
    reporterName: row.reportedBy?.name || "-",
    reporterId: row.reportedBy?.id || "-",

    // reportAgainst = reportedTo
    reportAgainstName: row.reportedTo?.name || "-",
    reportAgainstId: row.reportedTo?.id || "-",

    createdAt: row.createdAt || null,
    status: row.reportedTo?.status || row.status || "-",

    // count evidence images
    evidenceImages: Array.isArray(row.proofImageUrl)
      ? row.proofImageUrl.length
      : row.proofImageUrl
      ? 1
      : 0,
  };
}


    if (datasetKey === "posts") {
      return {
        id: row.id,
        userName: row.user?.name || row.userName || "-",
        content: row.content || row.text || "-",
        images: Array.isArray(row.images) ? row.images.length : (row.image ? 1 : 0),
        createdAt: row.createdAt || row.timestamp || null,
        likesCount: row.likesCount ?? (Array.isArray(row.likes) ? row.likes.length : 0),
        commentsCount: row.commentsCount ?? (Array.isArray(row.comments) ? row.comments.length : 0),
      };
    }

    return row;
  }

  // Table renderer — Excel-style inside modal (no download)
  function DetailTable({ datasetKey, data }: { datasetKey: string; data: any[] }) {
    const cols = (columns as any)[datasetKey];
    return (
      <div className="w-full overflow-auto max-h-[70vh]">
        <table className="min-w-full table-fixed border-collapse text-sm">
          <thead>
            <tr>
              {cols.map((c: any) => (
                <th
                  key={c.key}
                  className="sticky top-0 bg-gray-50 z-10 border px-3 py-2 text-left text-xs font-semibold text-gray-600"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((rawRow, rowIndex) => {
              const row = normalizeRow(datasetKey, rawRow);
              return (
                <tr key={row.id ?? rowIndex} className="even:bg-white odd:bg-gray-50">
                  {cols.map((c: any) => {
                    const val = row[c.key];
                    const display = c.format ? c.format(val) : (val === null || val === undefined ? "-" : String(val));
                    return (
                      <td key={c.key} className="border px-3 py-2 align-top">
                        <div className="truncate max-w-[360px]">{display}</div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function StatCard({ title, value, onClick }: { title: string; value: number; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        className="bg-white rounded-2xl p-5 text-center border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200"
      >
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h2>
        <p className="text-3xl font-bold text-[#FF5722] mt-2">{value}</p>
      </button>
    );
  }

  function Graph({ title, data, color }: { title: string; data: any[]; color: string }) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
        <h3 className="text-md font-semibold text-gray-700 mb-4">{title}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <defs>
              <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "white", border: "1px solid #f1f1f1", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
            />
            <Line type="monotone" dataKey="count" stroke={color} strokeWidth={3} dot={{ r: 4, fill: color }} activeDot={{ r: 6, fill: color }} fillOpacity={1} fill={`url(#grad-${color})`} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const getTitlePeriod = () => (timeframe === "day" ? "Day" : timeframe === "month" ? "Month" : "Year");

  return (
    <div className="relative min-h-screen bg-white text-gray-800 font-inter overflow-hidden p-6">
      {/* Menu button */}
      <button onClick={() => setIsMenuOpen(true)} className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-[#FF5722] text-white px-4 py-2 rounded-lg">
        <Menu size={18} />
        <span className="font-semibold">Menu</span>
      </button>

      {isMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-30" onClick={() => setIsMenuOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[#FF5722] text-white p-6 flex flex-col z-40 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-white/20 pb-3">
              <h2 className="text-2xl font-bold tracking-wide">Menu</h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/20 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-col space-y-3">
              <button className="bg-white text-[#FF5722] font-semibold py-2 px-4 rounded-lg hover:bg-gray-100" onClick={() => window.location.assign("/reports")}>View Reports</button>
              <button className="bg-white text-[#FF5722] font-semibold py-2 px-4 rounded-lg hover:bg-gray-100" onClick={() => window.location.assign("/users")}>Search Users</button>
              <button className="bg-white text-[#FF5722] font-semibold py-2 px-4 rounded-lg hover:bg-gray-100" onClick={() => window.location.assign("/mechanics")}>Search Mechanics</button>
              <button className="bg-white text-[#FF5722] font-semibold py-2 px-4 rounded-lg hover:bg-gray-100" onClick={() => window.location.assign("/privacy")}>Privacy</button>
            </nav>
          </aside>
        </>
      )}

      <main className="pt-10">
        <header className="mb-8 border-b border-gray-200 pb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#FF5722] tracking-tight">Admin Dashboard</h1>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
          <StatCard title="Users" value={totals.users} onClick={() => openModalFor("users")} />
          <StatCard title="Mechanics" value={totals.mechanics} onClick={() => openModalFor("mechanics")} />
          <StatCard title="Requests" value={totals.requests} onClick={() => openModalFor("requests")} />
          <StatCard title="Reports" value={totals.reports} onClick={() => openModalFor("reports")} />
          <StatCard title="Posts" value={totals.posts} onClick={() => openModalFor("posts")} />
        </div>

        {/* Timeframe selector */}
        <div className="flex justify-end mb-6">
          <div className="inline-flex rounded-xl shadow-md bg-gray-100 p-1">
            <button onClick={() => setTimeframe("day")} className={`px-4 py-2 text-sm font-medium rounded-xl ${timeframe === "day" ? "bg-white text-[#FF5722] shadow-sm" : "text-gray-600 hover:bg-white/50"}`}>Daily</button>
            <button onClick={() => setTimeframe("month")} className={`px-4 py-2 text-sm font-medium rounded-xl ${timeframe === "month" ? "bg-white text-[#FF5722] shadow-sm" : "text-gray-600 hover:bg-white/50"}`}>Monthly</button>
            <button onClick={() => setTimeframe("year")} className={`px-4 py-2 text-sm font-medium rounded-xl ${timeframe === "year" ? "bg-white text-[#FF5722] shadow-sm" : "text-gray-600 hover:bg-white/50"}`}>Yearly</button>
          </div>
        </div>

        {/* Graphs grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Graph title={`Users per ${getTitlePeriod()}`} color="#FF5722" data={usersData} />
          <Graph title={`Mechanics per ${getTitlePeriod()}`} color="#FF784E" data={mechanicsData} />
          <Graph title={`Requests per ${getTitlePeriod()}`} color="#FF8A50" data={requestsData} />
          <Graph title={`Reports per ${getTitlePeriod()}`} color="#E64A19" data={reportsData} />
          <Graph title={`Posts per ${getTitlePeriod()}`} color="#FF7043" data={postsData} />
        </div>
      </main>

      {/* Detail Modal (Excel-like table inside UI, not downloadable) */}
      {modalOpen && activeDataset && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />

          <div className="relative z-60 w-full max-w-6xl bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{activeDataset.toUpperCase()} — Full Details</h2>
              <div className="flex items-center gap-3">
                <button className="px-3 py-1 rounded bg-gray-100 text-sm" onClick={() => setModalOpen(false)}>Close</button>
              </div>
            </div>

            <div className="mb-3 text-xs text-gray-600">Showing all fields in an Excel-style table. Scroll horizontally or vertically as needed.</div>

            {/* The table: use the raw dataset for rows */}
            <DetailTable datasetKey={activeDataset} data={datasetMap[activeDataset]} />

            <div className="mt-3 text-right">
              <button className="px-4 py-2 bg-[#FF5722] text-white rounded-lg" onClick={() => setModalOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
