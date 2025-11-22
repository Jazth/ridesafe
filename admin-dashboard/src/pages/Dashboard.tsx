import { collection, getDocs } from "firebase/firestore";
import { Menu, X } from "lucide-react"; // icons for hamburger and close
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
// Assume this file exists in your project
import { db } from "../firebaseConfig"; 

// Refactored function to group data by day, month, or year
function groupData(docs: any[], timeframe: 'day' | 'month' | 'year') {
  const grouped: Record<string, { count: number; date: Date }> = {};

  docs.forEach((doc) => {
    // Fallback logic for retrieving timestamp
    const timestamp = doc.timestamp || doc.createdAt || doc.date || null;
    if (!timestamp) return;

    // Convert Firestore Timestamp object or Date object to JavaScript Date
    const dateObj = new Date(
      timestamp.seconds ? timestamp.seconds * 1000 : timestamp
    );

    let key: string;
    let sortDate: Date; // Used for correct chronological sorting
    
    if (timeframe === 'year') {
      // Group by Year (e.g., "2023")
      key = dateObj.toLocaleDateString("en-US", { year: "numeric" });
      // Normalize the dateObj to Jan 1st of the year for correct time-based sorting
      sortDate = new Date(dateObj.getFullYear(), 0, 1);
      dateObj.setTime(sortDate.getTime());
    } else if (timeframe === 'month') {
      // Group by Year and Month (e.g., "Jan 2023")
      key = dateObj.toLocaleDateString("en-US", { year: "numeric", month: "short" });
      
      // Normalize the dateObj to the 1st of the month for correct time-based sorting
      sortDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
      dateObj.setTime(sortDate.getTime());

    } else { // 'day'
      // Group by Month and Day (e.g., "Jan 15")
      key = dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }

    if (!grouped[key]) grouped[key] = { count: 0, date: dateObj };
    grouped[key].count += 1;
  });

  // Sort the data chronologically based on the date object
  return Object.entries(grouped)
    .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
    .map(([day, { count }]) => ({ day, count }));
}

export default function Dashboard() {
  // State to store the final data ready for Recharts
  const [usersData, setUsersData] = useState<any[]>([]);
  const [mechanicsData, setMechanicsData] = useState<any[]>([]);
  const [requestsData, setRequestsData] = useState<any[]>([]);
  const [reportsData, setReportsData] = useState<any[]>([]);
  const [postsData, setPostsData] = useState<any[]>([]);
  
  // State to store the raw data fetched from Firestore once
  const [rawUsersData, setRawUsersData] = useState<any[]>([]);
  const [rawMechanicsData, setRawMechanicsData] = useState<any[]>([]);
  const [rawRequestsData, setRawRequestsData] = useState<any[]>([]);
  const [rawReportsData, setRawReportsData] = useState<any[]>([]);
  const [rawPostsData, setRawPostsData] = useState<any[]>([]);
  
  // New state for timeframe selection, now including 'year'
  const [timeframe, setTimeframe] = useState<'day' | 'month' | 'year'>('day');

  const [totals, setTotals] = useState({
    users: 0,
    mechanics: 0,
    requests: 0,
    reports: 0,
    posts: 0,
  });
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 1. Initial Data Fetching (runs once)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersSnap, mechanicsSnap, breakdownSnap, reportsSnap, postsSnap] =
          await Promise.all([
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
  
        // Store raw document data
        setRawUsersData(usersSnap.docs.map((d) => d.data()));
        setRawMechanicsData(mechanicsSnap.docs.map((d) => d.data()));
        setRawRequestsData(breakdownSnap.docs.map((d) => d.data()));
        setRawReportsData(reportsSnap.docs.map((d) => d.data()));
        setRawPostsData(postsSnap.docs.map((d) => d.data()));
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
  
    fetchData();
  }, []);

  // 2. Data Processing (runs on initial fetch and whenever timeframe changes)
  useEffect(() => {
    // Recalculate grouped data based on the current timeframe
    if (rawUsersData.length > 0 || timeframe === 'day' || timeframe === 'month' || timeframe === 'year') {
      setUsersData(groupData(rawUsersData, timeframe));
      setMechanicsData(groupData(rawMechanicsData, timeframe));
      setRequestsData(groupData(rawRequestsData, timeframe));
      setReportsData(groupData(rawReportsData, timeframe));
      setPostsData(groupData(rawPostsData, timeframe));
    }
  }, [
    rawUsersData, 
    rawMechanicsData, 
    rawRequestsData, 
    rawReportsData, 
    rawPostsData, 
    timeframe
  ]);

  // Function to generate dynamic graph titles
  const getTitlePeriod = () => {
    if (timeframe === 'day') return 'Day';
    if (timeframe === 'month') return 'Month';
    return 'Year';
  };

  return (
    <div className="relative min-h-screen bg-white text-gray-800 font-inter overflow-hidden">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsMenuOpen(true)}
        className="absolute top-8 left-8 z-20 flex items-center gap-2 bg-[#FF5722] text-white px-4 py-2 rounded-lg hover:bg-[#e64a19] transition-all"
      >
        <Menu size={22} />
        <span className="font-semibold">Menu</span>
      </button>

      {/* Sidebar Modal */}
      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-30"
            onClick={() => setIsMenuOpen(false)}
          ></div>
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[#FF5722] text-white p-6 flex flex-col z-40 shadow-2xl animate-slideIn">
            <div className="flex justify-between items-center mb-6 border-b border-white/20 pb-3">
              <h2 className="text-2xl font-bold tracking-wide">Menu</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-all"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="flex flex-col space-y-3">
              <button className="bg-white text-[#FF5722] font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition-all"
              onClick={() => navigate("/reports")}>
                View Reports
              </button>
              <button className="bg-white text-[#FF5722] font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition-all"
              onClick={() => navigate("/users")}>
                Search Users
              </button>
              <button className="bg-white text-[#FF5722] font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition-all"
              onClick={() => navigate("/mechanics")}>
                Search Mechanics
              </button>
            </nav>
          </aside>
        </>
      )}

      {/* Main Dashboard */}
      <main className="flex-1 p-10 pt-24 overflow-y-auto">
        <header className="mb-10 border-b border-gray-200 pb-6 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-[#FF5722] tracking-tight">
            Admin Dashboard
          </h1>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-12">
          <StatCard title="Users" value={totals.users} />
          <StatCard title="Mechanics" value={totals.mechanics} />
          <StatCard title="Requests" value={totals.requests} />
          <StatCard title="Reports" value={totals.reports} />
          <StatCard title="Posts" value={totals.posts} />
        </div>

        {/* Timeframe Selector */}
        <div className="flex justify-end mb-8">
          <div className="inline-flex rounded-xl shadow-md bg-gray-100 p-1">
            <button
              onClick={() => setTimeframe('day')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors duration-200 ${
                timeframe === 'day'
                  ? 'bg-white text-[#FF5722] shadow-sm'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors duration-200 ${
                timeframe === 'month'
                  ? 'bg-white text-[#FF5722] shadow-sm'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setTimeframe('year')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors duration-200 ${
                timeframe === 'year'
                  ? 'bg-white text-[#FF5722] shadow-sm'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Graphs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          <Graph title={`Users per ${getTitlePeriod()}`} color="#FF5722" data={usersData} />
          <Graph title={`Mechanics per ${getTitlePeriod()}`} color="#FF784E" data={mechanicsData} />
          <Graph title={`Requests per ${getTitlePeriod()}`} color="#FF8A50" data={requestsData} />
          <Graph title={`Reports per ${getTitlePeriod()}`} color="#E64A19" data={reportsData} />
          <Graph title={`Posts per ${getTitlePeriod()}`} color="#FF7043" data={postsData} />
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl p-5 text-center border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {title}
      </h2>
      <p className="text-3xl font-bold text-[#FF5722] mt-2">{value}</p>
    </div>
  );
}

function Graph({
  title,
  data,
  color,
}: {
  title: string;
  data: any[];
  color: string;
}) {
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
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: "#9CA3AF" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#9CA3AF" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #f1f1f1",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={3}
            dot={{ r: 4, fill: color }}
            activeDot={{ r: 6, fill: color }}
            fillOpacity={1}
            fill={`url(#grad-${color})`}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}