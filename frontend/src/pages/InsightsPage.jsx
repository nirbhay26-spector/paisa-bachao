import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { formatCurrency } from '../utils/format';
import MoneyPulseChart from '../components/common/MoneyPulseChart';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Sparkles,
  PieChart,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';

const PALETTE = ['#FF5C8A', '#7C5CFF', '#C6F432', '#FF4D4D', '#3A86FF', '#19B37A', '#E8A317', '#9B59B6'];

export default function InsightsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  // Spending Wrapped card index
  const [storyIndex, setStoryIndex] = useState(0);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const [anRes, inRes] = await Promise.all([
        api.get('/expenses/analytics'),
        api.get('/advisor/insights'),
      ]);
      setData(anRes.data);
      setInsights(inRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const categoryData = (data?.byCategory || []).map((c, i) => ({
    name: c.name || 'Other',
    value: Math.round(c.total),
    color: c.color || PALETTE[i % PALETTE.length],
  }));

  const tagData = (data?.byTag || []).map((tg) => ({
    name: tg.tag === 'need' ? 'Needs (50%)' : tg.tag === 'want' ? 'Wants (30%)' : tg.tag === 'savings' ? 'Savings (20%)' : 'Untagged',
    value: Math.round(tg.total),
    color: tg.tag === 'need' ? '#19B37A' : tg.tag === 'want' ? '#E8A317' : tg.tag === 'savings' ? '#7C5CFF' : '#6B746E',
  }));

  const dailyTrendData = (data?.dailyTrend || []).slice(-14).map((d) => ({
    day: d.day.slice(5),
    amount: Math.round(d.total),
  }));

  const totalSpent = categoryData.reduce((acc, c) => acc + c.value, 0);

  // Story recap cards
  const wrappedStories = [
    {
      title: 'Weekly Spending Wrapped',
      badge: 'Recap',
      bg: 'bg-highlight',
      content: totalSpent > 0 ? `You spent a total of ₹${totalSpent.toLocaleString('en-IN')} across ${categoryData.length} categories.` : 'No expenses recorded this week yet. Start logging to build your Wrapped story!',
      sub: totalSpent > 0 ? `Top spend: ${categoryData[0]?.name || 'None'}` : 'Tap + on Home to start',
    },
    {
      title: '50/30/20 Balance',
      badge: 'Habits',
      bg: 'bg-surface',
      content: tagData.length > 0
        ? `${tagData.find(t => t.name.includes('Needs'))?.value ? 'Needs' : 'Wants'} made up your largest share.`
        : 'Tag your spends as Need or Want to see your 50/30/20 health score.',
      sub: '50% Needs • 30% Wants • 20% Savings',
    },
    {
      title: 'Smart Takeaway',
      badge: 'Observation',
      bg: 'bg-bg',
      content: insights[0]?.observation || 'Your personal baseline engine is ready. Record 14 days of data to unlock full overspending detection!',
      sub: insights[0]?.action || 'Keep tracking consistently!',
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
      <div>
        <span className="text-[11px] font-heading font-extrabold uppercase tracking-wider text-text-muted">
          Your Data Only
        </span>
        <h1 className="text-xl font-heading font-black text-text">Personal Insights & Money Pulse</h1>
      </div>

      {/* Money Pulse Star Feature */}
      <MoneyPulseChart
        transactions={data?.recentTransactions || []}
        safePerDay={data?.safePerDay || 150}
        monthlyIncome={data?.monthlyIncome || 3000}
        savingsGoal={data?.savingsGoal || 500}
      />

      {/* Spending Wrapped Story Carousel */}
      <div className="card-brutal p-4 border-2 border-border shadow-sticker bg-surface relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-heading font-black uppercase px-2 py-0.5 rounded-full border border-border bg-highlight text-text">
            {wrappedStories[storyIndex].badge}
          </span>
          <div className="flex items-center gap-1">
            {wrappedStories.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full border border-border transition-all ${
                  i === storyIndex ? 'bg-primary w-4' : 'bg-surface'
                }`}
              />
            ))}
          </div>
        </div>

        <h3 className="text-base font-heading font-black text-text mb-1">
          {wrappedStories[storyIndex].title}
        </h3>
        <p className="text-xs font-semibold text-text leading-relaxed mb-2">
          {wrappedStories[storyIndex].content}
        </p>
        <span className="text-[11px] font-heading font-bold text-primary block">
          {wrappedStories[storyIndex].sub}
        </span>

        {/* Carousel controls */}
        <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-border/40">
          <button
            onClick={() => setStoryIndex((prev) => (prev > 0 ? prev - 1 : wrappedStories.length - 1))}
            className="p-1 rounded-lg border border-border bg-bg text-text hover:bg-surface"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setStoryIndex((prev) => (prev < wrappedStories.length - 1 ? prev + 1 : 0))}
            className="p-1 rounded-lg border border-border bg-bg text-text hover:bg-surface"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Real Calculated Insights Cards */}
      {insights.length > 0 && (
        <div className="space-y-2.5">
          <span className="text-xs font-heading font-black uppercase tracking-wider text-text-muted block">
            Observed Patterns
          </span>
          {insights.map((ins, i) => (
            <div
              key={i}
              className="card-brutal p-4 bg-surface border-2 border-border space-y-2 hover:translate-x-1 transition-transform"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{ins.icon}</span>
                <h4 className="text-sm font-heading font-black text-text">{ins.title}</h4>
              </div>

              <p className="text-xs font-bold text-text leading-snug">
                {ins.observation}
              </p>

              {ins.reason && (
                <p className="text-[11px] text-text-muted font-medium">
                  {ins.reason}
                </p>
              )}

              {ins.action && (
                <div className="bg-bg border border-border p-2 rounded-xl text-[11px] font-bold text-primary flex items-start gap-1.5">
                  <Lightbulb size={13} className="shrink-0 mt-0.5" />
                  <span>{ins.action}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State or Charts */}
      {categoryData.length === 0 ? (
        <div className="card-brutal p-8 text-center bg-surface space-y-2">
          <div className="text-3xl mb-1">📊</div>
          <h3 className="font-heading font-black text-sm">No data recorded yet</h3>
          <p className="text-xs text-text-muted font-medium max-w-xs mx-auto">
            Once you log a few expenses, your category breakdowns and 50/30/20 ratios will appear here!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Spending by Category Donut */}
          <div className="card-brutal p-4 bg-surface space-y-3">
            <h3 className="text-sm font-heading font-black flex items-center gap-2">
              <PieChart size={16} className="text-primary" />
              <span>Category Breakdown</span>
            </h3>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={categoryData}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#1B1B2F" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{ borderRadius: '16px', border: '2px solid #1B1B2F', fontWeight: 'bold' }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-2 border-t border-border/40">
              {categoryData.map((c) => (
                <div key={c.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border border-border shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="truncate text-text-muted">{c.name}:</span>
                  <span className="font-black ml-auto">{formatCurrency(c.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 14-Day Trend Bar Chart */}
          <div className="card-brutal p-4 bg-surface space-y-3">
            <h3 className="text-sm font-heading font-black flex items-center gap-2">
              <TrendingUp size={16} className="text-accent" />
              <span>Daily Spend Trend</span>
            </h3>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTrendData}>
                  <XAxis dataKey="day" stroke="#5C5B72" fontSize={10} tickLine={false} />
                  <YAxis stroke="#5C5B72" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Spent']}
                    contentStyle={{ borderRadius: '16px', border: '2px solid #1B1B2F', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="amount" fill="#FF5C8A" radius={[6, 6, 0, 0]} stroke="#1B1B2F" strokeWidth={1.5} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
