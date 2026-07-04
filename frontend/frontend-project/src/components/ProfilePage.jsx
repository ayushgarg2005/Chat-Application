import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import Avatar from "./Avatar";
import {
  Pencil,
  X,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  UserCircle2,
  Image as ImageIcon,
  Lock,
  Info,
  Sparkles,
} from "lucide-react";

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    currentPassword: "",
    name: "",
    description: "",
    location: "",
    profilePhoto: "",
  });
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("/api/me", {
          withCredentials: true,
        });
        setUser(res.data);
        setFormData({
          username: res.data.username || "",
          password: "",
          currentPassword: "",
          name: res.data.name || "",
          description: res.data.description || "",
          location: res.data.location || "",
          profilePhoto: res.data.profilePhoto || "",
        });
      } catch (err) {
        console.error("Failed to load user:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if ((formData.password && !formData.currentPassword) || (!formData.password && formData.currentPassword)) {
      setMessage("❌ To update your password, both current and new passwords are required.");
      return;
    }

    try {
      const updatePayload = { ...formData };

      if (!formData.password) {
        delete updatePayload.password;
        delete updatePayload.currentPassword;
      }

      const res = await axios.put(
        `/user/${user.id}`,
        updatePayload,
        { withCredentials: true }
      );

      setMessage("✔️ Profile updated successfully!");
      setUser(res.data);
      setFormData((prev) => ({
        ...prev,
        password: "",
        currentPassword: "",
      }));
      setIsEditing(false);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "❌ An error occurred while updating your profile.";
      setMessage(msg);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="max-w-4xl w-full mx-auto px-4 py-10 flex-1">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl h-48 w-full relative shadow-lg mb-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)] pointer-events-none rounded-3xl"></div>
          
          {/* Avatar floating over banner */}
          <div className="absolute -bottom-14 left-8 flex items-end gap-5">
            <div className="relative group">
              <Avatar
                user={{ ...user, profilePhoto: formData.profilePhoto || user.profilePhoto }}
                size="xl"
                className="ring-4 ring-white shadow-xl bg-white"
              />
            </div>
            <div className="mb-3 text-white hidden sm:block drop-shadow-md">
              <h1 className="text-2xl font-extrabold">{user.name || user.username}</h1>
              <p className="text-xs text-blue-100 font-medium">@{user.username}</p>
            </div>
          </div>

          <div className="absolute bottom-4 right-6">
            <button
              onClick={() => {
                setIsEditing(!isEditing);
                setMessage("");
                setFormData((prev) => ({
                  ...prev,
                  password: "",
                  currentPassword: "",
                }));
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all ${
                isEditing
                  ? "bg-rose-500 hover:bg-rose-600 text-white"
                  : "bg-white text-slate-800 hover:bg-slate-100"
              }`}
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4" /> Cancel Editing
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4 text-blue-600" /> Edit Profile
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-8 pt-10">
          <div className="sm:hidden mb-6 pb-4 border-b border-slate-100">
            <h1 className="text-2xl font-extrabold text-slate-800">{user.name || user.username}</h1>
            <p className="text-xs text-slate-400 font-medium">@{user.username}</p>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-2xl flex items-center gap-2.5 text-sm font-semibold shadow-sm border ${
                message.includes("✔️")
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {message.includes("✔️") ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              )}
              {message.replace(/✔️|❌/, "").trim()}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SectionTitle title="Personal Information" icon={<UserCircle2 className="w-4 h-4 text-blue-600" />} />
              <InputField label="Username" name="username" icon={<UserCircle2 className="w-4 h-4" />} value={formData.username} onChange={handleChange} required />
              <InputField label="Full Name" name="name" icon={<Info className="w-4 h-4" />} value={formData.name} onChange={handleChange} />
              <InputField label="Bio / Description" name="description" icon={<Info className="w-4 h-4" />} value={formData.description} onChange={handleChange} />
              <InputField label="Location" name="location" icon={<MapPin className="w-4 h-4" />} value={formData.location} onChange={handleChange} />
              <div className="md:col-span-2">
                <InputField label="Profile Photo URL" name="profilePhoto" icon={<ImageIcon className="w-4 h-4" />} value={formData.profilePhoto} onChange={handleChange} />
              </div>

              <SectionTitle title="Security & Password" icon={<Lock className="w-4 h-4 text-blue-600" />} />
              <InputField label="New Password" name="password" icon={<Lock className="w-4 h-4" />} value={formData.password} onChange={handleChange} type="password" />
              <InputField label="Current Password" name="currentPassword" icon={<Lock className="w-4 h-4" />} value={formData.currentPassword} onChange={handleChange} type="password" />
              <p className="md:col-span-2 text-xs text-slate-400 font-medium -mt-2">
                Leave password fields empty if you do not wish to change your password.
              </p>

              <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <SectionTitle title="Personal Information" icon={<UserCircle2 className="w-4 h-4 text-blue-600" />} />
              <DisplayField label="Username" value={`@${user.username}`} />
              <DisplayField label="Full Name" value={user.name} />
              <div className="md:col-span-2">
                <DisplayField label="Bio / Description" value={user.description} />
              </div>
              <DisplayField label="Location" value={user.location} icon={<MapPin className="w-4 h-4 text-slate-400 inline mr-1" />} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const SectionTitle = ({ title, icon }) => (
  <div className="md:col-span-2 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-100 pb-2 mt-2 flex items-center gap-2">
    {icon} {title}
  </div>
);

const InputField = ({ label, name, value, onChange, icon, type = "text", required = false }) => (
  <div className="relative">
    <label htmlFor={name} className="block text-xs font-bold text-slate-700 mb-1.5">
      {label}
    </label>
    <div className="relative">
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        required={required}
        className="w-full py-2.5 pl-4 pr-10 border border-slate-200 rounded-xl bg-slate-50/50 text-sm font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
        placeholder={`Enter ${label.toLowerCase()}...`}
      />
      {icon && <span className="absolute right-3.5 top-3 text-slate-400 pointer-events-none">{icon}</span>}
    </div>
  </div>
);

const DisplayField = ({ label, value, icon }) => (
  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-sm">
    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
      {label}
    </div>
    <div className="text-sm font-semibold text-slate-800">
      {icon} {value || <span className="text-slate-400 font-normal italic">Not provided</span>}
    </div>
  </div>
);

export default ProfilePage;
