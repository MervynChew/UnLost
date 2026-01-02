import { useMemo, useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import './Dashboard.css';
import { supabase } from '../supabaseClient';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const chartColors = {
  purple: '#8b6ba8',
  orange: '#e89b7f',
  green: '#43aa8b',
  yellow: '#ffbe0b',
  background: '#f5f3f0'
};

interface DashboardStats {
  totalLost: number;
  totalFound: number;
  pendingApprovals: number;
  recoveryRate: number;
}

interface MonthlyData {
  month: string;
  totalPosts: number;
  lostPosts: number;
  claimedPosts: number;
}

interface CategoryCount {
  category: string;
  count: number;
}

interface RecentActivity {
  id: string;
  title: string;
  created_at: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLost: 0,
    totalFound: 0,
    pendingApprovals: 0,
    recoveryRate: 0,
  });

  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryCount[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const months = useMemo(() => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], []);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // 1. Fetch Stats from 'posts' table
        const { data: posts, error: postsError } = await supabase
          .from('posts')
          .select('status, created_at, tags');

        if (postsError) throw postsError;

        // Calculate KPI Stats
        const lost = posts.filter(p => p.status === 'lost').length;
        const claimed = posts.filter(p => p.status === 'claimed').length;
        const total = posts.length;
        const recoveryRate = total > 0 ? ((claimed / total) * 100).toFixed(1) : '0.0';

        // 2. Fetch Pending Requests from 'schedule_requests' table
        const { count: pendingCount } = await supabase
          .from('schedule_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        setStats({
          totalLost: lost,
          totalFound: claimed, // Using 'claimed' as 'found' count based on your schema
          pendingApprovals: pendingCount || 0,
          recoveryRate: parseFloat(recoveryRate),
        });

        // 3. Process Monthly Data
        const monthlyMap = new Map();
        months.forEach(m => monthlyMap.set(m, { totalPosts: 0, lostPosts: 0, claimedPosts: 0 }));

        posts.forEach(post => {
          const month = months[new Date(post.created_at).getMonth()];
          const current = monthlyMap.get(month);
          current.totalPosts += 1;
          if (post.status === 'lost') current.lostPosts += 1;
          if (post.status === 'claimed') current.claimedPosts += 1;
        });

        setMonthlyData(months.map(m => ({ month: m, ...monthlyMap.get(m) })));

        // 4. Process Top 5 Category Data (Mapping from tags[0])
        const categoryMap = new Map<string, number>();
        posts.forEach(post => {
          const cat = (post.tags && post.tags[0]) || 'Uncategorized';
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
        });

        const sortedTop5 = Array.from(categoryMap.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setCategoryData(sortedTop5);

        // 5. Fetch Recent Activities from 'notifications' table
        const { data: notifications } = await supabase
          .from('notifications')
          .select('notification_id, title, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentActivities(notifications?.map(n => ({
          id: n.notification_id.toString(),
          title: n.title,
          created_at: n.created_at
        })) || []);

      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [months]);

  // Chart Data Configurations
  const totalPostsData = useMemo(() => ({
    labels: months,
    datasets: [{
      label: 'Total Reports',
      data: monthlyData.map(m => m.totalPosts),
      backgroundColor: chartColors.purple,
      borderRadius: 6,
    }],
  }), [monthlyData, months]);

  const categorizedData = useMemo(() => ({
    labels: months,
    datasets: [
      {
        label: 'Lost',
        data: monthlyData.map(m => m.lostPosts),
        backgroundColor: chartColors.orange,
        borderRadius: 6,
      },
      {
        label: 'Claimed',
        data: monthlyData.map(m => m.claimedPosts),
        backgroundColor: chartColors.green,
        borderRadius: 6,
      },
    ],
  }), [monthlyData, months]);

  const pieData = useMemo(() => ({
    labels: categoryData.map(c => c.category),
    datasets: [{
      data: categoryData.map(c => c.count),
      backgroundColor: ['#4cc9f0', '#f72585', '#43aa8b', '#ffbe0b', '#7209b7', '#adb5bd'],
      borderWidth: 0,
    }],
  }), [categoryData]);

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'right' as const, // Moves legend to the right
        labels: { 
          color: '#2d2d2d',
          padding: 20, // Adds space between the chart and the text
          font: {
            size: 12
          }
        }
      },
      tooltip: { enabled: true },
    },
  };


  const commonBarOptions = {
    responsive: true,
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  };

  const formatTimeAgo = (dateString: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  if (loading) return <div className="dashboard"><p>Loading Admin Metrics...</p></div>;

  return (
    <div className="dashboard">
      <div className="dash-header">
        <h2 className="title">System Overview</h2>
        <button className="refresh-button" onClick={() => window.location.reload()}>Refresh</button>
      </div>

      <div className="KPI">
        <div className="KPI-cards">
          <span className="stat-label">Lost Items</span>
          <span className="stat-value purple">{stats.totalLost}</span>
        </div>
        <div className="KPI-cards">
          <span className="stat-label">Claimed Items</span>
          <span className="stat-value green">{stats.totalFound}</span>
        </div>
        <div className="KPI-cards">
          <span className="stat-label">Recovery Rate</span>
          <span className="stat-value orange">{stats.recoveryRate}%</span>
        </div>
        <div className="KPI-cards">
          <span className="stat-label">Pending Meetings</span>
          <span className="stat-value yellow">{stats.pendingApprovals}</span>
        </div>
      </div>

      <div className="grid">
        <section className="card">
          <h3 className="card-title">Monthly Activity</h3>
          <Bar data={totalPostsData} options={commonBarOptions} />
        </section>
        <section className="card">
          <h3 className="card-title">Status Breakdown</h3>
          <Bar data={categorizedData} options={commonBarOptions} />
        </section>
      </div>

      <div className="grid2">
        <section className="card pie-chart-container">
          <h3 className="card-title">Top Categories (via Tags)</h3>
          <div className="chart-wrapper">
            <Pie data={pieData} options={pieOptions} />
          </div>
        </section>

        <section className="card activity-container">
          <h3 className="card-title">Recent Notifications</h3>
          <ul className="activity-list">
            {recentActivities.map(activity => (
              <li key={activity.id}>
                <span>{activity.title}</span>
                <small>{formatTimeAgo(activity.created_at)}</small>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}