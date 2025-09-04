import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function UsersSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-24 self-start sm:self-auto" />
      </div>

      {/* Filters Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-72 hidden sm:block" />
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Sort Options */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="flex gap-2 w-full sm:w-auto">
                <Skeleton className="h-10 flex-1 sm:w-48" />
                <Skeleton className="h-10 w-12 shrink-0" />
              </div>
            </div>

            {/* Events Section */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-24" />
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-5 flex-1" />
                  </div>
                ))}
              </div>
            </div>

            {/* Food Section */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-36" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-5 flex-1" />
                  </div>
                ))}
              </div>
            </div>

            {/* Allergens Section */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-28" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-5 flex-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Cards Skeleton */}
      <div className="space-y-4 sm:space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-4">
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-7 w-56 mb-2" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
