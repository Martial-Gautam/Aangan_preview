'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';
import {
  Users, Globe, TreePine, TrendingUp,
  Calendar, Baby, Crown, Loader2, ArrowLeft
} from 'lucide-react';

interface Stats {
  direct_count: number;
  extended_count: number;
  oldest: { name: string; dob: string } | null;
  youngest: { name: string; dob: string } | null;
  generations: number;
  birthplaces: string[];
  birthplace_count: number;
  growth_percent: number;
  new_this_month: number;
}

export default function StatsPage() {
  const { user, session, profile, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || !profile?.onboarding_completed) {
      router.replace('/welcome');
      return;
    }
    fetchStats();
  }, [user, profile, loading]);

  const fetchStats = async () => {
    if (!session?.access_token) return;
    setStatsLoading(true);
    try {
      const res = await fetch('/api/stats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const getAge = (dob: string) => {
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  };

  if (loading || statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center animate-pulse">
            <TreePine size={20} className="text-orange-400" />
          </div>
          <p className="text-sm text-gray-400">Loading statistics...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      icon: Users,
      label: 'Direct Members',
      value: stats?.direct_count || 0,
      subtitle: 'In your tree',
      color: 'bg-orange-500',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      icon: Globe,
      label: 'Extended Network',
      value: stats?.extended_count || 0,
      subtitle: 'Connected trees',
      color: 'bg-blue-500',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      icon: TreePine,
      label: 'Generations',
      value: stats?.generations || 1,
      subtitle: 'Depth of your tree',
      color: 'bg-emerald-500',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      icon: TrendingUp,
      label: 'Growth',
      value: `${stats?.growth_percent || 0}%`,
      subtitle: `${stats?.new_this_month || 0} new this month`,
      color: 'bg-violet-500',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="bg-white px-5 pt-12 pb-5 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={18} className="text-gray-600" />
            </button>
            <div>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                Aangan
              </p>
              <h1 className="text-lg font-bold text-gray-900">Tree Statistics</h1>
            </div>
          </div>
        </div>

        <div className="px-4 py-5 space-y-4">
          {/* Main stat cards grid */}
          <div className="grid grid-cols-2 gap-3">
            {statCards.map(({ icon: Icon, label, value, subtitle, iconBg, iconColor }, idx) => (
              <div
                key={label}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
                  <Icon size={18} className={iconColor} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">{label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
              </div>
            ))}
          </div>

          {/* Oldest Member */}
          {stats?.oldest && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Crown size={20} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Oldest Member
                  </p>
                  <p className="text-base font-bold text-gray-900 truncate">
                    {stats.oldest.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getAge(stats.oldest.dob)} years old •{' '}
                    {new Date(stats.oldest.dob).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Youngest Member */}
          {stats?.youngest && stats.youngest.name !== stats.oldest?.name && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Baby size={20} className="text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Youngest Member
                  </p>
                  <p className="text-base font-bold text-gray-900 truncate">
                    {stats.youngest.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getAge(stats.youngest.dob)} years old •{' '}
                    {new Date(stats.youngest.dob).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Birthplaces */}
          {stats && stats.birthplace_count > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <Globe size={20} className="text-rose-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Birthplaces
                  </p>
                  <p className="text-base font-bold text-gray-900">
                    {stats.birthplace_count} {stats.birthplace_count === 1 ? 'place' : 'places'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {stats.birthplaces.map(place => (
                  <span
                    key={place}
                    className="text-[11px] font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full"
                  >
                    {place}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Encouragement */}
          <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-5 shadow-lg shadow-orange-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <TreePine size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Keep growing your tree!</p>
                <p className="text-xs text-white/80 mt-1 leading-relaxed">
                  Add more family members to discover deeper connections and unlock richer statistics about your heritage.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
