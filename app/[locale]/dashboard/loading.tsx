export default function DashboardLoading() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        {/* 主加载动画 */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        
        {/* 骨架屏内容 */}
        <div className="space-y-3 max-w-sm mx-auto">
          <div className="h-8 bg-gray-200 rounded-lg animate-pulse w-48 mx-auto"></div>
          <div className="h-4 bg-gray-100 rounded animate-pulse w-64 mx-auto"></div>
        </div>
        
        {/* 加载提示 */}
        <p className="text-gray-500 mt-6 animate-pulse">
          Loading your dashboard...
        </p>
      </div>
    </div>
  );
}
