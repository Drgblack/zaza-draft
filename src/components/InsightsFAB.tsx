import { TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export function InsightsFAB() {
  return (
    <Link 
      to="/insights"
      className="fixed bottom-6 right-6 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 z-50"
      title="View Your Impact"
    >
      <TrendingUp size={24} />
    </Link>
  );
}
