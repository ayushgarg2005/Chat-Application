import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { User, Lock, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match. Please check and try again.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "/api/signup",
        {
          username: formData.username,
          password: formData.password,
        },
        { withCredentials: true }
      );

      toast.success("Account created successfully! Welcome aboard.", { icon: "🎉" });
      navigate("/");
    } catch (error) {
      console.error("Signup error:", error.response?.data || error.message);
      toast.error(error.response?.data?.error || "Could not create account. Username might be taken.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      <div className="bg-white/95 backdrop-blur-2xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/20 w-full max-w-md relative z-10 my-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            Create an Account
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Join the community today. It's free and takes seconds.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400 shadow-inner"
                placeholder="Choose a username"
                required
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400 shadow-inner"
                placeholder="Create a strong password"
                required
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400 shadow-inner"
                placeholder="Repeat your password"
                required
              />
              <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 text-white py-3.5 rounded-xl text-sm font-bold tracking-wide hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                Sign Up <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs sm:text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/signin" className="text-indigo-600 font-bold hover:underline">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
