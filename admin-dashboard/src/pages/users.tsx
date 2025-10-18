import { collection, getDocs } from "firebase/firestore";
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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as User[];
        setUsers(data);
        setFiltered(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Search filter
  useEffect(() => {
  const lower = search.toLowerCase();
  setFiltered(
    users.filter((u) =>
      `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase().includes(lower)
    )
  );
}, [search, users]);


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
                  {`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Unnamed User"}
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
        {selectedUser.name || "User Details"}
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
        {Object.entries(selectedUser)
          .filter(([key]) => !["id","name","email","phone","address","profilePictureUrl"].includes(key))
          .map(([key, value]) => {
            const val = value as any;

            // Firestore Timestamp
            if (val && typeof val === "object" && "seconds" in val) {
              const date = new Date(val.seconds * 1000);
              return (
                <p key={key}>
                  <span className="font-semibold capitalize">{key}:</span>{" "}
                  {date.toLocaleString()}
                </p>
              );
            }

            // Vehicles array
            if (key === "vehicles" && Array.isArray(val)) {
              return (
                <div key={key} className="mt-3">
                  <span className="font-semibold capitalize">{key}:</span>
                  <ul className="list-disc list-inside mt-2 space-y-2">
                    {val.map((v: any, i: number) => (
                      <li key={i} className="ml-4 text-sm text-gray-700">
                        <span className="font-semibold">
                          {v.year} {v.make} {v.model}
                        </span>{" "}
                        — {v.transmission}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }

            return (
              <p key={key}>
                <span className="font-semibold capitalize">{key}:</span> {String(val)}
              </p>
            );
          })}
      </div>

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
