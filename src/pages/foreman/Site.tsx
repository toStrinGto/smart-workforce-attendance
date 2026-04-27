/**
 * Site.tsx
 * 工头 (Foreman) 角色的现场管理页面。
 * 主要用于查看现场工人的实时打卡照片和位置信息，确保工人按时在指定地点出勤。
 */
import { Camera, MapPin, Loader2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useForemanSite } from '@/hooks/useForeman';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ForemanSite() {
  usePageTitle('今日现场');
  const { status, loading } = useForemanSite();

  if (loading || !status) {
    return (
      <div className="flex flex-col min-h-full bg-gray-50 pb-4 md:pb-0">
        <div className="bg-gradient-to-b from-orange-500 to-orange-400 pt-12 pb-16 px-4 rounded-b-3xl shadow-md md:pt-6 md:rounded-none">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-6 w-32 mx-auto mb-6 bg-white/20" />
            <Skeleton className="h-4 w-48 mx-auto mb-4 bg-white/20" />
            <div className="flex justify-around items-center px-4">
              <Skeleton className="h-12 w-16 bg-white/20" />
              <div className="w-px h-8 bg-white/20"></div>
              <Skeleton className="h-12 w-16 bg-white/20" />
              <div className="w-px h-8 bg-white/20"></div>
              <Skeleton className="h-12 w-16 bg-white/20" />
            </div>
          </div>
        </div>
        <div className="px-4 -mt-6 relative z-10 max-w-4xl mx-auto w-full md:mt-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50 pb-4 md:pb-0">
      {/* Header */}
      <div className="bg-gradient-to-b from-orange-500 to-orange-400 pt-12 pb-16 px-4 rounded-b-3xl shadow-md text-white relative md:pt-6 md:rounded-none">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-bold text-center mb-6 md:text-2xl md:text-left">今日现场</h1>
          
          <div className="flex items-center justify-center mb-4 md:justify-start">
            <MapPin className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium md:text-base">{status.projectName}</span>
          </div>

          <div className="flex justify-around items-center px-4 md:justify-start md:space-x-12 md:px-0 mt-8">
            <div className="text-center md:text-left">
              <div className="text-3xl font-bold font-mono md:text-4xl">{status.totalWorkers}</div>
              <div className="text-xs text-white/80 mt-1 md:text-sm">班组总人数</div>
            </div>
            <div className="w-px h-8 bg-white/20 md:hidden"></div>
            <div className="text-center md:text-left">
              <div className="text-3xl font-bold font-mono md:text-4xl">{status.checkedIn}</div>
              <div className="text-xs text-white/80 mt-1 md:text-sm">今日已打卡</div>
            </div>
            <div className="w-px h-8 bg-white/20 md:hidden"></div>
            <div className="text-center md:text-left">
              <div className="text-3xl font-bold font-mono text-red-200 md:text-4xl">{status.missing}</div>
              <div className="text-xs text-white/80 mt-1 md:text-sm">未打卡</div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Stream */}
      <div className="px-4 -mt-6 relative z-10 max-w-4xl mx-auto w-full md:mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm md:text-base">
              <Camera className="w-4 h-4 mr-1.5 text-orange-500 md:w-5 md:h-5" />
              实时打卡照片
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {status.photos.map(photo => (
                <div key={photo.id} className="relative rounded-xl overflow-hidden border border-gray-100 shadow-sm group hover:shadow-md transition-shadow">
                  <img 
                    src={photo.pic} 
                    alt={photo.name} 
                    className="w-full h-32 md:h-48 object-cover transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 md:p-3 md:pt-8">
                    <div className="text-white text-xs font-bold md:text-sm">{photo.name}</div>
                    <div className="text-white/80 text-[10px] md:text-xs">{photo.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
