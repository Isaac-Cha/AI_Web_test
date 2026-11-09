import React, { useEffect, useState } from "react";
import api from "./api";
import { MessageSquare, Settings2, BarChart2, BookOpen } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    submissions: null,
    eas: null,
    indicators: null,
    tutorials: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const results = await Promise.allSettled([
          api.get("/submissions?limit=1000"),
          api.get("/eas?limit=1000"),
          api.get("/indicators?limit=1000"),
          api.get("/tutorials?limit=1000"),
        ]);

        const count = (result) =>
          result.status === "fulfilled" && Array.isArray(result.value.data)
            ? result.value.data.length
            : null;

        setStats({
          submissions: count(results[0]),
          eas: count(results[1]),
          indicators: count(results[2]),
          tutorials: count(results[3]),
        });

        if (results.some((result) => result.status === "rejected")) {
          console.error("Some dashboard statistics failed to load", results);
        }
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "留言与申请总数", value: stats.submissions, icon: <MessageSquare size={24} className="text-blue-400" /> },
    { title: "EA 策略总数", value: stats.eas, icon: <Settings2 size={24} className="text-green-400" /> },
    { title: "技术指标总数", value: stats.indicators, icon: <BarChart2 size={24} className="text-purple-400" /> },
    { title: "视频教程总数", value: stats.tutorials, icon: <BookOpen size={24} className="text-yellow-400" /> },
  ];

  if (loading) {
    return <div className="text-neutral-400 animate-pulse">加载数据中...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white mb-8">数据总览</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="bg-neutral-800 p-6 rounded-2xl border border-neutral-700 flex items-center justify-between hover:border-neutral-600 transition-colors">
            <div>
              <p className="text-neutral-400 text-sm font-medium mb-2">{card.title}</p>
              <h3 className="text-3xl font-bold text-white">
                {card.value === null ? "--" : card.value}
              </h3>
            </div>
            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
              {card.icon}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
