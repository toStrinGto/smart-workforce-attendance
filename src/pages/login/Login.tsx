import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, Loader2, HardHat } from 'lucide-react';
import { motion } from 'framer-motion';
import { authApi } from '@/services/auth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore, Role } from '@/store/useAppStore';

const ROLE_HOME: Record<Role, string> = {
  worker: '/',
  foreman: '/',
  boss: '/',
  admin: '/admin',
};

const IS_MOCK = import.meta.env.VITE_MOCK_ENABLED === 'true';

export default function LoginPage() {
  usePageTitle('登录');
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setRole = useAppStore((s) => s.setRole);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = (): boolean => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的11位手机号');
      return false;
    }
    if (password.length < 6) {
      setError('密码至少6位');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    setError('');
    if (!validate()) return;

    try {
      setLoading(true);
      const res = await authApi.login({ phone, password });
      if (res.code === 200 && res.data) {
        const { accessToken, refreshToken, user } = res.data;
        setAuth({ accessToken, refreshToken, user });
        setRole(user.role);
        const from = (location.state as any)?.from || ROLE_HOME[user.role];
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* --- Desktop: Left Branding Panel --- */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-orange-500 to-orange-600 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8">
              <HardHat className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">智工考勤</h1>
            <p className="text-xl text-orange-100 mb-8">智慧工地考勤管理系统</p>
            <div className="space-y-4 text-orange-100/80">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white/60 rounded-full" />
                <span>实时考勤打卡，精准记录工时</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white/60 rounded-full" />
                <span>多角色协作，班组长/老板/管理员全流程管理</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white/60 rounded-full" />
                <span>数据可视化，项目成本一目了然</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* --- Right: Form Area (both mobile & desktop) --- */}
      <div className="flex flex-col w-full md:w-1/2">
        {/* Mobile-only header */}
        <div className="md:hidden bg-gradient-to-b from-orange-500 to-orange-400 pt-16 pb-20 px-6 rounded-b-3xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
              <HardHat className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">智工考勤</h1>
            <p className="text-orange-100 text-sm mt-1">智慧工地考勤管理系统</p>
          </motion.div>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-6 -mt-10 flex-1 flex items-center justify-center md:mt-0 md:px-16"
        >
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 md:shadow-lg">
              <h2 className="text-lg font-bold text-gray-800 mb-6">账号登录</h2>

              {/* Phone Input */}
              <div className="relative mb-4">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  maxLength={11}
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>

              {/* Password Input */}
              <div className="relative mb-4">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-red-500 text-xs mb-4 pl-1"
                >
                  {error}
                </motion.p>
              )}

              {/* Login Button */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-400 text-white font-bold rounded-xl shadow-md shadow-orange-500/25 active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '登录'}
              </button>
            </div>

            {/* Mock hint */}
            {IS_MOCK && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4"
              >
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700 space-y-1">
                  <p className="font-bold">开发模式测试账号：</p>
                  <p>工人 13800000001 / 班长 13800000002</p>
                  <p>老板 13800000003 / 管理员 13800000004</p>
                  <p>密码均为 123456</p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
