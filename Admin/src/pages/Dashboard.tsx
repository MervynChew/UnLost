import { useMemo } from 'react';
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
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const chartColors = {
  purple: '#8b6ba8',
  orange: '#e89b7f',
  background: '#f5f3f0'
};

export default function Dashboard() {

  const months = useMemo(() => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], []);
  const totalPerMonth = useMemo(() => [18, 24, 30, 42, 33, 28, 36, 40, 38, 45, 32, 26], []);
  const recoveredLost = useMemo(() => [6, 8, 10, 12, 9, 7, 11, 13, 12, 15, 9, 8], []);
  const foundReturn = useMemo(() => [12, 16, 20, 30, 24, 21, 25, 27, 26, 30, 23, 18], []);

  const reportedItems = useMemo(() => ({
    labels: ['Matric card', 'Wallet', 'Glasses', 'Keys', 'Water Tumbler', 'Others'],
    counts: [15, 22, 9, 31, 7, 14],
  }), []);

  // Updated with chartColors
  const totalPostsData = useMemo(() => ({
    labels: months,
    datasets: [
      {
        label: 'Total Posts',
        data: totalPerMonth,
        backgroundColor: chartColors.purple, // ← Changed
        borderRadius: 6,
      },
    ],
  }), [months, totalPerMonth]);

  // Updated with chartColors
  const categorizedData = useMemo(() => ({
    labels: months,
    datasets: [
      {
        label: 'Recovered/Lost',
        data: recoveredLost,
        backgroundColor: chartColors.orange, // ← Changed
        borderRadius: 6,
      },
      {
        label: 'Found/Return',
        data: foundReturn,
        backgroundColor: chartColors.purple, // ← Changed
        borderRadius: 6,
      },
    ],
  }), [months, recoveredLost, foundReturn]);

  // Updated pie colors to match palette
  const pieData = useMemo(() => ({
    labels: reportedItems.labels,
    datasets: [
      {
        data: reportedItems.counts,
        backgroundColor: [
          '#4cc9f0',    // Cyan for Matric card
          '#f72585',    // Pink for Wallet
          '#43aa8b',    // Green for Glasses
          '#ffbe0b',    // Yellow for Keys
          '#7209b7',    // Purple for Water Tumbler
          '#adb5bd'     // Gray for Others
        ],
        borderWidth: 0,
      },
    ],
  }), [reportedItems]);

  // Updated options with lighter text colors for better contrast on light background
  const commonBarOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        labels: { color: '#2d2d2d' }, // ← Changed to dark text
      },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#5d5d5d' }, // ← Changed to darker
      },
      y: {
        grid: { color: '#e0e0e0' }, // ← Changed to light gray
        ticks: { color: '#5d5d5d', stepSize: 5 }, // ← Changed to darker
        beginAtZero: true,
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'right' as const, 
        labels: { color: '#2d2d2d' } // ← Changed to dark text
      },
      tooltip: { enabled: true },
    },
  };

  const [totalLost, setTotalLost] = useState(0);

  useEffect(() => {
    async function fetchStates() {
      // This tells Supabase: "Count all rows in 'posts' where type is 'lost'"
      const { count, error } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'lost');

        if(!error) setTotalLost(count || 0);
    }

    fetchStates();
  }, []);

  return (
    <div className="dashboard">
      <div className="dash-header">
        <h2 className="title">System Overview</h2>
        <button className="refresh-button" onClick={() => window.location.reload()}>Last 30 Days</button>
      </div>

      <div className="KPI">
        <div className="KPI-cards">
          <span className="stat-label">Total Lost Items</span>
          <span className="stat-value purple">1,245</span>
        </div>

        <div className="KPI-cards">
          <span className="stat-label">Total Found Items</span>
          <span className="stat-value green">987</span>
        </div>

        <div className="KPI-cards">
          <span className="stat-label">Recovery Rate</span>
          <span className="stat-value orange">79.2%</span>
        </div>

        <div className="KPI-cards">
          <span className="stat-label">Pending Approvals</span>
          <span className="stat-value yellow">12</span>
        </div>
      </div>

      <div className="grid">
        <section className="card">
          <h3 className="card-title">Total Posts</h3>
          <Bar data={totalPostsData} options={commonBarOptions} />
        </section>

        <section className="card">
          <h3 className="card-title">Categorized Posts</h3>
          <Bar data={categorizedData} options={commonBarOptions} />
        </section>
      </div>

      <div className="grid2">
        <section className="card pie-chart-container">
          <h3 className="card-title">Reported Items</h3>
          <div className="chart-wrapper">
            <Pie data={pieData} options={pieOptions} />
          </div>
        </section>

        <section className="card activity-container">
          <h3 className="card-title">Recent Reports</h3>
          <ul className="activity-list">
            <li><span>Wallet found at Library</span><small>2 mins ago</small></li>
            <li><span>Keys reported lost - (Block C)</span><small>2 hrs ago</small></li>
            <li><span>ID Card found - Cafeteria</span><small>5 hrs ago</small></li>
          </ul>
        </section>
      </div>
    </div>
  );
}