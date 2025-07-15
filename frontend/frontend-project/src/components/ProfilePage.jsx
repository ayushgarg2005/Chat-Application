import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import {
  Pencil,
  X,
  CheckCircle,
  AlertTriangle,
  MapPin,
  UserCircle2,
  Image,
  Lock,
  Info,
} from "lucide-react";

const DEFAULT_AVATAR = "https://www.gravatar.com/avatar/?d=mp";

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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/me", {
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

  // Check for password update validity
  if ((formData.password && !formData.currentPassword) || (!formData.password && formData.currentPassword)) {
    setMessage("❌ To update your password, both current and new passwords are required.");
    return;
  }

  try {
    const updatePayload = { ...formData };

    // If password field is empty, don't include password or currentPassword
    if (!formData.password) {
      delete updatePayload.password;
      delete updatePayload.currentPassword;
    }

    const res = await axios.put(
      `http://localhost:3000/user/${user.id}`,
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


  if (!user) {
    return (
      <div className="text-center mt-20 text-gray-500 text-lg">
        Loading your profile...
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white py-12 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-lg p-10 border border-slate-200">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              {isEditing ? <Pencil size={22} /> : <UserCircle2 size={28} />}
              {isEditing ? "Edit Your Profile" : "Profile Overview"}
            </h2>
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
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                isEditing
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isEditing ? (
                <>
                  <X size={16} /> Cancel
                </>
              ) : (
                <>
                  <Pencil size={16} /> Edit Profile
                </>
              )}
            </button>
          </div>

          {message && (
            <div
              className={`mb-6 flex items-center gap-2 text-sm font-medium ${
                message.includes("✔️") ? "text-green-600" : "text-red-600"
              }`}
            >
              {message.includes("✔️") ? (
                <CheckCircle size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
              {message.replace(/✔️|❌/, "").trim()}
            </div>
          )}
          <div className="flex justify-center mb-10">
            <div className="relative group">
              <img
                src={formData.profilePhoto || DEFAULT_AVATAR}
                alt="Profile"
                className="w-36 h-36 rounded-full object-cover border-4 border-slate-100 shadow-xl transition-transform duration-300 ease-in-out group-hover:scale-105 group-hover:shadow-2xl"
              />
              <div className="absolute bottom-0 right-0 bg-blue-600 p-1 rounded-full shadow-md group-hover:scale-110 transition-transform duration-200">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M4 13V16H7L16 7L13 4L4 13ZM17.7 5.3C18.1 4.9 18.1 4.3 17.7 3.9L16.1 2.3C15.7 1.9 15.1 1.9 14.7 2.3L13.1 3.9L16.1 6.9L17.7 5.3Z" />
                </svg>
              </div>
            </div>
          </div>


          {isEditing ? (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SectionTitle title="Personal Information" />
              <InputField label="Username" name="username" icon={<UserCircle2 />} value={formData.username} onChange={handleChange} required />
              <InputField label="Name" name="name" icon={<Info />} value={formData.name} onChange={handleChange} />
              <InputField label="Description" name="description" icon={<Info />} value={formData.description} onChange={handleChange} />
              <InputField label="Location" name="location" icon={<MapPin />} value={formData.location} onChange={handleChange} />
              <InputField label="Profile Photo URL" name="profilePhoto" icon={<Image />} value={formData.profilePhoto} onChange={handleChange} />

              <SectionTitle title="Change Password" />
              <InputField label="New Password" name="password" icon={<Lock />} value={formData.password} onChange={handleChange} type="password" />
              <InputField label="Current Password" name="currentPassword" icon={<Lock />} value={formData.currentPassword} onChange={handleChange} type="password" />
              <div className="md:col-span-2 text-xs text-gray-500 -mt-4">
                To update your password, current password is required.
              </div>

              <div className="md:col-span-2 mt-4">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow hover:shadow-lg transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
              <SectionTitle title="Personal Information" />
              <DisplayField label="Username" value={user.username} />
              <DisplayField label="Name" value={user.name} />
              <DisplayField label="Description" value={user.description} />
              <DisplayField label="Location" value={user.location} />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const SectionTitle = ({ title }) => (
  <div className="md:col-span-2 text-gray-800 text-sm font-bold uppercase tracking-wide border-b pb-1">
    {title}
  </div>
);

const InputField = ({ label, name, value, onChange, icon, type = "text", required = false }) => (
  <div className="relative">
    <input
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      type={type}
      required={required}
      className="peer w-full pt-6 pb-2 px-3 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      placeholder={label}
    />
    <label
      htmlFor={name}
      className="absolute left-3 top-2.5 text-xs text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-focus:top-2.5 peer-focus:text-xs peer-focus:text-blue-500"
    >
      {label}
    </label>
    {icon && <span className="absolute right-3 top-4 text-gray-400">{icon}</span>}
  </div>
);

const DisplayField = ({ label, value }) => (
  <div className="p-3 rounded-2xl bg-slate-50 shadow-sm border border-slate-200">
    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
      {label}
    </div>
    <div className="text-base font-medium text-slate-800">
      {value || <span className="text-slate-400">—</span>}
    </div>
  </div>
);


export default ProfilePage;
