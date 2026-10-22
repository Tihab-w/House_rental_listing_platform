import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';
import api from '../api';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444'];

export default function Analytics() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get('/analytics/owner').then(r => setData(r.data)).catch(() => {});
  }, []);
  if (!data) return <p>Loading…</p>;

  return (
    <div className="container section">
      <h1>Analytics</h1>
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Total Revenue</div><div className="kpi-value">${data.totalRevenue.toFixed(0)}</div></div>
        <div className="kpi"><div className="kpi-label">Bookings</div><div className="kpi-value">{data.totalBookings}</div></div>
        <div className="kpi"><div className="kpi-label">Occupancy</div><div className="kpi-value">{data.occupancyRate}%</div></div>
        <div className="kpi"><div className="kpi-label">Avg stay</div><div className="kpi-value">{data.avgStay} nights</div></div>
      </div>

      <div className="panel">
        <h3>Monthly revenue</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.monthlyRevenue}>
            <CartesianGrid stroke="#2a2a3e" />
            <XAxis dataKey="month" stroke="#aaa" />
            <YAxis stroke="#aaa" />
            <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none' }} />
            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="two-col">
        <div className="panel">
          <h3>Revenue by property</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.perProperty}>
              <XAxis dataKey="title" stroke="#aaa" tick={{ fontSize: 10 }} />
              <YAxis stroke="#aaa" />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none' }} />
              <Bar dataKey="revenue" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h3>Payment methods</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.paymentBreakdown} dataKey="count" nameKey="method" outerRadius={100} label>
                {data.paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}